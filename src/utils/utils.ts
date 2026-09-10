import type { DOMElements } from './types';

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 安全的 DOM 元素获取
export function getElement<T extends HTMLElement>(
  selector: string,
  type: new () => T
): T | null {
  const element = document.querySelector(selector);
  return element instanceof type ? element : null;
}

// 获取所有必需的 DOM 元素
export function getDOMElements(): Partial<DOMElements> | null {
  const elements = {
    html: document.documentElement,
    backBtn: getElement('#backBtn', HTMLButtonElement) || undefined,
    forwardBtn: getElement('#forwardBtn', HTMLButtonElement) || undefined,
    searchBtn: getElement('#searchBtn', HTMLButtonElement) || undefined,
    themeBtn: getElement('#themeBtn', HTMLButtonElement) || undefined,
    exportBtn: getElement('#exportBtn', HTMLButtonElement) || undefined,
    nightModeSwitch: getElement('#nightModeSwitch', HTMLInputElement) || undefined,
    autoModeSwitch: getElement('#autoModeSwitch', HTMLInputElement) || undefined,
    colorPalette: getElement('#colorOptions', HTMLElement) || undefined,
    themePanel: getElement('.theme-panel', HTMLElement) || undefined,
    exportPanel: getElement('#exportPanel', HTMLElement) || undefined,
    searchBox: getElement('#searchBox', HTMLElement) || undefined,
    markdownContainer: getElement('#markdown-container', HTMLElement) || undefined,
    sidebar: getElement('.sidebar', HTMLElement) || undefined,
    sidebarToggle: getElement('#sidebar-toggle', HTMLButtonElement) || undefined,
    sidebarNav: getElement('#sidebar-nav', HTMLElement) || undefined,
    sidebarOverlay: getElement('.sidebar-overlay', HTMLElement) || undefined
  };

  // 检查必需元素是否存在
  const requiredElements = [
    'backBtn', 'forwardBtn', 'themeBtn', 'exportBtn',
    'nightModeSwitch', 'autoModeSwitch', 'colorPalette', 'themePanel',
    'exportPanel', 'markdownContainer'
    // 'searchBox' 已移除
  ];

  const missingElements = requiredElements.filter(key => !elements[key as keyof typeof elements]);
  
  if (missingElements.length > 0) {
    console.error('缺少必需的 DOM 元素:', missingElements);
    return null;
  }

  return elements;
}

// 错误处理工具
export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AppError';
  }
}

// 通用提示（错误/成功共用一套逻辑）
function showToast(type: 'error' | 'success', message: string, duration: number): void {
  const toast = document.createElement('div');
  toast.className = `${type}-toast`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 用户友好的错误提示
export function showError(message: string, duration: number = 3000): void {
  showToast('error', message, duration);
}

// 成功提示
export function showSuccess(message: string, duration: number = 2000): void {
  showToast('success', message, duration);
}

// 全局存储 key（避免多处硬编码字符串）
export const STORAGE_KEYS = {
  currentPage: 'mkoneCurrentPage'
} as const;

// 本地存储工具
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('存储失败:', error);
    }
  },
  
  remove: (key: string): void => {
    localStorage.removeItem(key);
  }
}; 