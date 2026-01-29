// font.ts
import { FontConfig } from '../../utils/types'; // 导入配置类型

// 字体相关本地存储Key（抽离到这里，职责统一）
export const FONT_STORAGE_KEYS = {
    selectedFont: 'user-selected-font',
    fontOptions: 'saved-font-options',
} as const;

// 字体加载器（原有逻辑保留，优化少量注释）
export class FontLoader {
    private loadedUrls = new Set<string>();

    async load(font: FontConfig) {
        if (!font.url || this.loadedUrls.has(font.url)) return;

        if (this.isCss(font.url)) {
            await this.loadCss(font.url, font.cssName);
        } else {
            await this.loadFontFile(font);
            await document.fonts.load(`1em "${font.cssName}"`);
        }

        this.loadedUrls.add(font.url);
    }

    private isCss(url: string) {
        return url.endsWith('.css');
    }

    private async loadCss(url: string, fontFamily?: string): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;

            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`CSS 加载失败: ${url}`));

            document.head.appendChild(link);
        });

        // 显式等待字体可用
        if (fontFamily && 'fonts' in document) {
            try {
                await document.fonts.load(`1em "${fontFamily}"`);
                await document.fonts.ready;
            } catch {
                // 忽略字体加载超时/失败，使用兜底字体
            }
        }
    }

    private loadFontFile(font: FontConfig): Promise<void> {
        return new Promise((resolve) => {
            const ext = font.url!.split('.').pop() || '';
            const formatMap: Record<string, string> = {
                woff2: 'woff2',
                woff: 'woff',
                ttf: 'truetype',
                otf: 'opentype'
            };

            const style = document.createElement('style');
            style.textContent = `
        @font-face {
          font-family: '${font.cssName}';
          src: url('${font.url}') format('${formatMap[ext] || 'opentype'}');
          font-display: swap;
        }
      `;
            document.head.appendChild(style);
            resolve();
        });
    }
}

// 字体配置管理工具（封装字体相关业务逻辑，解耦layout.ts）
export class FontConfigManager {
    private fontLoader: FontLoader;
    private fontList: FontConfig[] = [];
    private currentFont: FontConfig | null = null;

    constructor() {
        this.fontLoader = new FontLoader();
    }

    /**
     * 加载字体列表（远程+本地缓存，去重）
     */
    async loadFontList(): Promise<FontConfig[]> {
        const localSaved = localStorage.getItem(FONT_STORAGE_KEYS.fontOptions);
        const localFonts: FontConfig[] = localSaved ? JSON.parse(localSaved) : [];

        try {
            const response = await fetch('./config/fonts.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const remoteFonts: FontConfig[] = await response.json();
            // 去重：远程字体优先，本地字体补充（不重复）
            this.fontList = [...remoteFonts];
            localFonts.forEach(local => {
                if (!this.fontList.some(remote => remote.cssName === local.cssName)) {
                    this.fontList.push(local);
                }
            });
            // 缓存最新字体列表
            localStorage.setItem(FONT_STORAGE_KEYS.fontOptions, JSON.stringify(this.fontList));
        } catch (err) {
            console.warn('⚠️ 远程字体配置加载失败，使用本地缓存', err);
            this.fontList = localFonts.length > 0 ? localFonts : [
                { displayName: '系统默认', cssName: 'sans-serif' }
            ];
        }

        // 恢复上次选中的字体
        this.restoreSelectedFont();
        return this.fontList;
    }

    /**
     * 选择并应用指定字体
     */
    async selectFont(font: FontConfig, htmlElement: HTMLElement): Promise<void> {
        await this.fontLoader.load(font);
        this.currentFont = font;
        // 应用CSS变量
        htmlElement.style.setProperty('--body-font', `'${font.cssName}'`);
        // 缓存选中状态
        localStorage.setItem(FONT_STORAGE_KEYS.selectedFont, JSON.stringify(font));
    }

    /**
     * 恢复上次选中的字体
     */
    restoreSelectedFont(): FontConfig | null {
        const saved = localStorage.getItem(FONT_STORAGE_KEYS.selectedFont);
        if (!saved && this.fontList.length > 0) {
            this.currentFont = this.fontList[0];
            return this.currentFont;
        }

        try {
            const savedFont = JSON.parse(saved!) as FontConfig;
            const matched = this.fontList.find(f => f.cssName === savedFont.cssName);
            if (matched) {
                this.currentFont = matched;
                return this.currentFont;
            }
        } catch (err) {
            console.warn('解析字体配置失败', err);
        }

        return null;
    }

    /**
     * 获取当前字体
     */
    getCurrentFont(): FontConfig | null {
        return this.currentFont;
    }

    /**
     * 获取字体列表
     */
    getFontList(): FontConfig[] {
        return [...this.fontList];
    }
}