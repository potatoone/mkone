// pagenav.ts

import { renderMarkdown } from '../markdown/markdown';
import type { Heading, RenderMarkdownResult } from '../markdown/markdown';
import type { MarkdownMetadata } from '../markdown/overview/viewParser';
// 引入scrolltotop.ts中的核心方法和工具函数
import { 
  getScrollContainer, 
  updateScrollProgressCircle, 
  bindScrollToTopEvent,
  scrollToTop 
} from './scrolltotop';

let navLockId: string | null = null;

const STORAGE_KEYS = {
  navActive: 'mkone.nav.activeId',
  navVisible: 'mkone.nav.visible'
} as const;

// 通用DOM获取工具函数
const getEl = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

// 初始化页面导航（对外暴露的核心方法）
export async function initPageNavigation(filePath: string) {
  const renderResult: RenderMarkdownResult = await renderMarkdown(filePath);
  const { headings, metadata } = renderResult;
  
  if (!headings.length) return;

  generateNavigation(headings, metadata);
  bindMobileNavToggle();
  setupHeadingObserver();
  await waitImagesLoaded();

  window.scrollTo(0, 0);
  updateActiveNavState(headings[0].id);

  togglePageNavigation(localStorage.getItem(STORAGE_KEYS.navVisible) !== 'false');

  // 调用scrolltotop.ts中的方法：初始化环形进度
  updateScrollProgressCircle();

  // 调用scrolltotop.ts中的工具函数：获取滚动容器并监听滚动事件
  const scrollContainer = getScrollContainer();
  scrollContainer?.addEventListener('scroll', updateScrollProgressCircle);
}

// 等待图片加载完成
function waitImagesLoaded(timeout = 5000): Promise<void> {
  const imgs = Array.from(document.images).filter(img => !img.complete);
  if (!imgs.length) return Promise.resolve();

  return new Promise((resolve) => {
    let loaded = 0;
    const timer = setTimeout(resolve, timeout);
    const check = () => { if (++loaded === imgs.length) clearTimeout(timer), resolve(); };
    imgs.forEach(img => img.addEventListener('load', check));
    imgs.forEach(img => img.addEventListener('error', check));
  });
}

// 导航锚点滚动（基于滚动容器）
function scrollToHeading(id: string, cb?: () => void) {
  navLockId = id;
  waitImagesLoaded().then(() => {
    const el = document.getElementById(id);
    const scrollContainer = getScrollContainer(); // 调用scrolltotop.ts中的工具函数
    if (!el || !scrollContainer) return navLockId = null, cb?.();

    // 滚动到指定锚点（基于滚动容器，而非window）
    const elTop = el.offsetTop - 10; // 偏移10px避免贴顶
    scrollContainer.scrollTo({ top: elTop, behavior: 'smooth' });
    
    let lastY = scrollContainer.scrollTop, count = 0;
    const check = () => {
      if (Math.abs(scrollContainer.scrollTop - lastY) < 1 || count++ > 20) {
        updateActiveNavState(id);
        navLockId = null;
        cb?.();
      } else {
        lastY = scrollContainer.scrollTop;
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  });
}

// 监听标题元素交集，更新激活导航
function setupHeadingObserver() {
  const headings = document.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id]');
  const scrollContainer = getScrollContainer(); // 调用scrolltotop.ts中的工具函数
  if (!scrollContainer) return;

  // 监听滚动容器的交集（而非window）
  const observer = new IntersectionObserver(entries => {
    if (navLockId) return;
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;
    const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (top) {
      const id = top.target.id;
      updateActiveNavState(id);
      localStorage.setItem(STORAGE_KEYS.navActive, id);
    }
  }, {
    rootMargin: '-80px 0px -70% 0px',
    threshold: 0,
    root: scrollContainer // 核心：指定交集观察的根容器为滚动元素
  });

  headings.forEach(h => observer.observe(h));
}

// 生成导航DOM结构
function generateNavigation(headings: Heading[], metadata: MarkdownMetadata) {
  const nav = getEl('pageNav');
  if (!nav) return;
  
  const marktime = () => {
    return metadata?.time || 'No Time Mark';
  };

  nav.innerHTML = `
    <div class="nav-items-container">
      <div class="nav-title">On This Page</div>
      <div class="nav-indicator"></div>
      ${headings.map(h =>
        `<a href="#${h.id}" class="nav-item level-${h.level}" style="padding-left:${(h.level - 1) * 12}px">
          ${h.text}
        </a>`).join('')}
    </div>
    <div class="nav-navfooter">
      <div class="nav-scrolltotop" id="navScrollToTop">
        <div class="arrow"></div> <!-- 内层尖括号元素 -->
      </div>
      <div class="nav-timemark" id="navTimeMark">${marktime()}</div>
    </div>
  `;

  // 调用scrolltotop.ts中的方法：绑定回顶按钮事件
  bindScrollToTopEvent();
  bindNavEvents();
  markPageNavigationTime();
}

// 绑定导航项点击事件
function bindNavEvents() {
  getEl('pageNav')?.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLAnchorElement>('.nav-item');
    if (item) {
      e.preventDefault();
      const id = item.getAttribute('href')?.slice(1);
      if (id) {
        localStorage.setItem(STORAGE_KEYS.navActive, id);
        scrollToHeading(id, () => updateActiveNavState(id));
      }
    }
  });
}

// 更新激活导航项状态
export function updateActiveNavState(id: string) {
  document.querySelectorAll<HTMLAnchorElement>('.nav-item').forEach(item => {
    const isActive = item.getAttribute('href') === `#${id}`;
    item.classList.toggle('active', isActive);
    if (isActive) updateFollowLine(item);
  });
}

// 更新导航跟随线位置
function updateFollowLine(activeItem: HTMLElement) {
  const bar = document.querySelector<HTMLElement>('.nav-indicator');
  const container = activeItem.offsetParent as HTMLElement | null;
  if (!bar || !container) return;
  const { top, height } = activeItem.getBoundingClientRect();
  const containerTop = container.getBoundingClientRect().top;
  bar.style.top = `${top - containerTop}px`;
  bar.style.height = `${height}px`;
}

// 绑定移动端导航切换事件
function bindMobileNavToggle() {
  const title = getEl('pageTitle'), nav = getEl('pageNav');
  if (!title || !nav) return;
  title.onclick = (e) => (e.stopPropagation(), nav.classList.toggle('show'));
  document.onclick = (e) => !nav.contains(e.target as Node) && nav.classList.remove('show');
  nav.onclick = (e) => e.target === nav && nav.classList.remove('show');
}

// 切换导航显示/隐藏
export const togglePageNavigation = (v: boolean) => {
  const nav = getEl('pageNav');
  if (nav) nav.style.display = v ? '' : 'none';
};

// 隐藏导航
export const hidePageNavigation = () => togglePageNavigation(false);

// 显示导航
export const showPageNavigation = () => togglePageNavigation(true);

// 标记导航加载时间
export const markPageNavigationTime = () => {
  const nav = getEl('pageNav');
  if (nav) nav.dataset.loadedTime = Date.now().toString();
};

// 对外暴露回顶函数（可选，直接复用scrolltotop.ts的导出，方便调用者统一从pagenav.ts导入）
export { scrollToTop };