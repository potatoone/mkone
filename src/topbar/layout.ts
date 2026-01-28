import { togglePageNavigation } from '../utils/pageNav';

// 类型定义
interface FontConfig {
  displayName: string; // 显示名称
  cssName: string;     // CSS字体名
  url?: string;        // 可选CDN资源地址
}

type PaddingPreset = 'small' | 'medium' | 'large';

// 常量配置（仅新增导航存储键）
const CONFIG = {
  fontSize: {
    target: 10, // 1rem = 10px
    min: 5,
    max: 15
  },
  storageKeys: {
    fontSize: 'user-font-size',
    selectedFont: 'user-selected-font',
    selectedPadding: 'user-selected-padding',
    fontOptions: 'saved-font-options',
    navVisible: 'mkone.nav.visible' // 新增：导航可见性存储键
  }
} as const;

// 字体加载器：处理CDN资源加载
class FontLoader {
  private loadedUrls = new Set<string>();

  async load(font: FontConfig): Promise<void> {
    if (!font.url || this.loadedUrls.has(font.url)) return;
    this.loadedUrls.add(font.url);

    try {
      if (font.url.endsWith('.css')) {
        await this.loadCss(font.url);
      } else {
        await this.loadFontFile(font);
      }
    } catch (err) {
      console.warn(`⚠️ 字体加载失败: ${font.displayName}`, err);
    }
  }

  private loadCss(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`CSS加载失败: ${url}`));
      document.head.appendChild(link);
    });
  }

  private loadFontFile(font: FontConfig): Promise<void> {
    return new Promise((resolve) => {
      const ext = font.url!.split('.').pop() || '';
      const formatMap: Record<string, string> = {
        woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype'
      };
      const format = formatMap[ext] || 'opentype';

      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: '${font.cssName}';
          src: url('${font.url}') format('${format}');
          font-display: swap;
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.appendChild(style);
      resolve();
    });
  }
}

// 主布局控制器（仅添加导航开关相关逻辑）
export function setupLayout(
  html: HTMLElement,
  layoutPanel: HTMLElement,
  decreaseFontSizeBtn: HTMLButtonElement,
  increaseFontSizeBtn: HTMLButtonElement,
  fontSizeDisplay: HTMLElement,
  fontSelectContainer: HTMLElement,
  paddingBtns: NodeListOf<HTMLButtonElement>
) {
  // 状态管理（新增导航可见性状态）
  let currentFont: FontConfig | null = null;
  let currentFontSize: number = CONFIG.fontSize.target;
  let currentPadding: PaddingPreset = 'medium';
  let fontList: FontConfig[] = [];
  let isNavVisible: boolean = true; // 新增：导航可见性状态

  // 依赖与DOM缓存（新增导航开关元素）
  const fontLoader = new FontLoader();
  const fontTrigger = fontSelectContainer.querySelector('.dropdown-trigger') as HTMLElement;
  const fontSelectedText = fontSelectContainer.querySelector('.selected-text') as HTMLElement;
  const fontMenu = fontSelectContainer.querySelector('.dropdown-menu') as HTMLElement;
  const navToggleSwitch = document.getElementById('navToggleSwitch') as HTMLInputElement; // 新增：导航开关

  // 初始化检查（保留原有逻辑）
  if (!fontTrigger || !fontSelectedText || !fontMenu) {
    console.error('❌ 字体选择器缺少关键DOM元素');
    return { init: async () => {} };
  }

  // 新增：导航状态控制函数
  function updateNavVisibility() {
    if (navToggleSwitch) {
      // 同步开关状态（勾选=隐藏导航）
      navToggleSwitch.checked = !isNavVisible;
    }
    // 调用pageNav的控制函数切换显示
    togglePageNavigation(isNavVisible);
  }

  // 字体大小控制（原有逻辑不变）
  function setFontSize(size: number) {
    const clamped = Math.max(CONFIG.fontSize.min, Math.min(size, CONFIG.fontSize.max));
    currentFontSize = clamped;
    html.style.fontSize = `${clamped}px`;
    fontSizeDisplay.textContent = `${clamped}`;
    decreaseFontSizeBtn.disabled = clamped === CONFIG.fontSize.min;
    increaseFontSizeBtn.disabled = clamped === CONFIG.fontSize.max;
    localStorage.setItem(CONFIG.storageKeys.fontSize, clamped.toString());
  }

  // 内边距控制
  function setPadding(preset: PaddingPreset) {
    currentPadding = preset;
    html.classList.remove('padding-small', 'padding-medium', 'padding-large');
    html.classList.add(`padding-${preset}`);
    paddingBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.padding === preset));
    localStorage.setItem(CONFIG.storageKeys.selectedPadding, preset);
  }

  // 字体选择与加载（原有逻辑不变）
  async function selectFont(font: FontConfig) {
    await fontLoader.load(font);
    currentFont = font;
    html.style.setProperty('--body-font', `'${font.cssName}'`);
    fontSelectedText.textContent = font.displayName;
    fontMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.classList.toggle('selected', (item as HTMLElement).dataset.cssName === font.cssName);
    });
    fontSelectContainer.classList.remove('open');
    localStorage.setItem(CONFIG.storageKeys.selectedFont, JSON.stringify(font));
  }

  // 渲染字体选项（原有逻辑不变）
  function renderFontOptions() {
    fontMenu.innerHTML = '';
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

      item.addEventListener('click', () => selectFont(font));
      fontMenu.appendChild(item);
    });
  }

  // 加载字体配置（原有逻辑不变）
  async function loadFontList() {
    const localSaved = localStorage.getItem(CONFIG.storageKeys.fontOptions);
    const localFonts: FontConfig[] = localSaved ? JSON.parse(localSaved) : [];

    try {
      const response = await fetch('./config/fonts.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remoteFonts: FontConfig[] = await response.json();
      const uniqueFonts = [...remoteFonts];
      localFonts.forEach(local => {
        if (!uniqueFonts.some(remote => remote.cssName === local.cssName)) {
          uniqueFonts.push(local);
        }
      });
      fontList = uniqueFonts;
      localStorage.setItem(CONFIG.storageKeys.fontOptions, JSON.stringify(uniqueFonts));
    } catch (err) {
      console.warn('⚠️ 远程字体配置加载失败，使用本地缓存', err);
      fontList = localFonts.length > 0 ? localFonts : [
        { displayName: '默认字体', cssName: 'sans-serif' },
        { displayName: '微软雅黑', cssName: 'Microsoft YaHei' }
      ];
    }

    renderFontOptions();
    restoreSelectedFont();
  }

  // 恢复上次选中的字体（原有逻辑不变）
  function restoreSelectedFont() {
    const saved = localStorage.getItem(CONFIG.storageKeys.selectedFont);
    if (!saved && fontList.length > 0) {
      selectFont(fontList[0]).catch(err => console.warn('默认字体选择失败', err));
      return;
    }

    try {
      const savedFont = JSON.parse(saved!) as FontConfig;
      const matched = fontList.find(f => f.cssName === savedFont.cssName);
      if (matched) {
        selectFont(matched).catch(err => console.warn('恢复字体失败', err));
      }
    } catch (err) {
      console.warn('解析字体配置失败', err);
    }
  }

  // 绑定事件（新增导航开关事件）
  function bindEvents() {
    // 原有事件（字体大小、内边距、字体选择）
    decreaseFontSizeBtn.addEventListener('click', () => setFontSize(currentFontSize - 1));
    increaseFontSizeBtn.addEventListener('click', () => setFontSize(currentFontSize + 1));

    paddingBtns.forEach(btn => {
      const preset = btn.dataset.padding as PaddingPreset;
      if (preset) btn.addEventListener('click', () => setPadding(preset));
    });

    fontTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      fontSelectContainer.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!fontSelectContainer.contains(e.target as Node)) {
        fontSelectContainer.classList.remove('open');
      }
    });

    // 新增：导航开关事件
    if (navToggleSwitch) {
      navToggleSwitch.addEventListener('change', (e) => {
        // 开关状态：checked = 隐藏导航
        isNavVisible = !(e.target as HTMLInputElement).checked;
        // 保存状态到本地存储
        localStorage.setItem(CONFIG.storageKeys.navVisible, isNavVisible.toString());
        // 更新导航显示
        updateNavVisibility();
      });
    }
  }

  // 初始化（新增导航状态恢复）
  async function init() {
    const savedFontSize = localStorage.getItem(CONFIG.storageKeys.fontSize);
    const savedPadding = localStorage.getItem(CONFIG.storageKeys.selectedPadding) as PaddingPreset;
    // 新增：从本地存储恢复导航状态（默认显示）
    const savedNavVisible = localStorage.getItem(CONFIG.storageKeys.navVisible);
    isNavVisible = savedNavVisible !== 'false';

    // 应用原有状态
    setFontSize(savedFontSize ? parseInt(savedFontSize, 10) : CONFIG.fontSize.target);
    setPadding(savedPadding || 'medium');

    // 新增：应用导航状态
    updateNavVisibility();

    // 原有初始化逻辑
    await loadFontList();
    bindEvents();

    console.log('✅ 布局初始化完成');
  }

  return { init };
}