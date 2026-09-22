import { onLocaleChange, t, type MessageKey } from '../utils/i18n';

interface Theme {
  name: string;
  color: string;
  /** 多语言标题在词典中的 key */
  titleKey: MessageKey;
}

const STORAGE_KEYS = {
  theme: 'user-theme-color',
  darkMode: 'user-dark-mode',
  autoMode: 'user-auto-mode'
};

export function setupTheme(
  html: HTMLElement,
  themeBtn: HTMLButtonElement,
  nightModeSwitch: HTMLInputElement,
  autoModeSwitch: HTMLInputElement,
  colorPalette: HTMLElement
) {
  // 调整顺序后的主题配置
  const baseThemes: Theme[] = [
    { name: 'classic', color: '#2563eb', titleKey: 'theme.classic' },
    { name: 'gray', color: '#3d3d45', titleKey: 'theme.gray' },
    { name: 'book', color: '#ea580c', titleKey: 'theme.book' },
    { name: 'green', color: '#2d8a78', titleKey: 'theme.green' },
    { name: 'purple', color: '#8040c0', titleKey: 'theme.purple' },
    { name: 'rose', color: '#b04068', titleKey: 'theme.rose' }
  ];

  // DOM 与状态初始化
  const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
  let currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'classic'; // 默认经典主题
  let isAutoMode = localStorage.getItem(STORAGE_KEYS.autoMode) === 'true';
  let isDarkMode = isAutoMode
    ? systemDarkMode.matches
    : localStorage.getItem(STORAGE_KEYS.darkMode) === 'true';

  // 应用主题（通过CSS变量控制颜色）
  const applyTheme = () => {
    // 设置主题名称
    html.setAttribute('data-theme', currentTheme);

    // 控制暗色模式
    if (isDarkMode) {
      html.setAttribute('theme-dark', 'true');
    } else {
      html.removeAttribute('theme-dark');
    }

    // 更新开关状态
    nightModeSwitch.checked = isDarkMode;
    autoModeSwitch.checked = isAutoMode;
    nightModeSwitch.disabled = isAutoMode;
  };

  // 生成主题颜色按钮
  const generateColorButtons = () => {
    colorPalette.innerHTML = baseThemes.map(theme => `
      <button class="color-item ${theme.name === currentTheme ? 'active' : ''}" 
              style="background-color: ${theme.color}" 
              data-tooltip="${t(theme.titleKey)}"
              data-theme="${theme.name}">
      </button>
    `).join('');

    // 绑定颜色按钮点击事件
    colorPalette.querySelectorAll<HTMLButtonElement>('.color-item').forEach(button => {
      button.addEventListener('click', () => {
        const themeName = button.dataset.theme!;
        currentTheme = themeName;
        localStorage.setItem(STORAGE_KEYS.theme, currentTheme);
        applyTheme();

        // 更新颜色选择器激活状态
        colorPalette.querySelector('.color-item.active')?.classList.remove('active');
        button.classList.add('active');
      });
    });
  };

  // 事件监听
  systemDarkMode.addEventListener('change', (e) => {
    if (isAutoMode && e.matches !== isDarkMode) {
      isDarkMode = e.matches;
      applyTheme();
    }
  });

  autoModeSwitch.addEventListener('change', () => {
    isAutoMode = autoModeSwitch.checked;
    localStorage.setItem(STORAGE_KEYS.autoMode, isAutoMode.toString());

    if (isAutoMode) {
      isDarkMode = systemDarkMode.matches;
      localStorage.removeItem(STORAGE_KEYS.darkMode);
    } else {
      localStorage.setItem(STORAGE_KEYS.darkMode, isDarkMode.toString());
    }

    applyTheme();
  });

  nightModeSwitch.addEventListener('change', () => {
    if (!isAutoMode) {
      isDarkMode = nightModeSwitch.checked;
      localStorage.setItem(STORAGE_KEYS.darkMode, isDarkMode.toString());
      applyTheme();
    }
  });

  // 初始化
  generateColorButtons();
  applyTheme();

  // 语言切换后重渲染主题色块（提示文案跟随语言）
  onLocaleChange(generateColorButtons);

  // 暴露公共方法
  return {
    toggleDarkMode: () => {
      isAutoMode = false;
      isDarkMode = !isDarkMode;
      localStorage.setItem(STORAGE_KEYS.autoMode, 'false');
      localStorage.setItem(STORAGE_KEYS.darkMode, isDarkMode.toString());
      autoModeSwitch.checked = false;
      nightModeSwitch.checked = isDarkMode;
      applyTheme();
    }
  };
}