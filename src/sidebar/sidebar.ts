/**
 * 侧边栏整合入口（sidebar.ts）- 优化版
 */
import { buildNavTree, getAllPages, getNavTree } from '../core/navTree';
import { navRender } from './navRender';
import { initSidebarLinks } from './links';
import type { NavRoot } from './navTypes';
import { renderOverView } from '../markdown/overview/overview';
import { hidePageNavigation } from '../page/pageNav';

// ------------------------------ 状态管理 ------------------------------
// 封装侧边栏状态（避免全局变量污染）
interface SidebarState {
  isExpanded: boolean; // 是否展开
}

const sidebarState: SidebarState = {
  isExpanded: true // 默认展开
};

// 检测是否为移动端
function isMobile(): boolean {
  return window.matchMedia('(max-width: 768px)').matches;
}

// ------------------------------ 辅助函数 ------------------------------
/**
 * 更新侧边栏展开/收起状态（仅通过类名控制样式）
 */
function updateSidebarState(sidebar: HTMLElement, expanded: boolean) {
  sidebar.classList.toggle('expanded', expanded);
  sidebar.classList.toggle('collapsed', !expanded);
}

/**
 * 初始化侧边栏切换按钮
 */
function initSidebarToggle() {
  const toggleBtn = document.getElementById('sidebar-toggle') as HTMLElement | null;
  const sidebar = document.querySelector('.sidebar') as HTMLElement | null;

  if (!toggleBtn || !sidebar) {
    console.warn('侧边栏切换按钮初始化失败：未找到对应元素');
    return;
  }

  // 初始化状态（从封装的状态对象读取）
  updateSidebarState(sidebar, sidebarState.isExpanded);

  // 绑定点击事件（更新封装的状态）
  toggleBtn.addEventListener('click', () => {
    sidebarState.isExpanded = !sidebarState.isExpanded;
    updateSidebarState(sidebar, sidebarState.isExpanded);

    if (!isMobile()) {
      localStorage.setItem('sidebarExpanded', sidebarState.isExpanded.toString());
    }
  });
}

/**
 * 恢复本地存储的侧边栏状态
 */
function restoreSidebarState() {
  const sidebar = document.querySelector('.sidebar') as HTMLElement | null;
  if (!sidebar) return;

  if (isMobile()) {
    sidebarState.isExpanded = false;
    updateSidebarState(sidebar, false);
    return;
  }

  const savedState = localStorage.getItem('sidebarExpanded');
  if (savedState === 'false') {
    sidebarState.isExpanded = false;
    updateSidebarState(sidebar, false);
  }
}

// ------------------------------ 入口函数 ------------------------------
/**
 * 初始化侧边栏（对外接口）
 */
export async function initSidebar(onFileClick: (file: string) => void): Promise<string[]> {
  const navContainer = document.getElementById('sidebar-nav') as HTMLElement | null;
  const markdownContainer = document.getElementById('markdown-container') as HTMLElement | null; // 用于渲染markdown内容的容器
  const overviewContainer = document.getElementById('overview') as HTMLElement | null; // 用于渲染一级目录概览的容器
  
  if (!navContainer || !markdownContainer || !overviewContainer) {
    console.error('侧边栏初始化失败：未找到相关容器');
    return [];
  }

  // 初始化切换按钮
  initSidebarToggle();

  // 获取Markdown路径并构建导航
  const mdPaths = Object.keys(import.meta.glob('/docs/**/*.md', { eager: false }));
  buildNavTree(mdPaths);

  // 渲染导航
  const navTree: NavRoot[] = getNavTree();

  // 注意这里的 onDirClick 被用来在点击目录时渲染一级目录概览
  navRender(navContainer, navTree, onFileClick, (dir) => {
    // 点击目录时，清空现有内容
    markdownContainer.innerHTML = ''; // 清空 Markdown 内容
    overviewContainer.innerHTML = ''; // 清空一级目录概览内容
    overviewContainer.classList.add('show'); // 显示一级目录概览

    // 隐藏上一次的页内导航
    hidePageNavigation();

    // 渲染一级目录概览，只传入当前目录的子元素
    renderOverView(dir.children);
    
  });

  // 加载链接
  await initSidebarLinks();

  // 恢复本地存储状态（提取为独立函数）
  restoreSidebarState();

  return getAllPages();
}



// 导出状态获取接口（可选）
export function getSidebarState(): boolean {
  return sidebarState.isExpanded;
}
