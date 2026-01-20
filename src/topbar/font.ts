// 类型定义
export interface FontConfig {
  displayName: string;
  cssName: string;
  url?: string; // CDN 资源地址（可选）
}

// 常量配置
export const TARGET_FONT_SIZE = 10; // 目标根字体大小（1rem = 10px）
export const MIN_FONT_SIZE = 5;     // 最小限制
export const MAX_FONT_SIZE = 15;    // 最大限制

// 存储键名常量
export const STORAGE_KEYS = {
  fontSize: 'user-font-size',
  selectedFont: 'user-selected-font',
} as const;

// 跟踪已加载的字体资源（避免重复加载）
export const loadedFontUrls = new Set<string>();

// 从本地存储加载字体大小
export function loadFontSize(): number {
  const saved = localStorage.getItem(STORAGE_KEYS.fontSize);
  const parsed = saved ? parseInt(saved, 10) : TARGET_FONT_SIZE;
  return Math.max(MIN_FONT_SIZE, Math.min(parsed, MAX_FONT_SIZE));
}

// 从本地存储加载字体（兼容CDN字体）
export function loadSelectedFont(fontOptions: FontConfig[]): FontConfig | null {
  const saved = localStorage.getItem(STORAGE_KEYS.selectedFont);
  if (!saved) {
    return null;
  }

  try {
    // 支持从JSON字符串恢复（可能是完整FontConfig）
    const parsed = JSON.parse(saved) as FontConfig;
    return fontOptions.find(f => f.cssName === parsed.cssName) || null;
  } catch (e) {
    // 兼容旧版本存储的cssName字符串
    const cssName = saved;
    return fontOptions.find(f => f.cssName === cssName) || null;
  }
}

// 加载CDN字体资源（修复可选属性检查）
export function loadFontResource(font: FontConfig): Promise<void> {
  return new Promise((resolve) => {
    // 1. 用可选链+空值判断处理 url 可能为 undefined 的情况
    if (!font.url || loadedFontUrls.has(font.url)) {
      // 无URL或已加载过，直接 resolve
      resolve();
      return;
    }

    // 标记为已加载（避免重复请求）
    loadedFontUrls.add(font.url);

    // 2. 处理CSS类型的URL（如霞骛文楷的style.css）
    if (font.url.endsWith('.css')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font.url; // 此时已确认 url 存在，可安全使用
      link.onload = () => {
        console.log(`📥 CDN字体CSS加载完成: ${font.displayName}`);
        resolve();
      };
      link.onerror = () => {
        console.error(`❌ 加载CDN字体CSS失败: ${font.url}`);
        resolve(); // 失败仍继续，避免阻塞
      };
      document.head.appendChild(link);
      return;
    }

    // 3. 处理字体文件（如woff2/ttf，需创建@font-face）
    const fontExts = ['.woff2', '.woff', '.ttf', '.otf'];
    if (fontExts.some(ext => font.url!.endsWith(ext))) { // 非空断言（已确认url存在）
      // 提取字体格式（从URL后缀判断）
      const format = font.url.endsWith('.woff2') ? 'woff2'
        : font.url.endsWith('.woff') ? 'woff'
          : font.url.endsWith('.ttf') ? 'truetype'
            : 'opentype';

      // 创建style标签插入@font-face
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: '${font.cssName}';
          src: url('${font.url}') format('${format}');
          font-display: swap; /* 避免字体加载时的闪烁 */
        }
      `;
      document.head.appendChild(style);
      console.log(`📥 CDN字体文件加载完成: ${font.displayName}`);
      resolve();
      return;
    }

    // 未知类型URL，直接resolve
    resolve();
  });
}

// 设置根字体大小
export function setRootFontSize(html: HTMLElement, fontSizeDisplay: HTMLElement, size: number = TARGET_FONT_SIZE): void {
  const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(size, MAX_FONT_SIZE));
  html.style.fontSize = `${clampedSize}px`;
  fontSizeDisplay.textContent = `${clampedSize}`;
  console.log(`🔤 根字体大小已设置为 ${clampedSize}px`);
}

// 更新按钮状态
export function updateButtonStates(decreaseFontSizeBtn: HTMLButtonElement, increaseFontSizeBtn: HTMLButtonElement, fontSize: number): void {
  decreaseFontSizeBtn.disabled = fontSize <= MIN_FONT_SIZE;
  increaseFontSizeBtn.disabled = fontSize >= MAX_FONT_SIZE;
}