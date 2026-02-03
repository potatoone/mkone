import type { PanelConfig } from './types';
import { throttle } from './utils';

// 管理面板状态、显示隐藏及事件清理
export class stateManager {
  // 存储面板配置信息
  private panels: PanelConfig[];
  // 存储用于移除事件监听器的清理函数
  private cleanupFunctions: (() => void)[] = [];

  // 构造函数，初始化管理器
  constructor(panels: PanelConfig[]) {
    this.panels = panels;
    this.init();
  }

  // 初始化，绑定面板和全局事件
  private init(): void {
    this.bindPanelEvents();
    this.bindGlobalEvents();
  }

  // 为面板触发元素绑定点击事件
  private bindPanelEvents(): void {
    this.panels.forEach(({ trigger, panel }) => {
      const handleClick = (e: Event) => {
        e.stopPropagation();
        this.togglePanel(panel);
      };
      trigger.addEventListener('click', handleClick);
      this.cleanupFunctions.push(() => trigger.removeEventListener('click', handleClick));
    });
  }

  // 绑定全局点击和 ESC 关闭事件
  private bindGlobalEvents(): void {
    const throttledCloseAll = throttle(() => this.closeAllPanels(), 100);
    const handleGlobalClick = () => throttledCloseAll();
    const handleKeydown = (e: KeyboardEvent) => e.key === 'Escape' && this.closeAllPanels();
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeydown);
    this.cleanupFunctions.push(() => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeydown);
    });
  }

  // 在 stateManager 类的 togglePanel 方法中
  private togglePanel(panel: HTMLElement): void {
    const wasVisible = panel.classList.contains('show');
    this.closeAllPanels(); // 先关闭所有
    if (!wasVisible) {
      panel.classList.add('show'); // 仅在原本隐藏时显示
    }
  }

  // 关闭所有面板
  private closeAllPanels(): void {
    this.panels.forEach(({ panel }) => panel.classList.remove('show'));
  }

  // 公共方法，关闭所有面板
  public closeAll(): void {
    this.closeAllPanels();
  }

  // 按索引打开面板
  public openPanel(panelIndex: number): void {
    if (panelIndex >= 0 && panelIndex < this.panels.length) {
      this.closeAllPanels();
      this.panels[panelIndex].panel.classList.add('show');
    }
  }

  // 销毁管理器，执行清理函数
  public destroy(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
  }
}

// 创建管理器实例并返回销毁函数
export function setupState(panels: PanelConfig[]): () => void {
  const manager = new stateManager(panels);
  return () => manager.destroy();
}
