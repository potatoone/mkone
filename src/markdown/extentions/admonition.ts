import { marked } from 'marked';
import type { TokenizerExtension, RendererExtension, TokensList } from 'marked';

// 简单的提示块Token类型定义
interface AdmonitionToken {
  type: 'admonition';
  raw: string;
  kind: string;
  tokens: TokensList;
}

// 解析器配置 - 保持简洁
const admonitionTokenizer: TokenizerExtension = {
  name: 'admonition',
  level: 'block',
  start(src) {
    return src.match(/^:::/)?.index;
  },
  tokenizer(src) {
    // 匹配提示块语法
    const match = /^:::\s*(\w+)(?:\r?\n)?([\s\S]*?)\r?\n:::/.exec(src);
    if (!match) return;

    const [raw, kind, content] = match;
    const tokens = this.lexer.blockTokens(content.trim());

    return {
      type: 'admonition',
      raw,
      kind: kind.toLowerCase(),
      tokens: tokens as TokensList
    };
  }
};

// 渲染器配置 - 保持简洁
const admonitionRenderer: RendererExtension = {
  name: 'admonition',
  renderer(token) {
    const t = token as AdmonitionToken;
    const html = marked.parser(t.tokens);
    return `<div class="admonition ${t.kind}">${html}</div>`;
  }
};

// 扩展主函数 - 直接返回配置对象
export function markedAdmonition() {
  return {
    extensions: [admonitionTokenizer, admonitionRenderer]
  };
}
