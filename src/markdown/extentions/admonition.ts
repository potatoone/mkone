import type { TokenizerExtension, RendererExtension, TokensList } from 'marked';

// 简单的提示块Token类型定义
interface AdmonitionToken {
  type: 'admonition';
  raw: string;
  kind: string;
  title?: string;
  tokens: TokensList;
}

// 开块：::: kind [自定义标题]
const openingRe = /^:::\s*(\w+)(?:[ \t]+([^\r\n]*))?[ \t]*(?:\r?\n|$)/;
// 嵌套开块行（含 kind，避免误判闭块）
const nestedOpenRe = /^:::\s*\w+/;
// 闭块行（仅 :::）
const closeRe = /^:::\s*[ \t]*$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 按行扫描确定块边界，支持任意层级嵌套
function findBlockRange(lines: string[]): number {
  let depth = 1;
  for (let i = 1; i < lines.length; i++) {
    if (nestedOpenRe.test(lines[i])) {
      depth++;
    } else if (closeRe.test(lines[i])) {
      depth--;
      if (depth === 0) return i; // 返回闭块行索引
    }
  }
  return -1; // 未闭合
}

// 解析器配置
const admonitionTokenizer: TokenizerExtension = {
  name: 'admonition',
  level: 'block',
  start(src) {
    return src.match(/^:::/m)?.index;
  },
  tokenizer(src) {
    const open = openingRe.exec(src);
    if (!open) return;

    const lines = src.split(/\r?\n/);
    const closeIndex = findBlockRange(lines);
    if (closeIndex === -1) return; // 未闭合：不吞掉，交回普通段落解析

    const raw = lines.slice(0, closeIndex + 1).join('\n');
    const content = lines.slice(1, closeIndex).join('\n').trim();
    // 用当前 lexer 递归解析内容（嵌套的 admonition 也会被正确处理）
    const tokens = this.lexer.blockTokens(content);

    return {
      type: 'admonition',
      raw,
      kind: open[1].toLowerCase(),
      title: open[2]?.trim() || undefined,
      tokens: tokens as TokensList
    };
  }
};

// 渲染器配置
const admonitionRenderer: RendererExtension = {
  name: 'admonition',
  renderer(token) {
    const t = token as AdmonitionToken;
    // 使用当前实例的 parser，继承所有插件配置（高亮、嵌套 admonition 等）
    const html = this.parser.parse(t.tokens);
    const title = t.title
      ? `<div class="admonition-title">${escapeHtml(t.title)}</div>`
      : '';
    return `<div class="admonition ${t.kind}">${title}${html}</div>`;
  }
};

// 扩展主函数 - 直接返回配置对象
export function markedAdmonition() {
  return {
    extensions: [admonitionTokenizer, admonitionRenderer]
  };
}
