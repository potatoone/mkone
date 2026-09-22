// 全局通用类型定义

import type { LocalizedText } from './i18n';

// 导出历史记录项类型
export interface HistoryEntry {
  fileName: string;
  timestamp: number;
}

// 导出面板配置类型
export interface PanelConfig {
  trigger: HTMLElement;
  panel: HTMLElement;
}

// 导出DOM元素类型
export interface DOMElements {
  html: HTMLElement;
  markdownContainer: HTMLElement;
  backBtn: HTMLButtonElement;
  forwardBtn: HTMLButtonElement;
  searchBtn: HTMLButtonElement;
  searchBox: HTMLElement;
  sidebar: HTMLElement;
  sidebarToggle: HTMLButtonElement;
  sidebarNav: HTMLElement;
  sidebarOverlay: HTMLElement | null;
  exportBtn: HTMLButtonElement;
  exportPanel: HTMLElement;
  themeBtn: HTMLButtonElement;
  themePanel: HTMLElement;
  nightModeSwitch: HTMLInputElement;
  autoModeSwitch: HTMLInputElement;
  colorPalette: HTMLElement;
}

// 导出顶栏字体配置类型
export interface FontConfig {
  /** 显示名称：支持多语言（{ zh, en }）或直接字符串 */
  displayName: LocalizedText;
  cssName: string;     // CSS字体名
  url?: string;        // 可选CDN资源地址
}