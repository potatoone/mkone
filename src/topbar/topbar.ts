import { setupState } from '../utils/stateManager';
import { setupTheme } from './theme';
import { setupSearch } from './search';
import { ExportManager } from './export';
import { setupLayout } from './layout/layout';
import { PageManager } from '../page/pageManager';
// 导入 pageTitle.ts 中的函数
import { createAndInsertPageTitle, initPageTitleUpdater, showPageTitle } from '../page/pageTitle';

// 封装事件处理函数，减少重复代码
const handleClick = (callback: () => void) => (e: Event) => {
  e.stopPropagation();
  callback();
};

export function initTopbar(
  onBack: () => void,        // 第1个参数：后退功能
  onForward: () => void,     // 第2个参数：前进功能
  onSearch: () => void,       // 第3个参数：搜索功能
  pageManager: PageManager // 新增：传入PageManager实例
): ExportManager {
  const html = document.documentElement;
  const exportManager = new ExportManager();

  // 获取所有DOM元素
  const backBtn = document.getElementById('backBtn') as HTMLButtonElement | null;
  const forwardBtn = document.getElementById('forwardBtn') as HTMLButtonElement | null;
  const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement | null;
  const themeBtn = document.getElementById('themeBtn') as HTMLButtonElement | null;
  const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement | null;
  const layoutBtn = document.getElementById('layoutBtn') as HTMLButtonElement | null;
  
  const nightModeSwitch = document.getElementById('nightModeSwitch') as HTMLInputElement | null;
  const autoModeSwitch = document.getElementById('autoModeSwitch') as HTMLInputElement | null;
  const colorPalette = document.getElementById('colorOptions') as HTMLElement | null;
  
  const themePanel = document.getElementById('themePanel') as HTMLElement | null;
  const exportPanel = document.getElementById('exportPanel') as HTMLElement | null;
  const searchArea = document.getElementById('search-area') as HTMLElement | null;
  const layoutPanel = document.getElementById('layoutPanel') as HTMLElement | null;
  
  // 布局控制元素
  const decreaseFontSizeBtn = document.getElementById('decreaseFontSize') as HTMLButtonElement | null;
  const increaseFontSizeBtn = document.getElementById('increaseFontSize') as HTMLButtonElement | null;
  const fontSizeDisplay = document.getElementById('currentFontSize') as HTMLElement | null;
  const fontSelect = document.getElementById('fontSelect') as HTMLSelectElement | null;
  const marginBtns = document.querySelectorAll('.padding-btn') as NodeListOf<HTMLButtonElement>;

  // 动态创建并插入 pageTitle 元素
  const pageTitle = createAndInsertPageTitle();

  // 验证所有必要元素是否存在（添加详细日志）
  const requiredElements = {
    backBtn, forwardBtn, searchBtn, themeBtn, exportBtn, layoutBtn,
    nightModeSwitch, autoModeSwitch, colorPalette,
    themePanel, exportPanel, searchArea, layoutPanel,
    decreaseFontSizeBtn, increaseFontSizeBtn, fontSizeDisplay, fontSelect
  };

  // 初始化按钮悬浮提示
  if (backBtn && forwardBtn) {
    // 初始设置一次
    pageManager.updateButtonTitles(backBtn, forwardBtn);

    // 监听页面切换事件（如果有），或在每次导航后手动调用更新
    // 这里假设页面切换后会执行回调，若没有可在loadPage后调用
    const originalLoadPage = pageManager.loadPage;
    pageManager.loadPage = async function(fileName) {
      // 先执行原加载逻辑
      await originalLoadPage.call(this, fileName);
      // 页面加载完成后，更新按钮悬浮提示
      if (backBtn && forwardBtn) {
        pageManager.updateButtonTitles(backBtn, forwardBtn);
      }
    };
  }

  // 初始化搜索/导出功能
  const searchManager = setupSearch();
  exportManager.init();

  // 初始化主题功能
  if (themeBtn && nightModeSwitch && autoModeSwitch && colorPalette) {
    setupTheme(html, themeBtn, nightModeSwitch, autoModeSwitch, colorPalette);
  } else {
    console.error('⚠️ 主题功能初始化失败：缺少必要元素');
  }

  // 初始化布局功能（关键修改：确保所有元素存在）
  if (
    html && layoutPanel && 
    decreaseFontSizeBtn && increaseFontSizeBtn && 
    fontSizeDisplay && fontSelect && 
    marginBtns.length > 0
  ) {
    
    const layoutManager = setupLayout(
      html,
      layoutPanel,
      decreaseFontSizeBtn,
      increaseFontSizeBtn,
      fontSizeDisplay,
      fontSelect,
      marginBtns
    );
    
    // 调用初始化方法
    layoutManager.init().catch(error => {
      console.error('布局功能初始化失败:', error);
    });
    
  } else {
    console.error('⚠️ 布局功能初始化失败：缺少必要元素');
  }

  // 设置面板显示/隐藏逻辑
  if (layoutBtn && layoutPanel && themeBtn && themePanel && exportBtn && exportPanel) {
    setupState([
      { trigger: themeBtn, panel: themePanel },
      { trigger: exportBtn, panel: exportPanel },
      { trigger: layoutBtn, panel: layoutPanel }
    ]);
    
    // 防止面板内部点击触发隐藏
    [themePanel, layoutPanel, exportPanel].forEach(panel => {
      panel?.addEventListener('click', (e) => e.stopPropagation());
    });
  } else {
    console.error('⚠️ 面板状态管理初始化失败：缺少必要元素');
  }

  searchBtn?.addEventListener('click', handleClick(() => {
    onSearch(); // 第一步：调用外部传入的onSearch
    searchManager.toggle(); // 第二步：调用toggle()
  }));

  // 导航按钮事件绑定（点击后会自动更新提示）
  backBtn?.addEventListener('click', handleClick(() => {
    onBack();
  }));

  forwardBtn?.addEventListener('click', handleClick(() => {
    onForward();
  }));

  // 布局按钮事件绑定
  layoutBtn?.addEventListener('click', handleClick(() => {
  }));

  // 初始化页面标题更新逻辑
  if (pageTitle) {
    initPageTitleUpdater(pageTitle, pageManager);
  }

  return exportManager;
}











