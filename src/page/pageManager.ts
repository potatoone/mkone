import { renderMarkdown } from '../markdown/markdown';
import { showError, storage, STORAGE_KEYS } from '../utils/utils';

import { initPageNavigation, showPageNavigation } from './pageNav';
import { setOutlineDir } from './outlineState'; // Outline 打开状态
import { cleanTitle } from '../utils/docsParser';
import { expandHeadingChain } from '../markdown/extentions/foldableHeadings'; // 标题折叠
import {
  restoreScrollPosition,
  saveCurrentScroll,
  scrollToTopInstant,
  setCurrentFile
} from './pageScrollState'; // 阅读进度持久化

/** loadPage 的可选行为 */
interface LoadPageOptions {
  /** 需要跳转到锚点时不恢复阅读进度（由调用方负责滚动） */
  skipRestore?: boolean;
}

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

  /**
   * 把链接 href 解析为实际页面路径
   * 依次尝试：去 docs/ 前缀 → 相对当前文档目录 → 相对 docs 根
   * @returns 命中的页面路径；不存在时返回 null
   */
  public resolvePage(rawHref: string): string | null {
    if (!rawHref) return null;

    const normalized = decodeURIComponent(rawHref.split('#')[0])
      .replace(/\\/g, '/')
      .replace(/^\.?\//, '');

    const current = this.pages[this.currentIndex] ?? '';
    const currentDir = current.includes('/') ? current.slice(0, current.lastIndexOf('/') + 1) : '';
    const withoutDocs = normalized.replace(/^docs\//, '');

    const candidates = [
      normalized,
      withoutDocs,
      currentDir && `${currentDir}${normalized}`,
      currentDir && `${currentDir}${withoutDocs}`
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (this.pages.includes(candidate)) return candidate;
    }
    return null;
  }

  // 加载指定页面（统一编排：渲染 → 页内导航 → 标题/历史/侧边栏状态）
  public async loadPage(fileNameOrHref: string, options: LoadPageOptions = {}): Promise<boolean> {
    // 兼容传入完整 href（如 ./docs/xx/yy.md）的情况
    const resolved = this.resolvePage(fileNameOrHref);
    const fileName = resolved ?? fileNameOrHref;

    const index = this.pages.indexOf(fileName);
    if (index === -1) {
      // 目标文档不存在（例如源文件已被删除/重命名）：提示但不破坏当前页面
      console.warn('页面不存在:', fileNameOrHref);
      showError('目标文档不存在（可能已被删除或重命名）');
      return false;
    }

    const prevIndex = this.currentIndex;

    // 替换正文之前先记录上一篇的阅读位置
    saveCurrentScroll();

    try {
      this.currentIndex = index;

      // 渲染 Markdown 并用同一份结果初始化页内导航（避免重复渲染）
      const renderResult = await renderMarkdown(fileName);
      await initPageNavigation(renderResult);

      // 设置文档标题
      const mainTitle = renderResult.headings.find(h => h.level === 1)?.text || cleanTitle(fileName);
      document.title = `${mainTitle} - Mkone`;

      // 更新浏览器历史记录和本地存储
      this.updateHistory(fileName, index);
      storage.set(STORAGE_KEYS.currentPage, fileName);
      setOutlineDir(null); // 已切换到文档：清除「停留在 Outline」标记

      // 更新侧边栏高亮与竖线状态
      this.updateSidebarHighlight(fileName);
      this.updateVerticalLinePosition(fileName);

      // 显示页内导航
      showPageNavigation();

      // 标记当前文档，并恢复上次的阅读进度（锚点跳转时由调用方接管滚动）
      setCurrentFile(fileName);
      if (!options.skipRestore) {
        scrollToTopInstant();
        restoreScrollPosition(fileName);
      }

      return true;

    } catch (error) {
      // 渲染失败时回滚页码，避免上一篇/下一篇错位
      this.currentIndex = prevIndex;
      showError(`加载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      return false;
    }
  }

  // 更新侧边栏高亮状态
  private updateSidebarHighlight(fileName: string) {
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    // CSS.escape 防止文件名中的特殊字符破坏选择器
    const targetEl = navContainer.querySelector(`.nav-file[data-file="${CSS.escape(fileName)}"]`) as HTMLElement;
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

    const targetEl = navContainer.querySelector(`.nav-file[data-file="${CSS.escape(fileName)}"]`) as HTMLElement;
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
      await this.loadPage(this.pages[newIndex]);
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

      const [, anchor] = href.split('#');
      e.preventDefault();

      // 先解析目标文档：不存在则提示，避免带着无效路径进入渲染流程
      if (!this.resolvePage(href)) {
        console.warn('文档链接无效:', href);
        showError('目标文档不存在（可能已被删除或重命名）');
        link.classList.add('link-broken');
        return;
      }

      const ok = await this.loadPage(href, { skipRestore: Boolean(anchor) });

      // 跳转锚点（侧边栏高亮/竖线已由 loadPage 统一更新）
      if (ok && anchor) {
        setTimeout(() => {
          const targetEl = document.getElementById(anchor);
          if (targetEl) {
            expandHeadingChain(anchor); // 展开目标锚点所在的所有折叠区块
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    });

    // 正文页内锚点链接（#section）：展开折叠区块并平滑滚动
    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;

      const link = e.target.closest<HTMLAnchorElement>('.anchor-link');
      if (!link) return;

      const anchor = link.getAttribute('href')?.slice(1);
      if (!anchor) return;

      e.preventDefault();
      const targetEl = document.getElementById(anchor);
      if (targetEl) {
        expandHeadingChain(anchor); // 展开目标锚点所在的所有折叠区块
        targetEl.scrollIntoView({ behavior: 'smooth' });
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
    return fileNameWithExt.replace(/^\d+_/, '').replace(/\.md$/, '');
  }

  // 新增方法，获取所有页面路径
  public getAllPages(): string[] {
    return this.pages;
  }
}