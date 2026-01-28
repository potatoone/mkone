import { PageManager } from './pageManager';

/**
 * 动态创建并插入 pageTitle 元素
 */
export const createAndInsertPageTitle = () => {
  const pageTitle = document.createElement('div');
  pageTitle.id = 'pageTitle';
  pageTitle.className = 'page-title';

  const leftContainer = document.querySelector('.topbar .left');
  if (leftContainer) {
    leftContainer.insertAdjacentElement('afterend', pageTitle);
  }
  return pageTitle;
};

/**
 * 更新页面标题
 * @param pageTitle 页面标题 DOM 元素
 * @param pageManager PageManager 实例
 */
export const updatePageTitle = (pageTitle: HTMLElement | null, pageManager: PageManager) => {
  if (pageTitle) {
    const fileName = pageManager.getCurrentCleanedFileName();
    pageTitle.textContent = fileName;
    pageTitle.style.display = 'block'; // 确保标题可见
  }
};

/**
 * 初始化页面标题更新逻辑
 * @param pageTitle 页面标题 DOM 元素
 * @param pageManager PageManager 实例
 */
export const initPageTitleUpdater = (pageTitle: HTMLElement | null, pageManager: PageManager) => {
  // 初始加载时更新标题
  updatePageTitle(pageTitle, pageManager);

  // 监听页面切换事件，更新标题
  const originalLoadPage = pageManager.loadPage;
  pageManager.loadPage = async function(fileName) {
    try {
      // 保留原始调用
      await originalLoadPage.call(this, fileName);
    } finally {
      // 延迟执行确保内容已渲染
      setTimeout(() => {
        updatePageTitle(pageTitle, pageManager);
      }, 50);
    }
  };
};

/**
 * 显示页面标题
 * @param pageTitle 页面标题 DOM 元素
 */
export const showPageTitle = (pageTitle: HTMLElement | null) => {
  if (pageTitle) {
    pageTitle.style.display = '';
  }
};

/**
 * 隐藏页面标题
 * @param pageTitle 页面标题 DOM 元素
 */
export const hidePageTitle = (pageTitle: HTMLElement | null) => {
  if (pageTitle) {
    pageTitle.style.display = 'none';
  }
};