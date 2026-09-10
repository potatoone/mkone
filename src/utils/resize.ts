/**
 * 侧栏宽度拖拽调整
 *
 * - 左侧边栏：向右拖拽变宽
 * - 右侧页内导航：向左拖拽变宽
 * - 宽度写入 CSS 变量（--sidebar-width / --pagenav-width），持久化到 localStorage
 * - 支持键盘微调（方向键，Shift 为 1px）、双击复位
 * - 移动端 / 侧栏收起状态下自动禁用
 */

interface ResizeConfig {
  /** 拖拽手柄元素 id */
  handleId: string;
  /** 被调整尺寸的元素选择器 */
  targetSelector: string;
  /** 宽度对应的 CSS 变量名 */
  cssVar: string;
  /** localStorage 键名 */
  storageKey: string;
  /** 默认宽度 */
  defaultWidth: number;
  min: number;
  max: number;
  /** 1：向右拖拽变宽；-1：向左拖拽变宽 */
  direction: 1 | -1;
  /** 返回 true 时禁止拖拽（如移动端、侧栏已收起） */
  isDisabled?: () => boolean;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const readStoredWidth = (key: string, fallback: number, min: number, max: number): number => {
  const raw = Number(localStorage.getItem(key));
  return Number.isFinite(raw) && raw > 0 ? clamp(raw, min, max) : fallback;
};

const applyWidth = (cssVar: string, width: number): void => {
  document.documentElement.style.setProperty(cssVar, `${Math.round(width)}px`);
};

function setupResizable(config: ResizeConfig): void {
  const handle = document.getElementById(config.handleId);
  const target = document.querySelector<HTMLElement>(config.targetSelector);
  if (!handle || !target) {
    console.warn(`拖拽调整初始化失败：缺少元素（${config.handleId} 或 ${config.targetSelector}）`);
    return;
  }

  let currentWidth = readStoredWidth(
    config.storageKey,
    config.defaultWidth,
    config.min,
    config.max
  );

  // 启动时恢复上次宽度
  applyWidth(config.cssVar, currentWidth);

  const isBlocked = (): boolean => config.isDisabled?.() ?? false;

  const setWidth = (width: number): void => {
    currentWidth = clamp(width, config.min, config.max);
    applyWidth(config.cssVar, currentWidth);
  };

  const persist = (): void => {
    localStorage.setItem(config.storageKey, String(Math.round(currentWidth)));
  };

  const reset = (): void => {
    setWidth(config.defaultWidth);
    persist();
  };

  // 拖拽（Pointer Events：鼠标 / 触控 通用）
  handle.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 || isBlocked()) return;

    e.preventDefault();
    const startX = e.clientX;
    const startWidth = target.getBoundingClientRect().width || currentWidth;
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add('is-resizing');

    const onMove = (ev: PointerEvent): void => {
      setWidth(startWidth + (ev.clientX - startX) * config.direction);
    };

    const finish = (): void => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      document.body.classList.remove('is-resizing');
      persist();
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  });

  // 键盘微调：方向键调整宽度（Shift 精调 1px），Enter 复位
  handle.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isBlocked()) return;
    const step = e.shiftKey ? 1 : 16;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setWidth(currentWidth + step);
      persist();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setWidth(currentWidth - step);
      persist();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      reset();
    }
  });

  // 双击复位
  handle.addEventListener('dblclick', () => {
    if (isBlocked()) return;
    reset();
  });
}

/** 初始化左右两侧的拖拽调宽 */
export function initResizeHandles(): void {
  setupResizable({
    handleId: 'sidebar-resize-handle',
    targetSelector: '.sidebar',
    cssVar: '--sidebar-width',
    storageKey: 'sidebarWidth',
    defaultWidth: 250,
    min: 160,
    max: 600,
    direction: 1,
    // 移动端为浮层模式、侧栏收起时不支持拖拽
    isDisabled: () =>
      window.matchMedia('(max-width: 768px)').matches ||
      document.querySelector('.sidebar')?.classList.contains('collapsed') === true
  });

  setupResizable({
    handleId: 'pagenav-resize-handle',
    targetSelector: '#pageNav',
    cssVar: '--pagenav-width',
    storageKey: 'pageNavWidth',
    defaultWidth: 210,
    min: 140,
    max: 480,
    direction: -1,
    // ≤1100px 时页内导航变为浮层，不支持拖拽
    isDisabled: () => window.matchMedia('(max-width: 1100px)').matches
  });
}
