import { getElement, showSuccess, showError } from '../utils/utils';

export class ExportManager {
  private exportPanel: HTMLElement;
  private copyMarkdownBtn: HTMLButtonElement;
  private exportHtmlBtn: HTMLButtonElement;
  private printBtn: HTMLButtonElement;
  private markdownContainer: HTMLElement;

  constructor() {
    // 仅获取 DOM 元素，不进行事件绑定等初始化操作
    this.exportPanel = getElement('#exportPanel', HTMLElement)!;
    this.copyMarkdownBtn = getElement('#copyMarkdownBtn', HTMLButtonElement)!;
    this.exportHtmlBtn = getElement('#exportHtmlBtn', HTMLButtonElement)!;
    this.printBtn = getElement('#printBtn', HTMLButtonElement)!;
    this.markdownContainer = getElement('#markdown-container', HTMLElement)!;
  }

  // 提供初始化方法，由外部调用进行事件绑定
  public init(): void {
    this.bindEvents();
  }

  private bindEvents(): void {
    this.copyMarkdownBtn.addEventListener('click', () => this.copyMarkdown());
    this.exportHtmlBtn.addEventListener('click', () => this.exportHtml());
    this.printBtn.addEventListener('click', () => this.printContent());
  }

  private async copyMarkdown(): Promise<void> {
    try {
      const text = this.extractMarkdownText();
      await navigator.clipboard.writeText(text);
      showSuccess('Markdown 内容已复制到剪贴板');
      this.closePanel();
    } catch (err) {
      console.error('复制失败:', err);
      showError('复制失败，请手动复制');
    }
  }

  private exportHtml(): void {
    try {
      const html = this.generateExportHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      showSuccess('HTML 文件已导出');
      this.closePanel();
    } catch (err) {
      console.error('导出失败:', err);
      showError('导出失败，请重试');
    }
  }

  private printContent(): void {
    try {
      // 创建打印友好的样式
      const printStyle = document.createElement('style');
      printStyle.textContent = `
        @media print {
          body * { visibility: hidden; }
          #markdown-container, #markdown-container * { visibility: visible; }
          #markdown-container { position: absolute; left: 0; top: 0; }
        }
      `;
      document.head.appendChild(printStyle);
      
      window.print();
      
      // 清理打印样式
      setTimeout(() => {
        document.head.removeChild(printStyle);
      }, 1000);
      
      this.closePanel();
    } catch (err) {
      console.error('打印失败:', err);
      showError('打印失败，请重试');
    }
  }

  private extractMarkdownText(): string {
    // 尝试从 markdown 容器中提取纯文本
    const textContent = this.markdownContainer.textContent || '';
    
    // 简单的清理：移除多余的空行和空格
    return textContent
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 将多个空行替换为两个空行
      .replace(/^\s+|\s+$/g, '') // 移除首尾空格
      .trim();
  }

  private generateExportHtml(): string {
    const title = document.title || '导出文档';
    const content = this.markdownContainer.innerHTML;
    const timestamp = new Date().toLocaleString('zh-CN');
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        code {
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 15px;
            color: #666;
        }
        .export-info {
            border-top: 1px solid #eee;
            margin-top: 30px;
            padding-top: 15px;
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>
<body>
    ${content}
    <div class="export-info">
        <p>导出时间: ${timestamp}</p>
        <p>来源: ${window.location.href}</p>
    </div>
</body>
</html>`;
  }

  private closePanel(): void {
    this.exportPanel.classList.remove('show');
  }

  // 公共方法
  public openPanel(): void {
    this.exportPanel.classList.add('show');
  }
}

// 向后兼容的函数，仅创建实例，不进行初始化
export function setupExport(): ExportManager {
  return new ExportManager();
}