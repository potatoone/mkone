/**
 * Markdown 解析层（纯逻辑，不接触 DOM / 页面 UI）
 *
 * 职责：
 * - marked 实例与全部扩展注册
 * - 标题 slug 生成与去重
 * - HTML / metadata 缓存（含 ETag / Last-Modified 条件请求校验）
 * - parseMarkdown：原始文本 → { html, headings, metadata }
 * - loadMarkdownFile：按路径取文档（缓存命中 / 304 / 重新解析）
 *
 * 页面状态（状态条、容器显隐、渲染后处理）由 markdown.ts 编排。
 */

import { Marked, Renderer, Tokens } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedFootnote from 'marked-footnote';
import { parseFrontMatter, MarkdownMetadata } from './overview/viewParser';
import { highlightCode } from './extentions/highlight';
import { markedAdmonition } from './extentions/admonition';
import { markedTabs } from './extentions/tabs';

export interface Heading {
  text: string;
  level: number;
  id: string;
}

// 解析结果类型（导航/编排层使用）
export interface RenderMarkdownResult {
  headings: Heading[];
  metadata: MarkdownMetadata;
}

// 完整解析产物（含 HTML）
export type ParsedDocument = RenderMarkdownResult & { html: string };

// markdown缓存
interface MarkdownCacheItem extends ParsedDocument {
  etag?: string; // HTTP 校验器，用于条件请求判断缓存是否过期
  lastModified?: string;
}

// 初始化 marked 实例
const marked = new Marked();

marked.use(markedHighlight({
  emptyLangClass: 'hljs', // 空语言时的类名
  langPrefix: 'hljs language-', // 语言类名前缀
  highlight: (code, lang) => highlightCode(code, lang) // 高亮逻辑
}));

// 注册标签页、提示块和脚注扩展
marked.use(markedTabs());
marked.use(markedAdmonition());
marked.use(markedFootnote());

// 当前文档的标题收集容器（渲染为单线程，parse 前重置）
let currentHeadings: Heading[] = [];
const existingIds = new Set<string>();

// GitHub 风格 slug：保留中文等 Unicode 字母/数字，空格转 -，去掉标记符与标点
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')             // 去掉行内 HTML 标签
    .replace(/[`*_~[\]()!#]/g, '')       // 去掉常见 Markdown 标记符
    .replace(/[^\p{L}\p{N}_\- ]/gu, '')  // 仅保留 Unicode 字母/数字/下划线/连字符/空格
    .replace(/\s/g, '-');
}

// 生成唯一ID（重复时追加 -1、-2 …，与 GitHub 行为一致）
function generateUniqueId(raw: string, existingIds: Set<string>): string {
  const baseId = slugifyHeading(raw) || 'heading';
  let uniqueId = baseId;
  let counter = 1;
  while (existingIds.has(uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
  }
  existingIds.add(uniqueId);
  return uniqueId;
}

// 自定义渲染：标题/链接/任务列表（代码块由 marked-highlight 处理）
// 注意：必须通过 marked.use 注册，不能在 parse 时传 renderer ——
// 后者会整体替换实例渲染器，顶掉 marked-highlight 注册的 code 渲染器导致高亮失效
marked.use({
  renderer: {
    heading(this: Renderer, token: Tokens.Heading) {
      const { depth: level, tokens } = token;
      // token.text 是标题的原始文本（可能含 **加粗** 等标记），
      // 必须走行内解析才能正确渲染，否则标记符会原样显示在页面上
      const html = this.parser.parseInline(tokens);
      // 纯文本版本：用于锚点 id 与侧栏/页内导航显示
      const plain = html
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      const id = generateUniqueId(plain, existingIds);
      currentHeadings.push({ text: plain, level, id });
      return `<h${level} id="${id}">${html}</h${level}>`;
    },

    // 任务列表：marked 默认不给 ul/ol 加 task-list 类，这里补上以配合样式
    list(this: Renderer, token: Tokens.List) {
      const html = Renderer.prototype.list.call(this, token);
      return token.items.some(item => item.task)
        ? html.replace(/^<(ul|ol)/, '<$1 class="task-list"')
        : html;
    },

    link(this: Renderer, link: Tokens.Link) {
      const { href, tokens, title } = link;
      const text = this.parser.parseInline(tokens);
      const safeHref = (href || '').replace(/"/g, '%22');
      const titleAttr = title ? ` title="${title.replace(/"/g, '&quot;')}"` : '';

      // 阻止 javascript: 等危险协议（仅放行 http/https/mailto 及相对链接）
      const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(safeHref);
      const isSafeProtocol = /^(https?:|mailto:)/i.test(safeHref);
      if (hasProtocol && !isSafeProtocol) return text;

      // 页内锚点（#section）
      if (safeHref.startsWith('#')) {
        return `<a href="${safeHref}" class="anchor-link"${titleAttr}>${text}</a>`;
      }

      // 站外 http/https 链接：新窗口打开
      if (/^https?:\/\//i.test(safeHref)) {
        return `<a href="${safeHref}" target="_blank" rel="noopener"${titleAttr}>${text}</a>`;
      }

      // 站内文档链接（可带锚点，如 xxx.md#section）
      if (/\.md(#|$)/i.test(safeHref)) {
        return `<a href="${safeHref}" class="internal-link"${titleAttr}>${text}</a>`;
      }

      // 其余相对链接（资源等）：新窗口打开
      // 应用采用 hash 路由且按 ./docs/... 相对当前地址取文档，
      // 若在本标签页跳转到资源会改写 pathname，导致后续文档请求路径错乱
      return `<a href="${safeHref}" target="_blank" rel="noopener"${titleAttr}>${text}</a>`;
    }
  }
});

// HTML 缓存
const markdownCache = new Map<string, MarkdownCacheItem>();

// metadata 缓存（供概览等场景复用，与 html 缓存分离）
const metadataCache = new Map<string, MarkdownMetadata>();

// 解析文档路径为请求地址
function resolveDocUrl(file: string): string {
  return file.startsWith('./') ? file : `./docs/${file}`;
}

/**
 * 纯解析：原始 Markdown 文本 → 渲染结果（不含 front matter 剥离以外的任何副作用）
 */
export function parseMarkdown(rawText: string): ParsedDocument {
  // 解析 FrontMatter
  const { metadata, content } = parseFrontMatter(rawText);

  // 重置当前文档的标题收集
  currentHeadings = [];
  existingIds.clear();

  const html = marked.parse(content) as string;

  return {
    html,
    headings: currentHeadings,
    metadata
  };
}

/**
 * 按路径加载文档：缓存命中 / 条件请求 304 / 重新解析
 * 失败时抛出错误，由 UI 层决定错误呈现方式
 */
export async function loadMarkdownFile(file: string): Promise<ParsedDocument> {
  const requestUrl = resolveDocUrl(file);

  const cached = markdownCache.get(file);

  // 条件请求：携带 ETag / Last-Modified 校验缓存是否过期（304 = 缓存仍有效）
  const headers: Record<string, string> = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

  const response = await fetch(requestUrl, { headers });

  // 缓存未过期：直接使用缓存内容（文件更新后会走 200 路径重新解析）
  if (cached && response.status === 304) {
    return { headings: cached.headings, metadata: cached.metadata, html: cached.html };
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const rawText = await response.text();
  if (!rawText) throw new Error('File content is empty');

  const result = parseMarkdown(rawText);
  if (!result.html) throw new Error('Parsed HTML is empty');

  // 缓存时存入完整结果和 HTTP 校验器，供下次条件请求使用
  markdownCache.set(file, {
    html: result.html,
    headings: result.headings,
    metadata: result.metadata,
    etag: response.headers.get('etag') ?? undefined,
    lastModified: response.headers.get('last-modified') ?? undefined
  });

  return result;
}

/**
 * 获取文档元数据：优先读缓存，未命中时仅请求一次
 */
export async function getMetadata(file: string): Promise<MarkdownMetadata> {
  const cached = markdownCache.get(file);
  if (cached) return cached.metadata;

  const metaCached = metadataCache.get(file);
  if (metaCached) return metaCached;

  try {
    const res = await fetch(resolveDocUrl(file));
    if (!res.ok) return {};
    const { metadata } = parseFrontMatter(await res.text());
    metadataCache.set(file, metadata);
    return metadata;
  } catch (error) {
    console.error('加载元数据失败:', file, error);
    return {};
  }
}

// 清除 Markdown 缓存
export function clearMarkdownCache(): void {
  markdownCache.clear();
  metadataCache.clear();
}
