/**
 * parser.ts 解析层单元测试（Node 环境，无 DOM 依赖）
 *
 * 运行：npm test
 * 覆盖：标题 slug、front matter、admonition 嵌套、tabs、代码高亮、
 *       footnote、任务列表、mermaid、链接分类与安全过滤
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, slugifyHeading } from './parser';

describe('slugifyHeading', () => {
  it('保留中文，空格转 -', () => {
    assert.equal(slugifyHeading('安装指南'), '安装指南');
    assert.equal(slugifyHeading('Hello World'), 'hello-world');
  });

  it('去掉 Markdown 标记符与标点', () => {
    assert.equal(slugifyHeading('**安装**指南!'), '安装指南');
    assert.equal(slugifyHeading('  Q & A  '), 'q--a');
  });

  it('空内容返回空串', () => {
    assert.equal(slugifyHeading('***'), '');
  });
});

describe('parseMarkdown：标题', () => {
  const sample = '## 安装指南\n### 安装指南\n';

  it('生成 GitHub 风格中文 id', () => {
    const { html, headings } = parseMarkdown(sample);
    assert.match(html, /<h2 id="安装指南">安装指南<\/h2>/);
    assert.deepEqual(headings[0], { text: '安装指南', level: 2, id: '安装指南' });
  });

  it('重复标题追加 -1 去重', () => {
    const { html, headings } = parseMarkdown(sample);
    assert.match(html, /<h3 id="安装指南-1">/);
    assert.equal(headings[1].id, '安装指南-1');
  });

  it('全标记符标题兜底为 heading', () => {
    const { html } = parseMarkdown('## ***\n');
    assert.match(html, /<h2 id="heading">/);
  });
});

describe('parseMarkdown：front matter', () => {
  it('剥离 front matter 并解析元数据', () => {
    const { html, metadata } = parseMarkdown('---\ntime: 2026-09-10\ndesc: 测试说明\n---\n\n正文\n');
    assert.equal(metadata.time, '2026-09-10');
    assert.equal(metadata.desc, '测试说明');
    assert.doesNotMatch(html, /time:/);
    assert.match(html, /正文/);
  });

  it('无 front matter 时 metadata 为空', () => {
    const { metadata, html } = parseMarkdown('正文\n');
    assert.deepEqual(metadata, {});
    assert.match(html, /正文/);
  });
});

describe('parseMarkdown：admonition', () => {
  it('支持嵌套', () => {
    const { html } = parseMarkdown('::: note 外层\n外层内容\n::: warning\n内层内容\n:::\n:::\n');
    assert.match(html, /<div class="admonition note">[\s\S]*?<div class="admonition warning">[\s\S]*?内层内容[\s\S]*?<\/div>[\s\S]*?<\/div>/);
  });

  it('支持自定义标题', () => {
    const { html } = parseMarkdown('::: note 注意事项\n内容\n:::\n');
    assert.match(html, /<div class="admonition-title">注意事项<\/div>/);
  });

  it('未闭合时按普通段落解析', () => {
    const { html } = parseMarkdown('::: note\n未闭合内容\n');
    assert.match(html, /::: note/);
  });
});

describe('parseMarkdown：tabs', () => {
  it('渲染 tab 容器并转义标题', () => {
    const { html } = parseMarkdown('+++tabs\n@tab 安装 <b>x</b>\n内容A\n@tab 使用\n内容B\n+++\n');
    assert.match(html, /<div class="tab-container">/);
    assert.match(html, /安装 &lt;b&gt;x&lt;\/b&gt;/);
    assert.match(html, /内容A[\s\S]*内容B/);
  });

  it('未闭合时按普通文本解析', () => {
    const { html } = parseMarkdown('+++tabs\n@tab A\n内容\n');
    assert.doesNotMatch(html, /tab-container/);
  });
});

describe('parseMarkdown：代码块', () => {
  it('已注册语言正常高亮', () => {
    const { html } = parseMarkdown('```python\nprint("hi")\n```\n');
    assert.match(html, /<pre><code class="hljs language-python">[\s\S]*hljs-(?:keyword|built_in|title)/);
  });

  it('mermaid 保留原文，不被 highlightAuto 污染', () => {
    const { html } = parseMarkdown('```mermaid\ngraph LR; A-->B;\n```\n');
    assert.match(html, /<pre><code class="hljs language-mermaid">graph LR; A--&gt;B;/);
  });
});

describe('parseMarkdown：footnote', () => {
  it('生成脚注引用与脚注区', () => {
    const { html } = parseMarkdown('断言[^1]。\n\n[^1]: 来源说明。\n');
    assert.match(html, /断言/);
    assert.match(html, /来源说明/);
    assert.match(html, /data-footnote-ref|footnote-ref|class="footnotes"|data-footnotes/i);
  });
});

describe('parseMarkdown：任务列表', () => {
  it('为含复选框的列表补充 task-list 类', () => {
    const { html } = parseMarkdown('- [x] 已完成\n- [ ] 未完成\n');
    assert.match(html, /<(ul|ol) class="task-list">[\s\S]*type="checkbox"/);
    assert.match(html, /checked=""[\s\S]*未完成/);
  });

  it('普通列表不加 task-list 类', () => {
    const { html } = parseMarkdown('- 普通项\n');
    assert.doesNotMatch(html, /task-list/);
  });
});

describe('parseMarkdown：链接', () => {
  it('http(s) 外链新窗口打开', () => {
    const { html } = parseMarkdown('[官网](https://example.com)\n');
    assert.match(html, /<a href="https:\/\/example\.com" target="_blank" rel="noopener">官网<\/a>/);
  });

  it('页内锚点使用 anchor-link', () => {
    const { html } = parseMarkdown('[跳转](#安装指南)\n');
    assert.match(html, /<a href="#安装指南" class="anchor-link">跳转<\/a>/);
  });

  it('.md 文档链接（含锚点）使用 internal-link', () => {
    const { html } = parseMarkdown('[文档](guide.md)\n[文档](guide.md#安装指南)\n');
    assert.match(html, /<a href="guide\.md" class="internal-link">文档<\/a>/);
    assert.match(html, /<a href="guide\.md#安装指南" class="internal-link">文档<\/a>/);
  });

  it('相对资源链接新窗口打开（避免改写 hash 路由）', () => {
    const { html } = parseMarkdown('[压缩包](./docs/a/b.assets/PLG.zip)\n');
    assert.match(html, /<a href="\.\/docs\/a\/b\.assets\/PLG\.zip" target="_blank" rel="noopener">压缩包<\/a>/);
  });

  it('透传 title 属性并转义', () => {
    const { html } = parseMarkdown('[链接](https://example.com "Say \\"Hi\\"")\n');
    assert.match(html, /title="Say &quot;Hi&quot;"/);
  });

  it('拦截 javascript: 等危险协议', () => {
    const { html } = parseMarkdown('[x](javascript:alert(1))\n[vbs](vbscript:msgbox)\n');
    assert.doesNotMatch(html, /href="javascript:/i);
    assert.doesNotMatch(html, /href="vbscript:/i);
    assert.match(html, /x/);
  });
});

describe('parseMarkdown：缓存无关性', () => {
  it('同一实例多次解析互不污染标题收集', () => {
    parseMarkdown('# A1\n');
    const first = parseMarkdown('# B1\n');
    assert.deepEqual(first.headings, [{ text: 'B1', level: 1, id: 'b1' }]);
    const second = parseMarkdown('# A1\n');
    assert.equal(second.headings[0].id, 'a1');
  });
});
