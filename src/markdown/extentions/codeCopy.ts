interface CopyOptions {
  containerSelector?: string;
  successDuration?: number;
  buttonText?: string;
  successText?: string;
}

/**
 * 为代码块添加复制功能（文字按钮版）- 动态创建包裹div方案
 * @param options 配置项
 */
export const setupCodeCopy = () => {
  const config = {
    containerSelector: '#markdown-container pre',
    buttonText: 'COPY',
    successText: 'COPIED',
    successDuration: 1500,
  };

  const init = () => {
    const codeBlocks = document.querySelectorAll<HTMLElement>(config.containerSelector);
    if (!codeBlocks.length) return;

    codeBlocks.forEach(block => addCopyButton(block));
  };

  const addCopyButton = (block: HTMLElement) => {
    // 检查是否已被包裹（避免重复处理）
    if (block.parentElement?.classList.contains('code-block-wrapper')) return;

    // 1. 创建包裹容器
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    // 2. 将pre移动到包裹容器中
    block.parentNode?.insertBefore(wrapper, block);
    wrapper.appendChild(block);

    // 3. 创建复制按钮
    const button = document.createElement('button');
    button.className = 'code-copy-btn';
    button.type = 'button';
    button.textContent = config.buttonText;
    button.title = config.buttonText;

    // 4. 按钮点击事件
    button.addEventListener('click', async () => {
      try {
        await copyCode(block);
        showSuccess(button);
      } catch (err) {
        console.error('复制失败:', err);
      }
    });

    // 5. 将按钮添加到包裹容器中（与pre平级）
    wrapper.appendChild(button);
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

    // 补充传统复制方法（兜底）
    const textArea = document.createElement('textarea');
    textArea.value = codeContent;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
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

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
};

export type { CopyOptions };