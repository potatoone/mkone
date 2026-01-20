import { marked } from 'marked';
import type { TokenizerExtension, RendererExtension, TokensList, Token } from 'marked';

// 自定义 token 类型
interface TabsToken {
  type: 'tabs';
  raw: string;
  tabs: {
    title: string;
    tokens: TokensList; // ✅ 必须是 TokensList
  }[];
}

// Tokenizer
const tabsTokenizer: TokenizerExtension = {
  name: 'tabs',
  level: 'block',
  start(src) {
    return src.match(/^===\s*tabs\s*$/m)?.index;
  },
  tokenizer(src) {
    const match = /^===\s*tabs\s*\n([\s\S]+?)\n===/.exec(src);
    if (!match) return;

    const raw = match[0];
    const inner = match[1].trim();

    const tabBlocks = inner.split(/^@tab\s+/m).slice(1);
    const tabs = tabBlocks.map(block => {
      const [titleLine, ...contentLines] = block.split(/\r?\n/);
      const title = titleLine.trim();
      const content = contentLines.join('\n').trim();
      const tokens = this.lexer.blockTokens(content); // TokensList 类型
      return { title, tokens };
    });

    return {
      type: 'tabs',
      raw,
      tabs
    } as TabsToken;
  }
};

// Renderer
const tabsRenderer: RendererExtension = {
  name: 'tabs',
  // 关键：指定 renderer 的 this 类型为 RendererThis，获取当前实例上下文
  renderer(this: any, token) {  // 添加 this 参数
    const t = token as TabsToken;

    const headers = t.tabs.map((tab, i) =>
      `<button class="tab-header${i === 0 ? ' active' : ''}" data-index="${i}">${tab.title}</button>`
    ).join('');

    // ✅ 使用当前实例的 parser，继承所有插件配置（包括高亮）
    const contents = t.tabs.map((tab, i) =>
      `<div class="tab-content${i === 0 ? ' active' : ''}">${this.parser.parse(tab.tokens)}</div>`
    ).join('');

    return `
<div class="tab-container">
  <div class="tab-headers">${headers}</div>
  <div class="tab-contents">${contents}</div>
</div>
`;
  }
};

// 插件导出
export function markedTabs() {
  return {
    extensions: [tabsTokenizer, tabsRenderer]
  };
}

document.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('tab-header')) {
    const container = target.closest('.tab-container');
    if (!container) return;

    container.querySelectorAll<HTMLElement>('.tab-header, .tab-content').forEach(el => el.classList.remove('active'));
    target.classList.add('active');

    const idxStr = target.getAttribute('data-index');
    if (!idxStr) return;
    const idx = parseInt(idxStr, 10);
    if (isNaN(idx)) return;

    const contents = container.querySelectorAll<HTMLElement>('.tab-content');
    const content = contents[idx];
    if (content) content.classList.add('active');
  }
});

