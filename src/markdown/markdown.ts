/**
 * Markdown 渲染编排层（UI 状态）
 *
 * 职责：
 * - 页面状态条（loading / 错误）与容器显隐
 * - 调用解析层（parser.ts）取得 HTML 并注入容器
 * - 渲染后处理：Mermaid 图表、标题折叠、代码复制
 *
 * 解析、缓存、网络请求均在 parser.ts（纯逻辑层）。
 */

import { showError, getElement } from '../utils/utils';
import { loadMarkdownFile, clearMarkdownCache } from './parser';
import type { Heading, RenderMarkdownResult } from './parser';
import { setupCodeCopy } from './extentions/codeCopy';
import { setupFoldableHeadings } from './extentions/foldableHeadings'; // 标题折叠插件
import { setupMermaid } from './extentions/mermaidDiagram'; // Mermaid图表插件
import { setupTabsInteraction } from './extentions/tabs'; // Tabs交互插件

export type { Heading, RenderMarkdownResult };
export { clearMarkdownCache };

// 绑定 tab 切换交互（仅一次）
setupTabsInteraction();

// 渲染失败的 UI 呈现（解析层只抛错，这里决定错误长什么样）
function renderLoadError(
  statusContainer: HTMLElement,
  file: string,
  error: unknown
): RenderMarkdownResult {
  console.error('❌ 内容渲染失败:', error);
  statusContainer.className = 'status error';
  statusContainer.innerHTML = `
    Load Failed<br>
    Reason: ${error instanceof Error ? error.message : 'Unknown error'}<br>
    Path: ${file}
  `;
  return { headings: [], metadata: {} };
}

// 对外主入口：加载并渲染一篇 Markdown 文档
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

  // 只显示加载状态，暂不清空正文：加载失败时保留当前文档，避免页面被清空
  statusContainer.className = 'status loading';
  statusContainer.textContent = 'Loading';

  try {
    const result = await loadMarkdownFile(file);

    // 请求与解析成功后再替换正文
    overviewContainer.innerHTML = '';
    markdownContainer.innerHTML = result.html;
    markdownContainer.style.display = 'block';
    statusContainer.className = 'status';
    statusContainer.textContent = '';

    // Mermaid 需在 codeCopy 之前处理（避免给 mermaid 代码块加复制按钮）
    await setupMermaid();
    setupFoldableHeadings();
    setupCodeCopy();

    return result;
  } catch (error) {
    // 展示错误状态，并抛出让调用方终止后续状态更新（不破坏当前已渲染内容）
    renderLoadError(statusContainer, file, error);
    throw error instanceof Error ? error : new Error('内容渲染失败');
  }
}
