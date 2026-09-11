import { debounce, getElement } from '../utils/utils';
import { parseFrontMatter } from '../markdown/overview/viewParser';
import { cleanTitle } from '../utils/docsParser';

// 存储键常量
const SEARCH_STORAGE_KEY = 'mkone_search_state';
// 搜索结果最大条数
const MAX_RESULTS = 30;
// 跳转事件名（main.ts 监听并执行页面加载）
const NAVIGATE_EVENT = 'mkone:navigate';
const NAVIGATED_EVENT = 'mkone:navigated';

interface SearchState {
  query: string;
  isVisible: boolean;
}

// 索引文档
interface SearchDoc {
  file: string;
  title: string;
  desc: string;
  content: string; // 纯文本正文（去 front matter / 代码块 / 标记符）
}

// 单条搜索结果
interface SearchResult {
  doc: SearchDoc;
  score: number;
  count: number;
  snippet: string;
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class MarkdownSearch {
  private searchArea!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private searchCloseBtn!: HTMLButtonElement;
  private resultsBox!: HTMLElement;
  private markdownContainer!: HTMLElement;
  private currentHighlights: HTMLElement[] = [];

  // 全局文档索引（首次打开搜索时懒加载构建）
  private docs: SearchDoc[] = [];
  private indexTask: Promise<void> | null = null;
  // 键盘导航的当前选中项
  private activeIndex = -1;
  // 最近一次搜索词（跳转文档后用于高亮定位）
  private lastQuery = '';

  constructor() {
    // 初始化DOM元素（兼容元素不存在的情况）
    this.markdownContainer = getElement('#markdown-container', HTMLElement) || document.createElement('div');
    this.searchArea = getElement('#search-area', HTMLElement) || document.createElement('div');
    this.searchInput = getElement('#searchInput', HTMLInputElement) || document.createElement('input');
    this.searchCloseBtn = getElement('#searchCloseBtn', HTMLButtonElement) || document.createElement('button');
    this.resultsBox = getElement('#searchResults', HTMLElement) || document.createElement('div');
    this.init();
  }

  private init(): void {
    this.searchCloseBtn.classList.add('hidden');
    this.observeSearchAreaVisibility();
    this.bindEvents();
    // 悬浮层模式下：点击遮罩空白处（对话框以外）关闭搜索
    this.searchArea.addEventListener('click', (e) => {
      if (e.target === this.searchArea) this.hide();
    });
    // 点击结果项跳转对应文档
    this.resultsBox.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('.search-result-item');
      if (item) this.openResult(item.dataset.file || '');
    });
    // 文档加载完成后，在当前文档中高亮搜索词
    document.addEventListener(NAVIGATED_EVENT, () => {
      if (this.lastQuery) this.highlightInDoc(this.lastQuery);
    });
  }

  private observeSearchAreaVisibility(): void {
    new MutationObserver(([{ attributeName }]) => {
      if (attributeName === 'class' && this.searchArea.classList.contains('show')) {
        this.searchInput.focus();
      }
    }).observe(this.searchArea, { attributes: true, attributeFilter: ['class'] });
  }

  private bindEvents(): void {
    const debouncedSearch = debounce((q: string) => this.performSearch(q), 200);

    this.searchInput.addEventListener('input', e => {
      const q = (e.target as HTMLInputElement).value.trim();
      this.saveSearchState(q);
      if (q) {
        this.searchCloseBtn.classList.remove('hidden');
        debouncedSearch(q);
      } else {
        this.searchCloseBtn.classList.add('hidden');
        this.clearSearch();
      }
    });

    this.searchCloseBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearch();
      this.searchCloseBtn.classList.add('hidden');
    });

    this.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.hide();
        return;
      }
      // ↑/↓ 选择结果，Enter 打开
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveActive(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const items = this.resultsBox.querySelectorAll<HTMLElement>('.search-result-item');
        if (!items.length) return;
        const idx = this.activeIndex >= 0 ? Math.min(this.activeIndex, items.length - 1) : 0;
        this.openResult(items[idx].dataset.file || '');
      }
    });
  }

  // ==================== 本地全局索引 ====================

  /**
   * 懒构建全站文档索引：抓取所有 Markdown，剥离 front matter 与代码块后
   * 保留纯文本正文。首次打开搜索时触发，之后复用。
   */
  private buildIndex(): Promise<void> {
    if (!this.indexTask) {
      const modules = import.meta.glob('/docs/**/*.md', { eager: false });
      const files = Object.keys(modules).map(p => p.replace(/^\/docs\//, ''));

      this.indexTask = Promise.all(
        files.map(async file => {
          try {
            const res = await fetch(`./docs/${file}`);
            if (!res.ok) return;
            const raw = await res.text();
            const { metadata, content } = parseFrontMatter(raw);

            // 标题：第一个一级标题，缺失时回退为清洗后的文件名
            const h1 = content.match(/^#\s+(.+)\r?$/m);
            const title = (h1 ? h1[1] : cleanTitle(file)).trim();

            // 纯文本正文：去掉代码块与 Markdown 标记符，压缩空白
            const plain = content
              .replace(/```[\s\S]*?```/g, ' ')
              .replace(/<[^>]*>/g, ' ')
              .replace(/[#>*`~[\]()!|]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            this.docs.push({
              file,
              title,
              desc: (metadata.desc || '').trim(),
              content: plain
            });
          } catch {
            // 单篇解析失败不阻塞整体索引
          }
        })
      ).then(() => {
        this.docs.sort((a, b) => a.file.localeCompare(b.file));
      });
    }
    return this.indexTask;
  }

  // ==================== 搜索与渲染 ====================

  private performSearch(q: string): void {
    this.clearHighlights();

    this.resultsBox.innerHTML = `<div class="search-result-info">正在搜索…</div>`;

    this.buildIndex()
      .then(() => this.searchDocs(q))
      .then(results => {
        // 搜索期间输入词可能已变化，过期结果直接丢弃
        if (this.searchInput.value.trim() !== q) return;
        this.renderResults(q, results);
      })
      .catch(err => {
        console.error('全局搜索失败:', err);
        this.resultsBox.innerHTML = `<div class="search-result-info">搜索失败，请重试</div>`;
      });
  }

  /**
   * 全局匹配：标题命中 > 描述命中 > 正文命中次数
   */
  private searchDocs(q: string): SearchResult[] {
    const ql = q.toLowerCase();
    const results: SearchResult[] = [];

    for (const doc of this.docs) {
      const titleHit = doc.title.toLowerCase().includes(ql);
      const descHit = doc.desc.toLowerCase().includes(ql);

      const lower = doc.content.toLowerCase();
      let count = 0;
      let first = lower.indexOf(ql);
      if (first !== -1) {
        count = 1;
        let idx = lower.indexOf(ql, first + ql.length);
        while (idx !== -1 && count < 99) {
          count++;
          idx = lower.indexOf(ql, idx + ql.length);
        }
      }

      if (!titleHit && !descHit && count === 0) continue;

      const score = (titleHit ? 100 : 0) + (descHit ? 20 : 0) + Math.min(count, 10);
      results.push({ doc, score, count, snippet: this.buildSnippet(doc, first, ql) });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, MAX_RESULTS);
  }

  /**
   * 截取命中位置附近的上下文片段，并高亮关键词
   */
  private buildSnippet(doc: SearchDoc, first: number, q: string): string {
    const ql = q.toLowerCase();
    let raw: string;

    if (first !== -1) {
      const start = Math.max(0, first - 25);
      raw = doc.content.slice(start, first + q.length + 45);
      if (start > 0) raw = '…' + raw;
      if (first + q.length + 45 < doc.content.length) raw += '…';
    } else if (doc.desc) {
      raw = doc.desc.slice(0, 90);
    } else {
      raw = doc.content.slice(0, 90);
    }

    return escapeHtml(raw).replace(
      new RegExp(escapeRegExp(q), 'gi'),
      m => `<mark class="search-highlight">${m}</mark>`
    );
  }

  private renderResults(q: string, results: SearchResult[]): void {
    this.activeIndex = -1;

    if (!results.length) {
      this.resultsBox.innerHTML = `<div class="search-result-info">未找到与「${escapeHtml(q)}」相关的文档</div>`;
      return;
    }

    const items = results
      .map(
        r => `
      <div class="search-result-item" data-file="${escapeHtml(r.doc.file)}">
        <div class="search-result-title">
          <span class="search-result-name">${escapeHtml(r.doc.title)}</span>
          <span class="search-result-count">${r.count} 处</span>
        </div>
        <div class="search-result-snippet">${r.snippet}</div>
      </div>`
      )
      .join('');

    this.resultsBox.innerHTML =
      `<div class="search-result-info">共 ${results.length} 篇文档匹配「${escapeHtml(q)}」</div>` + items;
  }

  // ==================== 结果选择与跳转 ====================

  private moveActive(step: number): void {
    const items = this.resultsBox.querySelectorAll<HTMLElement>('.search-result-item');
    if (!items.length) return;

    this.activeIndex =
      this.activeIndex + step >= items.length
        ? 0
        : this.activeIndex + step < 0
          ? items.length - 1
          : this.activeIndex + step;

    items.forEach((el, i) => el.classList.toggle('active', i === this.activeIndex));
    items[this.activeIndex].scrollIntoView({ block: 'nearest' });
  }

  /**
   * 打开选中的文档：广播跳转事件（main.ts 执行加载），
   * 加载完成后在当前文档中高亮搜索词
   */
  private openResult(file: string): void {
    if (!file) return;
    this.lastQuery = this.searchInput.value.trim();
    document.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { file } }));
    this.hide();
  }

  // ==================== 当前文档高亮 ====================

  private highlightInDoc(q: string): void {
    this.clearHighlights();

    const walker = document.createTreeWalker(this.markdownContainer, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);

    const reg = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    nodes.forEach(node => {
      const txt = node.textContent || '';
      if (!reg.test(txt)) return;
      reg.lastIndex = 0;

      const span = document.createElement('span');
      span.innerHTML = txt.replace(reg, '<mark class="search-highlight">$1</mark>');
      node.parentNode?.replaceChild(span, node);
      span.querySelectorAll('mark.search-highlight').forEach(hl => {
        this.currentHighlights.push(hl as HTMLElement);
      });
    });
  }

  private clearHighlights(): void {
    this.currentHighlights.forEach(hl => {
      const parent = hl.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(hl.textContent || ''), hl);
        parent.normalize();
      }
    });
    this.currentHighlights = [];
  }

  private clearSearch(): void {
    this.clearHighlights();
    this.resultsBox.innerHTML = '';
    this.activeIndex = -1;
  }

  private saveSearchState(q?: string): void {
    try {
      const state: SearchState = {
        query: q || this.searchInput.value.trim(),
        isVisible: this.searchArea.classList.contains('show')
      };
      localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('保存搜索状态失败:', err);
    }
  }

  public show(): void {
    this.searchArea.classList.add('show');
    // 等待 visibility 过渡生效后再聚焦，同步 focus 会被随后的渲染吞掉
    requestAnimationFrame(() => this.searchInput.focus());
    this.saveSearchState();
    // 首次打开时后台构建索引
    this.buildIndex().then(() => {
      if (!this.searchInput.value.trim() && this.searchArea.classList.contains('show')) {
        this.resultsBox.innerHTML =
          `<div class="search-result-info">已索引 ${this.docs.length} 篇文档，输入关键词搜索</div>`;
      }
    });
  }

  public hide(): void {
    this.searchArea.classList.remove('show');
    this.clearSearch();
    this.saveSearchState();
  }

  public toggle(): void {
    this.searchArea.classList.contains('show') ? this.hide() : this.show();
  }

  public focus(): void {
    this.show();
  }

  public getQuery(): string {
    return this.searchInput.value.trim();
  }
}

// 初始化函数（确保全局可调用）
export const setupSearch = (): MarkdownSearch => {
  return new MarkdownSearch();
};
