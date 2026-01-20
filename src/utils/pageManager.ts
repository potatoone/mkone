import { renderMarkdown } from '../markdown/markdown';
import { showError } from './utils';
import { initPageNavigation } from './pageNav';
import { showPageNavigation } from './pageNav';
import { cleanTitle } from './docsParser';


cleanTitle // 生成用于显示的干净标题

export class PageManager {
  private pages: string[] = [];  // 页面路径列表
  private currentIndex: number = 0;  // 当前页面索引

  // 设置页面列表
  public setPages(pages: string[]): void {
    this.pages = pages;
  }

  // 移除所有导航项的 active 类
  private removeAllActiveClasses(): void {
    document.querySelectorAll('.nav-file.active').forEach(el => {
      el.classList.remove('active');
    });
  }

  // 加载指定页面
  public async loadPage(fileName: string): Promise<void> {
    const index = this.pages.indexOf(fileName);
    if (index === -1) throw new Error(`页面不存在: ${fileName}`);

    try {
      this.currentIndex = index;

      // 渲染 Markdown 并初始化页内导航
      const headings = await renderMarkdown(fileName);
      await initPageNavigation(fileName);

      // 设置文档标题
      const mainTitle = headings.find(h => h.level === 1)?.text || cleanTitle(fileName);
      document.title = `${mainTitle} - Mkone`;

      // 更新浏览器历史记录和本地存储
      this.updateHistory(fileName, index);
      localStorage.setItem('mkoneCurrentPage', fileName);

      // 更新侧边栏高亮状态
      this.updateSidebarHighlight(fileName);

      // 显示页内导航
      showPageNavigation(); 

    } catch (error) {
      showError(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }

  // 更新侧边栏高亮状态
  private updateSidebarHighlight(fileName: string) {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    const targetEl = navContainer.querySelector(`.nav-file[data-file="${fileName}"]`) as HTMLElement;
    if (targetEl) {
      this.removeAllActiveClasses(); // 清除其他文件的高亮
      targetEl.classList.add('active'); // 高亮当前文件
    }
  }

  // 更新侧边栏竖线位置
  private updateVerticalLinePosition(fileName: string) {
    const navContainer = document.querySelector('.nav-container');
    const verticalLine = document.querySelector('.sidebar-vertical-line') as HTMLElement;
    if (!navContainer || !verticalLine) return;

    const targetEl = navContainer.querySelector(`.nav-file[data-file="${fileName}"]`) as HTMLElement;
    if (targetEl) {
      // 获取当前文件的最终可见位置
      const visibleTarget = this.findVisibleTarget(targetEl);
      const rect = visibleTarget.getBoundingClientRect();
      const containerRect = navContainer.getBoundingClientRect();
      const top = rect.top - containerRect.top + (rect.height - 20) / 2;
      verticalLine.style.top = `${top}px`;
      verticalLine.style.display = 'block';
    } else {
      verticalLine.style.display = 'none'; // 隐藏竖线
    }
  }

  // 根据目录展开状态找到最终可见元素
  private findVisibleTarget(activeEl: HTMLElement): HTMLElement {
    // 检查根目录是否折叠
    const rootDir = activeEl.closest('details.root-dir') as HTMLDetailsElement | null;
    if (rootDir && !rootDir.open) {
      const rootHeader = rootDir.querySelector('summary.root-header') as HTMLElement;
      if (rootHeader) return rootHeader;
    }

    // 检查组目录是否折叠
    const groupDir = activeEl.closest('details.group-dir') as HTMLDetailsElement | null;
    if (groupDir && !groupDir.open) {
      const groupHeader = groupDir.querySelector('summary.group-header') as HTMLElement;
      if (groupHeader) return groupHeader;
    }

    // 直接定位到文件本身
    return activeEl;
  }

  // 更新浏览器历史记录
  private updateHistory(fileName: string, index: number): void {
    if (window.history?.pushState) {
      window.history.pushState({ index, fileName }, cleanTitle(fileName), `#${fileName}`);
    }
  }

  // 根据偏移量加载页面
  public async loadPageByOffset(offset: number, errorMsg: string): Promise<void> {
    const newIndex = this.currentIndex + offset;
    if (newIndex >= 0 && newIndex < this.pages.length) {
      const fileName = this.pages[newIndex];
      await this.loadPage(fileName);

      // 更新高亮和竖线
      this.updateSidebarHighlight(fileName);
      this.updateVerticalLinePosition(fileName);
    } else {
      showError(errorMsg);
    }
  }

  // 处理内部链接点击事件
  public setupInternalLinkHandling(): void {
    document.addEventListener('click', async (e) => {
      if (!(e.target instanceof Element)) return;

      const link = e.target.closest<HTMLAnchorElement>('.internal-link');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      const [file, anchor] = href.split('#');
      e.preventDefault();

      await this.loadPage(file);

      // 更新高亮和竖线
      this.updateSidebarHighlight(file);
      this.updateVerticalLinePosition(file);

      // 跳转锚点
      if (anchor) {
        setTimeout(() => {
          const targetEl = document.getElementById(anchor);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    });
  }

  // 加载上一页
  public loadPrevPage(): void {
    this.loadPageByOffset(-1, '已经是第一页');
  }

  // 加载下一页
  public loadNextPage(): void {
    this.loadPageByOffset(1, '已经是最后一页');
  }

  // 获取当前页面
  public getCurrentPage(): string {
    return this.pages[this.currentIndex] || '';
  }

  // 获取页面总数
  public getPageCount(): number {
    return this.pages.length;
  }

  // 重新加载当前页面
  public async reloadCurrentPage(): Promise<void> {
    const currentPage = this.getCurrentPage();
    if (currentPage) await this.loadPage(currentPage);
    else showError('没有可重新加载的页面');
  }

  // 获取上一页标题
  public getPrevPageTitle(): string {
    return this.currentIndex > 0 ? cleanTitle(this.pages[this.currentIndex - 1]) : '没有上一页';
  }

  // 获取下一页标题
  public getNextPageTitle(): string {
    return this.currentIndex < this.pages.length - 1 ? cleanTitle(this.pages[this.currentIndex + 1]) : '没有下一页';
  }

  // 更新按钮标题
  public updateButtonTitles(backBtn: HTMLButtonElement, forwardBtn: HTMLButtonElement): void {
    backBtn.dataset.tooltip = `上一页: ${this.getPrevPageTitle()}`;
    forwardBtn.dataset.tooltip = `下一页: ${this.getNextPageTitle()}`;
  }

  // 获取当前页面的文件名（不包含路径和扩展名）
  public getCurrentCleanedFileName(): string {
    const currentPage = this.getCurrentPage();
    const fileNameWithExt = currentPage.split('/').pop() || currentPage;
    return fileNameWithExt.replace(/^\d+-/, '').replace(/\.md$/, '');
  }

  // 新增方法，获取所有页面路径
  public getAllPages(): string[] {
    return this.pages;
  }
}