/**
 * 全局自定义 tooltip
 *
 * - 悬停带 [data-tooltip] 或原生 title 的元素时，显示统一样式的提示（替代浏览器原生 tooltip）
 * - 原生 title 采用「借出」策略：悬停期间临时移到 data-tooltip，移开后还原，避免出现双 tooltip
 * - 位置优先显示在目标上方居中，上方放不下时翻转到下方，并始终约束在视口内
 * - data-tooltip 动态变化（如复制按钮切换为「已复制」）时，同步刷新提示文本
 */

let tooltipEl: HTMLElement | null = null;
let currentAnchor: Element | null = null;
let showTimer: number | null = null;
let bound = false;

const SHOW_DELAY = 150; // 悬停多久后显示
const GAP = 8; // 与目标元素的间距
const EDGE = 8; // 距视口边缘的最小间距

function ensureEl(): HTMLElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'global-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

/** 读取元素的提示文本；原生 title 会被临时移到 data-tooltip（悬停结束后还原） */
function borrowText(el: Element): string | null {
  const explicit = el.getAttribute('data-tooltip');
  if (explicit !== null) return explicit.trim() || null;

  const native = el.getAttribute('title');
  if (native && native.trim()) {
    el.setAttribute('data-tooltip', native);
    el.removeAttribute('title');
    el.setAttribute('data-tooltip-borrowed', '1');
    return native.trim();
  }
  return null;
}

/** 归还被借出的原生 title */
function releaseText(el: Element): void {
  if (el.getAttribute('data-tooltip-borrowed') !== '1') return;
  const text = el.getAttribute('data-tooltip') ?? '';
  el.removeAttribute('data-tooltip-borrowed');
  el.removeAttribute('data-tooltip');
  if (text) el.setAttribute('title', text);
}

/**
 * 获取锚点的定位矩形与对齐方式：
 * 纯文本的块级元素（如 .nav-title）通常占满整行，元素矩形中心 ≠ 文字中心，
 * 会导致 tooltip 视觉上偏移，这里改用文本行的实际矩形并按左侧起点对齐；
 * 其他元素沿用元素矩形居中
 */
function getAnchorRect(anchor: Element): { rect: DOMRect; align: 'left' | 'center' } {
  if (anchor instanceof HTMLElement && anchor.textContent?.trim() && anchor.children.length === 0) {
    const range = document.createRange();
    range.selectNodeContents(anchor);
    const rects = range.getClientRects();
    if (rects.length) return { rect: rects[0], align: 'left' };
  }
  return { rect: anchor.getBoundingClientRect(), align: 'center' };
}

/** 计算位置：优先下方（文本锚点左对齐、元素锚点居中），下方放不下则翻到上方，并夹在视口内 */
function position(anchor: Element): void {
  const tip = ensureEl();
  const { rect, align } = getAnchorRect(anchor);
  const { offsetWidth: tw, offsetHeight: th } = tip;

  let left = align === 'left' ? rect.left : rect.left + rect.width / 2 - tw / 2;
  left = Math.max(EDGE, Math.min(left, window.innerWidth - tw - EDGE));

  let top = rect.bottom + GAP;
  if (top + th > window.innerHeight - EDGE) top = rect.top - th - GAP;

  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function hide(): void {
  if (showTimer !== null) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  currentAnchor = null;
  tooltipEl?.classList.remove('show');
}

/** 初始化全局 tooltip（事件委托，应用启动时调用一次） */
export function initGlobalTooltip(): void {
  if (bound) return;
  bound = true;

  document.addEventListener('mouseover', (e) => {
    // .arrow-btn（上一页/下一页）保留原有 CSS 提示框，不由全局 tooltip 接管
    const target = (e.target as Element).closest?.('[data-tooltip]:not(.arrow-btn), [title]');
    if (!target || target === currentAnchor) return;

    hide();
    const text = borrowText(target);
    if (!text) return;

    currentAnchor = target;
    showTimer = window.setTimeout(() => {
      const tip = ensureEl();
      tip.textContent = text;
      tip.classList.add('show');
      position(target);
    }, SHOW_DELAY);
  });

  document.addEventListener('mouseout', (e) => {
    const target = (e.target as Element).closest?.('[data-tooltip]:not(.arrow-btn), [title]');
    if (target && target === currentAnchor) {
      releaseText(target);
      hide();
    }
  });

  // 页面滚动 / 视口变化时收起，避免提示停留在错误位置
  window.addEventListener('scroll', () => {
    if (tooltipEl?.classList.contains('show')) hide();
  }, true);
  window.addEventListener('resize', hide);

  // data-tooltip 动态更新时（如复制按钮切换为「已复制」）同步刷新提示内容
  new MutationObserver(() => {
    if (!currentAnchor || !tooltipEl?.classList.contains('show')) return;
    const text = currentAnchor.getAttribute('data-tooltip')?.trim();
    if (text) tooltipEl.textContent = text;
  }).observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-tooltip']
  });
}
