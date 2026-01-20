// 全局通用类型定义
export interface HistoryEntry {
  fileName: string;
  timestamp: number;
}

export interface PanelConfig {
  trigger: HTMLElement;
  panel: HTMLElement;
}

// 导出DOM元素类型
export interface DOMElements {
  html: HTMLElement;
  backBtn: HTMLButtonElement;
  forwardBtn: HTMLButtonElement;
  searchBtn: HTMLButtonElement;
  exportBtn: HTMLButtonElement;
  searchBox: HTMLElement;
  markdownContainer: HTMLElement;
  sidebar: HTMLElement;
  sidebarToggle: HTMLButtonElement;
  sidebarNav: HTMLElement;
  sidebarOverlay: HTMLElement | null;
  themeBtn: HTMLButtonElement;
  themePanel: HTMLElement;
  exportPanel: HTMLElement;
  nightModeSwitch: HTMLInputElement;
  autoModeSwitch: HTMLInputElement;
  colorPalette: HTMLElement;
}