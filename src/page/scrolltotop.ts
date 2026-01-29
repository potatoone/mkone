// scrolltotop.ts

// 工具函数：获取实际的滚动容器（供两个文件共用）
export const getScrollContainer = () => {
  // 优先取content-wrapper（markdown的直接父容器，也是实际滚动的元素）
  return document.querySelector<HTMLElement>('.content-wrapper') || document.documentElement;
};

// 工具函数：计算滚动进度（返回 0 ~ 1 的数值）
const calculateScrollProgress = () => {
  const scrollContainer = getScrollContainer();
  if (!scrollContainer) return 0;

  // 滚动高度 = 总高度 - 可视区域高度
  const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
  if (scrollHeight <= 0) return 0;

  // 进度 = 当前滚动距离 / 滚动高度
  return scrollContainer.scrollTop / scrollHeight;
};

// 更新回顶按钮的水平上45度斜向高亮进度
export const updateScrollProgressCircle = () => {
  const scrollToTopBtn = getEl('navScrollToTop');
  if (!scrollToTopBtn) return;
  const progress = calculateScrollProgress(); // 获取 0-1 之间的进度值
  const progressPercent = progress * 100;
  // 水平右135度
  scrollToTopBtn.style.setProperty(
    '--progress-deg',
    '135deg'
  );
  scrollToTopBtn.style.setProperty(
    '--progress-percent',
    `${progressPercent}%`
  );
  scrollToTopBtn.querySelector('.arrow')?.parentElement?.style.setProperty(
    'background',
    `linear-gradient(135deg, var(--active-s) ${progressPercent}%, transparent ${progressPercent}%)`
  );
};

// 回顶函数（对外暴露）
export const scrollToTop = () => {
  const scrollContainer = getScrollContainer();
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// 通用DOM获取工具函数（供内部使用，如需跨文件使用可改为export）
const getEl = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

// 绑定回顶按钮点击事件（供pagenav.ts调用）
export const bindScrollToTopEvent = () => {
  const scrollToTopBtn = getEl('navScrollToTop');
  if (!scrollToTopBtn) {
    console.warn('未找到回顶按钮 #navScrollToTop');
    return;
  }
  // 先移除旧事件避免重复绑定
  scrollToTopBtn.removeEventListener('click', handleScrollToTopClick);
  scrollToTopBtn.addEventListener('click', handleScrollToTopClick);
};

// 回顶按钮点击事件处理函数（内部封装，避免重复代码）
const handleScrollToTopClick = () => {
  scrollToTop();
};