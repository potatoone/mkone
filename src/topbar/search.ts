import { debounce, getElement, showError } from '../utils/utils';

// 存储键常量
const SEARCH_STORAGE_KEY = 'mkone_search_state';
// 补充缺失的接口定义（避免JSON序列化时报错）
interface SearchState {
  query: string;
  isVisible: boolean;
}

export class MarkdownSearch {
  private searchArea!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private searchCloseBtn!: HTMLButtonElement;
  private resultInfo!: HTMLElement;
  private markdownContainer!: HTMLElement;
  private currentHighlights: HTMLElement[] = [];

  constructor() {
    // 初始化DOM元素（兼容元素不存在的情况）
    this.markdownContainer = getElement('#markdown-container', HTMLElement) || document.createElement('div');
    this.searchArea = getElement('#search-area', HTMLElement) || document.createElement('div');
    this.searchInput = getElement('#searchInput', HTMLInputElement) || document.createElement('input');
    this.searchCloseBtn = getElement('#searchCloseBtn', HTMLButtonElement) || document.createElement('button');
    this.resultInfo = getElement('#searchResultInfo', HTMLElement) || document.createElement('div');
    this.init();
  }

  private init(): void {
    this.searchCloseBtn.classList.add('hidden');
    this.observeSearchAreaVisibility();
    this.bindEvents();
    this.searchArea.addEventListener('click', e => e.stopPropagation());
  }

  private observeSearchAreaVisibility(): void {
    new MutationObserver(([{ attributeName }]) => {
      if (attributeName === 'class' && this.searchArea.classList.contains('show')) {
        this.searchInput.focus();
      }
    }).observe(this.searchArea, { attributes: true, attributeFilter: ['class'] });
  }

  private bindEvents(): void {
    const debouncedSearch = debounce((q: string) => this.performSearch(q), 300);
    
    this.searchInput.addEventListener('input', e => {
      const q = (e.target as HTMLInputElement).value.trim();
      this.saveSearchState(q);
      if (q) {
        debouncedSearch(q);
        this.searchCloseBtn.classList.remove('hidden');
      } else {
        this.clearSearch();
        this.searchCloseBtn.classList.add('hidden');
      }
    });

    this.searchCloseBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearch();
      this.searchCloseBtn.classList.add('hidden');
    });

    this.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.hide();
    });
  }

  private performSearch(q: string): void {
    // 防御性检查：容器不存在直接返回
    if (!this.markdownContainer || this.markdownContainer.tagName === 'DIV' && !this.markdownContainer.id) {
      showError('找不到内容容器');
      return;
    }

    // 清空之前的高亮
    this.clearHighlights();
    
    // 空查询直接清空结果提示
    if (!q.trim()) {
      this.resultInfo.textContent = '';
      return;
    }

    try {
      // 构建正则（处理特殊字符，避免正则语法错误）
      const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeQuery, 'gi');
      const textContent = this.markdownContainer.textContent || '';
      const matches = textContent.match(regex);

      // 无匹配结果
      if (!matches || matches.length === 0) {
        this.resultInfo.textContent = '未找到结果';
        return; // 提前终止，避免执行后续高亮逻辑
      }

      // 有匹配结果：高亮+更新提示
      this.highlightMatches(q);
      this.resultInfo.textContent = `找到 ${matches.length} 个结果`;
    } catch (err) {
      console.error('搜索失败:', err);
      showError('搜索语法错误');
    }
  }

  private highlightMatches(q: string): void {
    const walker = document.createTreeWalker(this.markdownContainer, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null;
    
    // 收集所有文本节点
    while (n = walker.nextNode()) {
      nodes.push(n as Text);
    }

    // 高亮匹配的文本
    nodes.forEach(node => {
      const txt = node.textContent || '';
      const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`(${safeQuery})`, 'gi');
      
      if (reg.test(txt)) {
        const span = document.createElement('span');
        span.innerHTML = txt.replace(reg, '<mark class="search-highlight">$1</mark>');
        node.parentNode?.replaceChild(span, node);
        
        // 收集高亮元素，方便后续清除
        span.querySelectorAll('mark.search-highlight').forEach(hl => {
          this.currentHighlights.push(hl as HTMLElement);
        });
      }
    });
  }

  private clearHighlights(): void {
    this.currentHighlights.forEach(hl => {
      const parent = hl.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(hl.textContent || ''), hl);
        parent.normalize(); // 合并相邻文本节点
      }
    });
    this.currentHighlights = [];
  }

  private clearSearch(): void {
    this.clearHighlights();
    this.resultInfo.textContent = '';
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
    this.searchInput.focus();
    this.saveSearchState();
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