/**
 * 轻量 i18n
 *
 * - 语言偏好保存在浏览器存储（LOCALE_STORAGE_KEY），首次访问按浏览器语言推断
 * - 静态文案：在 HTML 上标 data-i18n / data-i18n-title / data-i18n-tooltip，
 *   调用 applyI18n() 统一写入
 * - 动态文案：ts 中调用 t('key')；配置数据（如 fonts.json 的字体名）支持
 *   { zh, en } 结构，用 localize() 取值
 * - 切换语言后：写入存储 → 应用静态文案 → 通知订阅者重渲染动态部分
 */

export type Locale = 'zh' | 'en';

/** 可本地化的文本：直接字符串，或按语言分列的对象 */
export type LocalizedText = string | { zh: string; en: string };

export const LOCALE_STORAGE_KEY = 'mkone-locale';

/** 词典：key → { zh, en } */
const MESSAGES = {
  // ---------- 顶栏按钮 ----------
  'topbar.search': { zh: '搜索', en: 'Search' },
  'topbar.layout': { zh: '布局', en: 'Layout' },
  'topbar.export': { zh: '导出', en: 'Export' },
  'topbar.theme': { zh: '切换主题', en: 'Switch theme' },
  'topbar.prev': { zh: '上一页', en: 'Previous page' },
  'topbar.next': { zh: '下一页', en: 'Next page' },
  'topbar.noPrev': { zh: '没有上一页', en: 'No previous page' },
  'topbar.noNext': { zh: '没有下一页', en: 'No next page' },
  'topbar.prevTip': { zh: '上一页: {0}', en: 'Previous: {0}' },
  'topbar.nextTip': { zh: '下一页: {0}', en: 'Next: {0}' },
  'resize.sidebar': { zh: '拖拽调整侧栏宽度（双击复位）', en: 'Drag to resize sidebar (double-click to reset)' },
  'resize.pageNav': { zh: '拖拽调整页内导航宽度（双击复位）', en: 'Drag to resize outline (double-click to reset)' },

  // ---------- 布局面板 ----------
  'layout.fontSize': { zh: '字体大小', en: 'Font size' },
  'layout.selectFont': { zh: '选择字体', en: 'Font' },
  'layout.hidePageNav': { zh: '隐藏页内导航', en: 'Hide outline' },
  'layout.contentPadding': { zh: '内容边距', en: 'Content padding' },
  'layout.language': { zh: '语言', en: 'Language' },

  // ---------- 导出面板 ----------
  'export.copyMarkdown': { zh: '复制 Markdown', en: 'Copy Markdown' },
  'export.html': { zh: '导出 HTML', en: 'Export HTML' },
  'export.print': { zh: '打印', en: 'Print' },
  'export.copiedMarkdown': { zh: 'Markdown 内容已复制到剪贴板', en: 'Markdown copied to clipboard' },
  'export.copyFailed': { zh: '复制失败，请手动复制', en: 'Copy failed, please copy manually' },
  'export.htmlExported': { zh: 'HTML 文件已导出', en: 'HTML file exported' },
  'export.exportFailed': { zh: '导出失败，请重试', en: 'Export failed, please try again' },
  'export.printFailed': { zh: '打印失败，请重试', en: 'Print failed, please try again' },

  // ---------- 主题面板 ----------
  'theme.nightMode': { zh: '夜间模式', en: 'Night mode' },
  'theme.themeColors': { zh: '主题颜色', en: 'Theme color' },
  'theme.classic': { zh: '经典主题', en: 'Classic' },
  'theme.gray': { zh: '灰色主题', en: 'Gray' },
  'theme.book': { zh: '书本主题', en: 'Book' },
  'theme.green': { zh: '绿色主题', en: 'Green' },
  'theme.purple': { zh: '紫色主题', en: 'Purple' },
  'theme.rose': { zh: '玫红主题', en: 'Rose' },

  // ---------- 页内导航（On This Page） ----------
  'nav.title': { zh: 'On This Page', en: 'On This Page' },
  'nav.toggleTip': { zh: '点击展开 / 收起全部标题', en: 'Click to expand / collapse all headings' },
  'nav.expandTip': { zh: '点击展开全部标题', en: 'Click to expand all headings' },
  'nav.collapseTip': { zh: '点击收起全部标题', en: 'Click to collapse all headings' },

  // ---------- 目录概览（Outline） ----------
  'outline.title': { zh: 'Outline', en: 'Outline' },
  'outline.viewOverview': { zh: '概览', en: 'Overview' },
  'outline.viewTime': { zh: '更新时间', en: 'Updated' },
  'outline.viewName': { zh: 'A-Z', en: 'A-Z' },
  'outline.defaultDesc': { zh: '该目录包含文档列表，可通过菜单切换排序方式', en: 'This folder contains documents; use the menu to change sorting.' },
  'outline.noDesc': { zh: '无描述', en: 'No description' },
  'outline.noTime': { zh: '无时间标记', en: 'No time mark' },

  // ---------- 表格右键菜单 ----------
  'table.copyCell': { zh: '复制单元格', en: 'Copy cell' },
  'table.copyRow': { zh: '复制整行', en: 'Copy row' },
  'table.copyColumn': { zh: '复制整列', en: 'Copy column' },
  'table.copyTable': { zh: '复制全表', en: 'Copy table' },
  'table.copied': { zh: '已复制{0}', en: 'Copied {0}' },
  'table.targetCell': { zh: '单元格', en: 'cell' },
  'table.targetRow': { zh: '整行', en: 'row' },
  'table.targetColumn': { zh: '整列', en: 'column' },
  'table.targetTable': { zh: '全表', en: 'table' },
  'table.copyFailed': { zh: '复制失败，请手动选择复制', en: 'Copy failed, please copy manually' },

  // ---------- 搜索 ----------
  'search.placeholder': { zh: '搜索全部文档…', en: 'Search all documents…' },
  'search.searching': { zh: '正在搜索…', en: 'Searching…' },
  'search.failed': { zh: '搜索失败，请重试', en: 'Search failed, please try again' },
  'search.noResults': { zh: '未找到与「{0}」相关的文档', en: 'No documents matching “{0}”' },
  'search.hitCount': { zh: '{0} 处', en: '{0} hits' },
  'search.matched': { zh: '共 {0} 篇文档匹配「{1}」', en: '{0} documents matched “{1}”' },
  'search.indexed': { zh: '已索引 {0} 篇文档，输入关键词搜索', en: '{0} documents indexed. Type to search' },

  // ---------- 提示与错误 ----------
  'msg.docNotFound': { zh: '目标文档不存在（可能已被删除或重命名）', en: 'Document not found (it may have been deleted or renamed)' },
  'msg.loadFailed': { zh: '加载失败: {0}', en: 'Load failed: {0}' },
  'msg.sidebarLoadFailed': { zh: '加载页面失败: {0}', en: 'Failed to load page: {0}' },
  'msg.historyLoadFailed': { zh: '加载历史页面失败: {0}', en: 'Failed to load history page: {0}' },
  'msg.firstPage': { zh: '已经是第一页', en: 'Already the first page' },
  'msg.lastPage': { zh: '已经是最后一页', en: 'Already the last page' },
  'msg.noReloadPage': { zh: '没有可重新加载的页面', en: 'No page to reload' },
  'msg.appInitFailed': { zh: '应用初始化失败，请刷新页面重试', en: 'Failed to initialize the app, please refresh the page' },
  'msg.done': { zh: '完成', en: 'Done' }
} as const;

export type MessageKey = keyof typeof MESSAGES;

let currentLocale: Locale = 'zh';
let initialized = false;
const listeners: ((locale: Locale) => void)[] = [];

/** 从存储 / 浏览器语言推断初始语言 */
function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/** 当前语言 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * 取翻译文案
 * @param key 词典键
 * @param vars 占位符变量，按 {0} {1} … 顺序替换
 */
export function t(key: MessageKey, vars?: (string | number)[]): string {
  const entry = MESSAGES[key];
  let text: string = entry ? entry[currentLocale] : key;
  if (vars?.length) {
    vars.forEach((value, index) => {
      text = text.replace(`{${index}}`, String(value));
    });
  }
  return text;
}

/** 解析可本地化数据（支持 { zh, en } 或直接字符串） */
export function localize(value: LocalizedText | undefined | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[currentLocale] ?? value.zh ?? value.en ?? '';
}

/**
 * 把静态文案写入 DOM：
 * - data-i18n：元素文本
 * - data-i18n-title：title 属性
 * - data-i18n-tooltip：data-tooltip 属性（走全局 tooltip）
 * - data-i18n-aria：aria-label 属性
 */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n as MessageKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle as MessageKey));
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-tooltip]').forEach(el => {
    el.setAttribute('data-tooltip', t(el.dataset.i18nTooltip as MessageKey));
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as MessageKey));
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder as MessageKey));
  });
}

/** 订阅语言变化（用于动态内容重渲染） */
export function onLocaleChange(callback: (locale: Locale) => void): void {
  listeners.push(callback);
}

/** 切换语言：持久化 → 应用静态文案 → 通知订阅者 */
export function setLocale(locale: Locale): void {
  if (locale !== 'zh' && locale !== 'en') return;

  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 存储不可用时仅本次会话生效
  }

  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  applyI18n();
  listeners.forEach(cb => cb(locale));
}

/** 初始化（幂等）：读取偏好并应用一次 */
export function initI18n(): Locale {
  if (initialized) return currentLocale;
  initialized = true;

  currentLocale = detectLocale();
  document.documentElement.lang = currentLocale === 'zh' ? 'zh-CN' : 'en';
  applyI18n();
  return currentLocale;
}
