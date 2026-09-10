/**
 * Mermaid 图表渲染
 *
 * 将 ```mermaid 代码块替换为渲染后的 SVG 图表：
 * - 懒加载 mermaid 库（动态 import，不占用首屏体积）
 * - 渲染完成后代码块位置显示流程图 / 时序图 / 甘特图等
 * - 语法错误时在控制台输出，不影响页面其它内容
 */

const CONTAINER_ID = 'markdown-container';

type MermaidModule = typeof import('mermaid');

let mermaidPromise: Promise<MermaidModule['default']> | null = null;

function loadMermaid(): Promise<MermaidModule['default']> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(m => {
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: document.documentElement.hasAttribute('theme-dark') ? 'dark' : 'default'
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * 初始化 Mermaid 图表（在 Markdown 渲染完成后调用）
 */
export async function setupMermaid(): Promise<void> {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // marked-highlight 产物：<pre><code class="hljs language-mermaid">...</code></pre>
  const blocks = container.querySelectorAll<HTMLElement>('pre > code.language-mermaid');
  if (!blocks.length) return;

  const mermaid = await loadMermaid();

  // 先替换为 mermaid 容器（textContent 自动还原转义实体，得到原始图表源码）
  const nodes: HTMLElement[] = [];
  blocks.forEach(code => {
    const pre = code.parentElement;
    if (!pre) return;
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = code.textContent || '';
    pre.replaceWith(div);
    nodes.push(div);
  });

  try {
    await mermaid.run({ nodes });
  } catch (error) {
    console.error('Mermaid 图表渲染失败:', error);
  }
}
