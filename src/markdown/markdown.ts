import { Marked, Renderer, Tokens } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { showError, getElement } from '../utils/utils';
import { parseFrontMatter, MarkdownMetadata } from './overview/viewParser';
import { setupCodeCopy } from './extentions/codeCopy';
import { highlightCode } from './extentions/highlight'; // 代码高亮插件
import { markedAdmonition } from './extentions/admonition'; // Admonition插件
import { markedTabs } from './extentions/tabs'; // Tabs插件

// 初始化 marked 实例
const marked = new Marked();

marked.use(markedHighlight({
  emptyLangClass: 'hljs', // 空语言时的类名
  langPrefix: 'hljs language-', // 语言类名前缀
  highlight: (code, lang) => highlightCode(code, lang) // 你的高亮逻辑
}));

// 注册标签页和提示块扩展
marked.use(markedTabs());
marked.use(markedAdmonition());

export interface Heading {
  text: string;
  level: number;
  id: string;
}

// 定义 renderMarkdown 的返回结果类型
export interface RenderMarkdownResult {
  headings: Heading[];
  metadata: MarkdownMetadata;
}

// markdown缓存
interface MarkdownCacheItem {
  html: string;
  headings: Heading[];
  metadata: MarkdownMetadata; // 缓存元数据，避免重复解析
}

const markdownCache = new Map<string, MarkdownCacheItem>();

// 生成唯一ID（保持不变）
function generateUniqueId(raw: string, existingIds: Set<string>): string {
  let baseId = raw.trim().toLowerCase().replace(/\s+/g, '-');
  baseId = baseId.replace(/[^a-z0-9-]/g, '');
  let uniqueId = baseId;
  let counter = 1;
  while (existingIds.has(uniqueId)) {
    uniqueId = `${baseId}-${counter}`;
    counter++;
  }
  existingIds.add(uniqueId);
  return uniqueId;
}

// 创建自定义渲染器（仅处理标题和链接，代码块由插件处理）
const createCustomRenderer = (headings: Heading[]) => {
  const existingIds = new Set<string>();
  const renderer = new Renderer();

  // 处理标题
  renderer.heading = (token: Tokens.Heading) => {
    const { text, depth: level, raw } = token;
    const id = generateUniqueId(raw, existingIds);
    headings.push({ text, level, id });
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  // 处理链接
  renderer.link = function (link: Tokens.Link) {
    const { href, tokens } = link;
    const text = this.parser.parseInline(tokens);
    const isInternal = !href.startsWith('http') && href.endsWith('.md');

    return isInternal
      ? `<a href="${href}" class="internal-link">${text}</a>`
      : `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  };

  return renderer;
};

// 错误处理函数返回 RenderMarkdownResult 类型，保证返回值统一
const handleError = (
  statusContainer: HTMLElement,
  requestUrl: string,
  error: unknown
) => {
  console.error('❌ 内容渲染失败:', error);
  statusContainer.className = 'status error';
  statusContainer.innerHTML = `
    Load Failed<br>
    Reason: ${error instanceof Error ? error.message : 'Unknown error'}<br>
    Path: ${requestUrl}
  `;
  return { headings: [], metadata: {} } as RenderMarkdownResult;
};

// 返回类型改为 RenderMarkdownResult，携带 headings 和 metadata
export async function renderMarkdown(file: string): Promise<RenderMarkdownResult> {
  const statusContainer = getElement('#status', HTMLElement);
  const markdownContainer = getElement('#markdown-container', HTMLElement);
  const overviewContainer = getElement('#overview', HTMLElement);

  if (!statusContainer || !markdownContainer || !overviewContainer) {
    const errorMsg = '致命错误：缺少容器（#status 或 #markdown-container 或 #overview）';
    console.error(errorMsg);
    showError(errorMsg);
    // 返回空结果
    return { headings: [], metadata: {} };
  }

  overviewContainer.classList.add('hidden');
  overviewContainer.classList.remove('show');

  statusContainer.className = 'status loading';
  statusContainer.textContent = 'Loading Documents ...';
  markdownContainer.style.display = 'none';
  markdownContainer.innerHTML = '';
  overviewContainer.innerHTML = '';

  console.log('✅ 找到内容容器 #markdown-container 和 #overview');

  let requestUrl: string = '未知路径';
  const headings: Heading[] = [];

  try {
    if (markdownCache.has(file)) {
      const cached = markdownCache.get(file)!;
      console.log(`✅ 从缓存加载内容: ${file}`);
      statusContainer.className = 'status';
      statusContainer.textContent = '';
      markdownContainer.innerHTML = cached.html;
      markdownContainer.style.display = 'block';

      setupCodeCopy();
      // 从缓存中读取 headings 和 metadata 并返回
      return {
        headings: cached.headings,
        metadata: cached.metadata
      };
    }

    requestUrl = file.startsWith('./') ? file : `./docs/${file}`;
    console.log(`📡 开始请求文件: ${requestUrl}`);

    const response = await fetch(requestUrl);
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const rawText = await response.text();
    if (!rawText) throw new Error('File content is empty');

    // 解析 FrontMatter
    const { metadata, content } = parseFrontMatter(rawText);
    console.log('📦 元数据:', metadata);

    const renderer = createCustomRenderer(headings);
    const html = await marked.parse(content, { renderer }); // 使用配置好的 marked 实例

    if (!html) throw new Error('Parsed HTML is empty');

    // 缓存时存入 metadata，完整保存解析结果
    markdownCache.set(file, { 
      html, 
      headings, 
      metadata // 缓存元数据
    });
    markdownContainer.innerHTML = html;
    markdownContainer.style.display = 'block';
    console.log(`✅ 内容已渲染到 #markdown-container`);

    setupCodeCopy();

    // 返回 headings 和 metadata，供页内导航使用
    return {
      headings,
      metadata
    };
  } catch (error) {
    // 调用返回 RenderMarkdownResult 类型的错误处理函数
    return handleError(statusContainer, requestUrl, error);
  }
}

// 清除 Markdown 缓存
export function clearMarkdownCache(): void {
  markdownCache.clear();
  console.log('Markdown缓存已清除');
}