/**
 * 页面浏览状态（阅读进度）持久化
 *
 * - 按文档记录滚动位置，切换页面 / 刷新浏览器后自动恢复
 * - 同时保存「绝对像素」与「滚动比例」：
 *   内容高度基本一致时用像素精确定位；图片/图表等导致高度变化时按比例恢复
 * - 滚动时防抖写入 localStorage，页面隐藏/关闭前立即落盘
 */

import { storage } from '../utils/utils';
import { getScrollContainer } from './scrolltotop';

const STORAGE_KEY = 'mkoneScrollPositions';
const MAX_ENTRIES = 200; // 最多保存多少篇文档的位置
const TOP_THRESHOLD = 4; // 距顶部小于该值视为“未滚动”，不记录
const SAVE_DEBOUNCE = 250; // 滚动停止多久后写入
const HEIGHT_TOLERANCE = 0.1; // 内容高度变化超过 10% 时改用比例恢复

interface ScrollRecord {
  /** 绝对滚动距离（px） */
  top: number;
  /** 滚动比例（0~1） */
  ratio: number;
  /** 记录时的内容总高度，用于判断能否沿用像素值 */
  height: number;
}

type ScrollMap = Record<string, ScrollRecord>;

let positions: ScrollMap = storage.get<ScrollMap>(STORAGE_KEY, {}) || {};
let currentFile = '';
let saveTimer: number | null = null;
let bound = false;
let restoreToken = 0;

/** 立即把位置写入 localStorage */
function flush(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  trim();
  storage.set(STORAGE_KEY, positions);
}

/** 限制存储条数，优先保留最近写入的（对象键顺序即插入顺序） */
function trim(): void {
  const keys = Object.keys(positions);
  if (keys.length <= MAX_ENTRIES) return;
  keys.slice(0, keys.length - MAX_ENTRIES).forEach(key => delete positions[key]);
}

/** 记录当前滚动位置 */
function capture(): void {
  const container = getScrollContainer();
  if (!container || !currentFile) return;

  const containerHeight = container.scrollHeight;
  const max = containerHeight - container.clientHeight;
  const top = container.scrollTop;

  if (top < TOP_THRESHOLD || max <= 0) {
    // 在顶部或页面不可滚动：清除记录，避免下次“恢复”到无意义位置
    delete positions[currentFile];
    return;
  }

  positions[currentFile] = {
    top,
    ratio: top / max,
    height: containerHeight
  };
}

/** 滚动时的防抖保存 */
function scheduleSave(): void {
  if (saveTimer !== null) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    capture();
    flush();
  }, SAVE_DEBOUNCE);
}

/** 绑定全局监听（只绑定一次） */
function bindOnce(): void {
  if (bound) return;
  bound = true;

  const container = getScrollContainer();
  container?.addEventListener('scroll', scheduleSave, { passive: true });

  // 页面隐藏 / 关闭前立即保存（移动端切后台可能不触发 beforeunload）
  window.addEventListener('pagehide', () => {
    capture();
    flush();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      capture();
      flush();
    }
  });
}

/**
 * 保存当前文档的滚动位置
 * 注意：必须在替换正文之前调用，否则读到的是新内容的高度
 */
export function saveCurrentScroll(): void {
  capture();
  flush();
}

/** 设置当前文档（切换页面时调用） */
export function setCurrentFile(file: string): void {
  currentFile = file;
  bindOnce();
}

/** 立即把滚动容器回顶（不触发动画） */
export function scrollToTopInstant(): void {
  const container = getScrollContainer();
  if (container) container.scrollTop = 0;
}

/** 取某篇文档记录过的最大滚动比例（0 表示没有记录） */
export function getSavedRatio(file: string): number {
  return positions[file]?.ratio ?? 0;
}

/**
 * 恢复阅读进度
 * 采用多次尝试：正文首帧渲染后先定位，图片 / Mermaid 等异步内容撑高后再校正一次
 */
export function restoreScrollPosition(file: string): void {
  const saved = positions[file];
  if (!saved) return;

  const token = ++restoreToken;
  const attempts = [0, 120, 350, 800];

  attempts.forEach(delay => {
    window.setTimeout(() => {
      // 期间用户已切换到其它文档，则放弃本次恢复
      if (token !== restoreToken || currentFile !== file) return;

      const container = getScrollContainer();
      if (!container) return;

      const max = container.scrollHeight - container.clientHeight;
      if (max <= 0) return;

      const heightChanged =
        saved.height > 0 &&
        Math.abs(container.scrollHeight - saved.height) / saved.height > HEIGHT_TOLERANCE;

      const target = heightChanged ? saved.ratio * max : saved.top;
      const next = Math.min(Math.max(target, 0), max);

      // 只在尚未到达目标位置时写入，避免和用户的主动滚动打架
      if (Math.abs(container.scrollTop - next) > 2) {
        container.scrollTop = next;
      }
    }, delay);
  });
}
