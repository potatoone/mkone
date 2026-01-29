// layout.ts
import { togglePageNavigation } from '../../page/pageNav';
import { FontConfigManager } from './font'; // 导入字体相关工具和类型
import { FontConfig } from '../../utils/types'; // 导入配置类型

type PaddingPreset = 'small' | 'medium' | 'large';

// 常量配置
const CONFIG = {
  fontSize: {
    target: 10, // 1rem = 10px
    min: 5,
    max: 15
  },
  storageKeys: {
    fontSize: 'user-font-size',
    selectedPadding: 'user-selected-padding',
    navVisible: 'mkone.nav.visible'
  }
} as const;

// 主布局控制器（专注布局核心逻辑，解耦字体业务）
export function setupLayout(
  html: HTMLElement,
  layoutPanel: HTMLElement,
  decreaseFontSizeBtn: HTMLButtonElement,
  increaseFontSizeBtn: HTMLButtonElement,
  fontSizeDisplay: HTMLElement,
  fontSelectContainer: HTMLElement,
  paddingBtns: NodeListOf<HTMLButtonElement>
) {
  // 状态管理
  let currentFontSize: number = CONFIG.fontSize.target;
  let currentPadding: PaddingPreset = 'medium';
  let isNavVisible: boolean = true;

  // 依赖初始化
  const fontConfigManager = new FontConfigManager(); // 引入字体配置管理器
  // DOM 缓存
  const fontTrigger = fontSelectContainer.querySelector('.dropdown-trigger') as HTMLElement;
  const fontSelectedText = fontSelectContainer.querySelector('.selected-text') as HTMLElement;
  const fontMenu = fontSelectContainer.querySelector('.dropdown-menu') as HTMLElement;
  const navToggleSwitch = document.getElementById('navToggleSwitch') as HTMLInputElement;

  // 初始化检查
  if (!fontTrigger || !fontSelectedText || !fontMenu) {
    console.error('❌ 字体选择器缺少关键DOM元素');
    return { init: async () => { } };
  }

  // ---------------------- 导航状态控制 ----------------------
  function updateNavVisibility() {
    if (navToggleSwitch) {
      navToggleSwitch.checked = !isNavVisible;
    }
    togglePageNavigation(isNavVisible);
  }

  // ---------------------- 字体大小控制 ----------------------
  function setFontSize(size: number) {
    const clamped = Math.max(CONFIG.fontSize.min, Math.min(size, CONFIG.fontSize.max));
    currentFontSize = clamped;
    html.style.fontSize = `${clamped}px`;
    fontSizeDisplay.textContent = `${clamped}`;
    decreaseFontSizeBtn.disabled = clamped === CONFIG.fontSize.min;
    increaseFontSizeBtn.disabled = clamped === CONFIG.fontSize.max;
    localStorage.setItem(CONFIG.storageKeys.fontSize, clamped.toString());
  }

  // ---------------------- 内边距控制 ----------------------
  function setPadding(preset: PaddingPreset) {
    currentPadding = preset;
    html.classList.remove('padding-small', 'padding-medium', 'padding-large');
    html.classList.add(`padding-${preset}`);
    paddingBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.padding === preset));
    localStorage.setItem(CONFIG.storageKeys.selectedPadding, preset);
  }

  // ---------------------- 字体选择器DOM渲染（仅DOM操作，无业务逻辑） ----------------------
  function renderFontOptions(fontList: FontConfig[]) {
    fontMenu.innerHTML = '';
    const currentFont = fontConfigManager.getCurrentFont();

    fontList.forEach(font => {
      const item = document.createElement('div');
      item.className = `dropdown-item ${currentFont?.cssName === font.cssName ? 'selected' : ''}`;
      item.textContent = font.displayName;
      item.dataset.cssName = font.cssName;

      if (font.url) {
        const badge = document.createElement('span');
        badge.className = 'cdn-badge';
        badge.textContent = 'CDN';
        item.appendChild(badge);
      }

      // 点击事件：调用字体管理器选择字体
      item.addEventListener('click', async () => {
        await fontConfigManager.selectFont(font, html);
        updateFontSelectorDisplay();
        fontSelectContainer.classList.remove('open');
      });

      fontMenu.appendChild(item);
    });
  }

  // 更新字体选择器显示文本
  function updateFontSelectorDisplay() {
    const currentFont = fontConfigManager.getCurrentFont();
    if (currentFont) {
      fontSelectedText.textContent = currentFont.displayName;
      // 更新选中项样式
      fontMenu.querySelectorAll('.dropdown-item').forEach(item => {
        const el = item as HTMLElement;
        el.classList.toggle('selected', el.dataset.cssName === currentFont?.cssName);
      });
    }
  }

  // ---------------------- 事件绑定 ----------------------
  function bindEvents() {
    // 字体大小事件
    decreaseFontSizeBtn.addEventListener('click', () => setFontSize(currentFontSize - 1));
    increaseFontSizeBtn.addEventListener('click', () => setFontSize(currentFontSize + 1));

    // 内边距事件
    paddingBtns.forEach(btn => {
      const preset = btn.dataset.padding as PaddingPreset;
      if (preset) btn.addEventListener('click', () => setPadding(preset));
    });

    // 字体选择器下拉事件
    fontTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      fontSelectContainer.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!fontSelectContainer.contains(e.target as Node)) {
        fontSelectContainer.classList.remove('open');
      }
    });

    // 导航开关事件
    if (navToggleSwitch) {
      navToggleSwitch.addEventListener('change', (e) => {
        isNavVisible = !(e.target as HTMLInputElement).checked;
        localStorage.setItem(CONFIG.storageKeys.navVisible, isNavVisible.toString());
        updateNavVisibility();
      });
    }
  }

  // ---------------------- 初始化 ----------------------
  async function init() {
    // 恢复布局相关状态
    const savedFontSize = localStorage.getItem(CONFIG.storageKeys.fontSize);
    const savedPadding = localStorage.getItem(CONFIG.storageKeys.selectedPadding) as PaddingPreset;
    const savedNavVisible = localStorage.getItem(CONFIG.storageKeys.navVisible);

    isNavVisible = savedNavVisible !== 'false';
    setFontSize(savedFontSize ? parseInt(savedFontSize, 10) : CONFIG.fontSize.target);
    setPadding(savedPadding || 'medium');
    updateNavVisibility();

    // 初始化字体（加载列表 + 渲染DOM）
    const fontList = await fontConfigManager.loadFontList();
    renderFontOptions(fontList);
    updateFontSelectorDisplay();

    // 绑定事件
    bindEvents();

    console.log('✅ 布局初始化完成');
  }

  return { init };
}