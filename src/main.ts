import { getDOMElements, showError, showSuccess } from './utils/utils';
import type { DOMElements } from './utils/types';
import { PageManager } from './page/pageManager';
import { initSidebar } from './sidebar/sidebar';
import { initTopbar } from './topbar/topbar';
import { initPageNavigation } from './page/pageNav';

const STORAGE_KEY = 'mkoneCurrentPage';

class MkoneApp {
  private pageManager: PageManager;
  private elements: DOMElements | null = null;
  private pages: string[] = [];

  constructor() {
    this.pageManager = new PageManager();
    this.pageManager.setupInternalLinkHandling(); //内部链接处理
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
      console.log('加载完成');
    } catch (error) {
      console.error('应用初始化失败:', error);
      showError('应用初始化失败，请刷新页面重试');
    }
  }

  private async waitForDOM(): Promise<void> {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        // 修复类型不匹配问题
        document.addEventListener('DOMContentLoaded', () => resolve());
      }
    });
  }

  private async initSidebar(): Promise<void> {
    const allPages = await initSidebar(fileName => {
      this.pageManager.loadPage(fileName).then(() => {
        // 确保在页面加载后调用 initPageNavigation
        initPageNavigation(fileName).catch(err => {
          console.error('页内导航初始化失败:', err);
        });
      }).catch(err => {
        console.error('侧边栏点击加载失败:', err);
        showError(`加载页面失败: ${fileName}`);
      });
    });

    this.pages = allPages;
    this.pageManager.setPages(allPages);
    console.log('所有页面列表:', this.pages);

    if (this.pages.length === 0) throw new Error('未检测到任何Markdown页面');
  }

  private initTopbar(): void {
    if (!this.elements) return;
      initTopbar(
        () => this.pageManager.loadPrevPage(), // 第1个参数：后退功能（对应backBtn）
        () => this.pageManager.loadNextPage(), // 第2个参数：前进功能（对应forwardBtn）
        () => console.log('执行搜索逻辑'), // 第3个参数：搜索功能（对应searchBtn）
        this.pageManager // 传入实例，用于更新按钮提示
      );
  }

  private async loadInitialPage(): Promise<void> {
    const savedPage = localStorage.getItem(STORAGE_KEY);
    const targetPage = savedPage && this.pages.includes(savedPage) ? savedPage : this.pages[0];
    await this.pageManager.loadPage(targetPage).then(() => {
      // 确保在初始页面加载后调用 initPageNavigation
      initPageNavigation(targetPage).catch(err => {
        console.error('页内导航初始化失败:', err);
      });
    });
  }

  private handlePopState(event: PopStateEvent) {
    if (event.state?.fileName) {
      localStorage.setItem(STORAGE_KEY, event.state.fileName);
      this.pageManager.loadPage(event.state.fileName).then(() => {
        // 确保在历史记录页面加载后调用 initPageNavigation
        initPageNavigation(event.state.fileName).catch(err => {
          console.error('页内导航初始化失败:', err);
        });
      }).catch(err => {
        console.error('历史记录加载失败:', err);
        showError(`加载历史页面失败: ${event.state.fileName}`);
      });
    }
  }

}

// 启动应用
const app = new MkoneApp();
(window as any).mkoneApp = app;