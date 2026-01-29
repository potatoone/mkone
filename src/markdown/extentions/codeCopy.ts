interface CopyOptions {
  containerSelector?: string;
  successDuration?: number;
  buttonText?: string;
  successText?: string;
}

/**
 * 为代码块添加复制功能（文字按钮版）
 * @param options 配置项
 */
export const setupCodeCopy = (options: CopyOptions = {}) => {
  const config = {
    containerSelector: '#markdown-container pre',
    buttonText: 'COPY',
    successText: 'COPIED',
    successDuration: 1500,
    ...options
  };

  const init = () => {
    const codeBlocks = document.querySelectorAll<HTMLElement>(config.containerSelector);
    if (!codeBlocks.length) return;

    codeBlocks.forEach(block => addCopyButton(block));
  };

  const addCopyButton = (block: HTMLElement) => {
    if (block.querySelector('.code-copy-btn')) return;

    if (getComputedStyle(block).position === 'static') {
      block.style.position = 'relative';
    }

    const button = document.createElement('button');
    button.className = 'code-copy-btn';
    button.type = 'button';
    button.textContent = config.buttonText; // 显示文字
    button.title = config.buttonText; // 悬停提示

    button.addEventListener('click', async () => {
      try {
        await copyCode(block);
        showSuccess(button);
      } catch (err) {
        console.error('复制失败:', err);
      }
    });

    block.appendChild(button);
  };

  const copyCode = async (block: HTMLElement): Promise<void> => {
    const codeContent = Array.from(block.childNodes)
      .filter(node => !(node instanceof HTMLButtonElement))
      .map(node => node.textContent || '')
      .join('')
      .trim();

    // 优先使用现代 Clipboard API
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(codeContent);
        return;
      } catch (err) {
        console.warn('Clipboard API 访问被拒，降级到传统方法:', err);
        // 继续执行传统方法
      }
    }

    // 传统方法（支持旧浏览器和沙箱环境）
    const textarea = document.createElement('textarea');
    textarea.value = codeContent;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);

    try {
      textarea.select();
      const success = document.execCommand('copy');
      if (!success) throw new Error('复制命令执行失败');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const showSuccess = (button: HTMLButtonElement) => {
    const originalText = button.textContent;
    button.textContent = config.successText;
    button.classList.add('success');
    button.title = config.successText;

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('success');
      button.title = config.buttonText;
    }, config.successDuration);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
};

export type { CopyOptions };