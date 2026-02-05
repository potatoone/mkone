import { FontConfig } from '../../utils/types';

export const FONT_STORAGE_KEYS = {
    selectedFont: 'user-selected-font',
    fontOptions: 'saved-font-options',
} as const;

export class FontLoader {
    private loadedUrls = new Set<string>();

    async load(font: FontConfig) {
        if (!font.url || this.loadedUrls.has(font.url)) return;

        // 简化的 CSS/字体文件判断与加载
        if (font.url.toLowerCase().includes('.css')) {
            await this.insertLink(font.url);
        } else {
            this.insertStyle(font);
        }
        
        if ('fonts' in document) await document.fonts.load(`1em "${font.cssName}"`);
        this.loadedUrls.add(font.url);
    }

    private insertLink(url: string): Promise<void> {
        return new Promise(resolve => {
            if (document.querySelector(`link[href="${url}"]`)) return resolve();
            const link = document.createElement('link');
            Object.assign(link, { rel: 'stylesheet', href: url, onload: resolve, onerror: resolve });
            document.head.appendChild(link);
        });
    }

    private insertStyle(font: FontConfig) {
        if (document.getElementById(`font-${font.cssName}`)) return;
        const style = document.createElement('style');
        style.id = `font-${font.cssName}`;
        style.textContent = `@font-face { font-family: '${font.cssName}'; src: url('${font.url}'); font-display: swap; }`;
        document.head.appendChild(style);
    }
}

export class FontConfigManager {
    private fontLoader = new FontLoader();
    private fontList: FontConfig[] = [];
    private currentFont: FontConfig | null = null;

    // 核心精简：快速应用变量，不阻塞初始化
    async init(htmlElement: HTMLElement): Promise<FontConfig | null> {
        const saved = localStorage.getItem(FONT_STORAGE_KEYS.selectedFont);
        if (saved) {
            this.currentFont = JSON.parse(saved);
            this.apply(htmlElement, this.currentFont!);
            // 异步加载文件，不 await
            this.fontLoader.load(this.currentFont!).catch(() => {});
        }
        
        // 后台更新列表，不影响首屏
        this.loadFontList().catch(() => {});
        return this.currentFont;
    }

    private apply(el: HTMLElement, font: FontConfig) {
        el.style.setProperty('--body-font', `'${font.cssName}', sans-serif`);
    }

    async selectFont(font: FontConfig, htmlElement: HTMLElement) {
        await this.fontLoader.load(font);
        this.currentFont = font;
        this.apply(htmlElement, font);
        localStorage.setItem(FONT_STORAGE_KEYS.selectedFont, JSON.stringify(font));
    }

    async loadFontList(): Promise<FontConfig[]> {
        try {
            const res = await fetch('./config/fonts.json');
            const remote: FontConfig[] = await res.json();
            // 合并本地与远程并去重
            this.fontList = Array.from(new Map([...remote, ...this.getStoredFonts()].map(f => [f.cssName, f])).values());
            localStorage.setItem(FONT_STORAGE_KEYS.fontOptions, JSON.stringify(this.fontList));
        } catch {
            this.fontList = this.getStoredFonts();
        }
        return this.fontList;
    }

    private getStoredFonts(): FontConfig[] {
        return JSON.parse(localStorage.getItem(FONT_STORAGE_KEYS.fontOptions) || '[]');
    }

    getCurrentFont() { return this.currentFont; }
    getFontList() { return this.fontList.length ? this.fontList : this.getStoredFonts(); }
}