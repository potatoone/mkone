import { debounce, getElement, showError } from '../utils/utils';

/**
 * Markdown 内容搜索管理器
 * 负责处理文档内搜索、高亮匹配结果及状态保存
 */
export class MarkdownSearch {
  private searchArea: HTMLElement;
  private searchInput: HTMLInputElement;
  private searchCloseBtn: HTMLButtonElement;
  private resultInfo: HTMLElement;
  private markdownContainer: HTMLElement;
  private currentHighlights: HTMLElement[] = [];

  constructor() {
    // 确保元素获取正确
    this.markdownContainer = getElement('#markdown-container', HTMLElement)!;
    this.searchArea = getElement('#search-area', HTMLElement)!;
    this.searchInput = getElement('#searchInput', HTMLInputElement)!;
    this.searchCloseBtn = getElement('#searchCloseBtn', HTMLButtonElement)!;
    this.resultInfo = getElement('#searchResultInfo', HTMLElement)!;
  
    // 读取本地存储的搜索状态（包含 isVisible）
    const savedState = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (savedState) {
      const { query, isVisible } = JSON.parse(savedState) as SearchState;
      // 恢复输入框内容
      this.searchInput.value = query;
      // 恢复搜索区域显示状态
      if (isVisible) {
        this.searchArea.classList.add('show');
      } else {
        this.searchArea.classList.remove('show');
      }
      // 恢复关闭按钮状态（若有内容则显示）
      if (query) {
        this.searchCloseBtn.classList.remove('hidden');
        this.performSearch(query);
      }
    } else {
      // 无存储时默认隐藏
      this.searchArea.classList.remove('show');
    }

    this.init();
  }

  private init(): void {
    this.bindEvents();
    this.observeSearchAreaVisibility();
    this.searchArea.addEventListener('click', (e) => e.stopPropagation());
  }

  private observeSearchAreaVisibility(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
          const isVisible = this.searchArea.classList.contains('show');
          if (isVisible) {
            this.searchInput.focus();
          }
        }
      });
    });
  
    observer.observe(this.searchArea, { attributes: true, attributeFilter: ['class'] });
  }

  private bindEvents(): void {
    const debouncedSearch = debounce((query: string) => {
      this.performSearch(query);
    }, 300);
  
    // 初始化隐藏关闭按钮
    this.searchCloseBtn.classList.add('hidden');
  
    this.searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.trim();
      
      // 保存搜索内容和显示状态（始终更新，不删除）
      const currentState: SearchState = {
        query,
        isVisible: this.searchArea.classList.contains('show') // 保留当前显示状态
      };
      localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(currentState));
  
      if (query) {
        debouncedSearch(query);
        this.searchCloseBtn.classList.remove('hidden');
      } else {
        this.clearSearch();
        this.searchCloseBtn.classList.add('hidden');
      }
    });
  
    // 关闭按钮仅清空内容，不隐藏搜索区域
    this.searchCloseBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearch(); // 清除高亮和结果信息
      this.searchCloseBtn.classList.add('hidden'); // 隐藏关闭按钮（因内容为空）
    });
  
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide(); // ESC 键仍保留隐藏功能
      }
    });
  }

  private performSearch(query: string): void {
    if (!this.markdownContainer) {
      showError('找不到内容容器');
      return;
    }

    this.clearHighlights();

    if (!query.trim()) {
      this.resultInfo.textContent = '';
      return;
    }

    try {
      const searchRegex = new RegExp(query, 'gi');
      const textContent = this.markdownContainer.textContent || '';
      const matches = textContent.match(searchRegex);
  
      if (!matches || matches.length === 0) {
        this.resultInfo.textContent = '未找到结果';
        return;
      }
  
      this.highlightMatches(query);
      this.resultInfo.textContent = `找到 ${matches.length} 个结果`;
  
    } catch (error) {
      console.error('搜索失败:', error);
      showError('搜索语法错误');
    }
  }

  private highlightMatches(query: string): void {
    const walker = document.createTreeWalker(
      this.markdownContainer,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node: Node | null;
    
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const regex = new RegExp(`(${query})`, 'gi');
      
      if (regex.test(text)) {
        const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
        const span = document.createElement('span');
        span.innerHTML = highlightedText;
        textNode.parentNode?.replaceChild(span, textNode);
        
        const highlights = span.querySelectorAll('mark.search-highlight');
        highlights.forEach(highlight => {
          this.currentHighlights.push(highlight as HTMLElement);
        });
      }
    });
  }

  private clearHighlights(): void {
    this.currentHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize();
      }
    });
    this.currentHighlights = [];
  }

  private clearSearch(): void {
    this.clearHighlights();
    this.resultInfo.innerHTML = '';
    this.searchCloseBtn.classList.add('hidden');
  }

  // 手动控制显示
  public show(): void {
    this.searchArea.classList.add('show');
    this.searchInput.focus();
    // 保存显示状态到本地存储
    const currentState: SearchState = {
      query: this.searchInput.value.trim(),
      isVisible: true
    };
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(currentState));
  }
  
  public hide(): void {
    this.searchArea.classList.remove('show');
    this.clearSearch();
    // 保存隐藏状态到本地存储
    const currentState: SearchState = {
      query: this.searchInput.value.trim(),
      isVisible: false
    };
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(currentState));
  }

  public toggle(): void {
    if (this.searchArea.classList.contains('show')) {
      this.hide();
    } else {
      this.show();
    }
  }

  public focus(): void {
    this.show();
  }

  public getQuery(): string {
    return this.searchInput.value.trim();
  }
}

/**
 * 初始化 Markdown 搜索功能
 */
export function setupSearch(): MarkdownSearch {
  return new MarkdownSearch();
}

// 存储键定义
const SEARCH_STORAGE_KEY = 'mkone_search_state';

// 搜索状态接口
interface SearchState {
  query: string;
  isVisible: boolean;
}