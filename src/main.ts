import { getDOMElements, showError, showSuccess, storage, STORAGE_KEYS } from './utils/utils';
import type { DOMElements } from './utils/types';
import { PageManager } from './page/pageManager';
import { initSidebar } from './sidebar/sidebar';
import { initTopbar } from './topbar/topbar';
import { initResizeHandles } from './utils/resize';

class MkoneApp {
  private pageManager: PageManager;
  private elements: DOMElements | null = null;
  private pages: string[] = [];

  constructor() {
    this.pageManager = new PageManager();
    this.pageManager.setupInternalLinkHandling(); //内部链接处理
    initResizeHandles(); // 左右侧栏宽度拖拽调整（含宽度恢复）
    this.init();
    this.handlePopState = this.handlePopState.bind(this);
    window.addEventListener('popstate', this.handlePopState);
  }

  private async init(): Promise<void> {
    try {
      await this.waitForDOM();
      this.elements = getDOMElements() as DOMElements;
      if (!this.elements) throw new Error('无法获取必需的DOM元素');

      await this.initSidebar();
      this.initTopbar();
      await this.loadInitialPage();

      showSuccess('Done');
    } catch (error) {
      console.error('应用初始化失败:', error);
      showError('应用初始化失败，请刷新页面重试');
    }
  }

  private async waitForDOM(): Promise<void> {
    return new Promise(resolve => {
      // interactive：DOM 已解析完成（module 脚本常见状态），可直接继续
      if (document.readyState !== 'loading') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', () => resolve());
      }
    });
  }

  private async initSidebar(): Promise<void> {
    // loadPage 内部已统一完成渲染、页内导航与状态更新
    const allPages = await initSidebar(fileName => {
      this.pageManager.loadPage(fileName).catch(err => {
        console.error('侧边栏点击加载失败:', err);
        showError(`加载页面失败: ${fileName}`);
      });
    });

    this.pages = allPages;
    this.pageManager.setPages(allPages);

    if (this.pages.length === 0) throw new Error('未检测到任何Markdown页面');
  }

  private initTopbar(): void {
    if (!this.elements) return;
      initTopbar(
        () => this.pageManager.loadPrevPage(), // 第1个参数：后退功能（对应backBtn）
        () => this.pageManager.loadNextPage(), // 第2个参数：前进功能（对应forwardBtn）
        () => null, // 第3个参数：搜索功能（对应searchBtn）
        this.pageManager // 传入实例，用于更新按钮提示
      );
  }

  private async loadInitialPage(): Promise<void> {
    const savedPage = storage.get<string>(STORAGE_KEYS.currentPage, '');
    const targetPage = savedPage && this.pages.includes(savedPage) ? savedPage : this.pages[0];
    await this.pageManager.loadPage(targetPage);
  }

  private handlePopState(event: PopStateEvent) {
    if (event.state?.fileName) {
      this.pageManager.loadPage(event.state.fileName).catch(err => {
        console.error('历史记录加载失败:', err);
        showError(`加载历史页面失败: ${event.state.fileName}`);
      });
    }
  }

}

// 启动应用
const app = new MkoneApp();
(window as any).mkoneApp = app;
