import type { NavRoot, NavDir, NavFile } from './navTypes';

// 统一移除所有激活样式
function removeAllActiveClasses() {
  document.querySelectorAll('.nav-file.active').forEach(el => {
    el.classList.remove('active');
  });
}

export function navRender(
  navContainer: HTMLElement,
  navTree: NavRoot[],
  onLeafClick: (file: string) => void,
  onDirClick?: (dir: NavDir) => void,
  onInit?: () => void
) {
  if (!navContainer) {
    console.error('未找到导航容器');
    return;
  }

  navContainer.innerHTML = '';
  navContainer.className = 'nav-container';
  navContainer.style.position = 'relative';

  const verticalLine = document.createElement('div');
  verticalLine.className = 'sidebar-vertical-line';
  verticalLine.style.top = '-100px'; // 初始隐藏
  navContainer.appendChild(verticalLine);

  // 竖线位置更新
  function updateVerticalLinePosition(targetEl: HTMLElement) {
    const rect = targetEl.getBoundingClientRect();
    const containerRect = navContainer.getBoundingClientRect();
    const top = rect.top - containerRect.top + (rect.height - 20) / 2;
    verticalLine.style.top = `${top}px`;
    verticalLine.style.display = 'block';
    localStorage.setItem('sidebarVerticalLineTop', verticalLine.style.top);
  }

  // 滚动时同步竖线位置
  navContainer.addEventListener('scroll', () => {
    const activeEl = navContainer.querySelector('.nav-file.active') as HTMLElement;
    if (activeEl) {
      updateVerticalLinePosition(activeEl);
    } else {
      verticalLine.style.display = 'none';
    }
  });

  // 渲染一级文件（无箭头）
  function renderRootFile(root: NavRoot): HTMLParagraphElement {
    const el = document.createElement('p');
    el.className = 'root-file nav-file';
    el.textContent = root.title;
    if (root.type === 'file') {
      el.dataset.file = root.file;
      el.onclick = () => {
        removeAllActiveClasses();
        el.classList.add('active');
        onLeafClick(root.file);
        updateVerticalLinePosition(el);
      };
    }
    return el;
  }

  // 渲染一级目录下的子文件
  function renderRootSubFile(file: NavFile): HTMLParagraphElement {
    const el = document.createElement('p');
    el.className = 'root-sub-file nav-file';
    el.textContent = file.title;
    el.dataset.file = file.file;
    el.onclick = () => {
      removeAllActiveClasses();
      el.classList.add('active');
      onLeafClick(file.file);
      updateVerticalLinePosition(el);
    };
    return el;
  }

  // 渲染组目录（带箭头）
  function renderGroupDir(dir: NavDir): HTMLDetailsElement {
    const dirEl = document.createElement('details');
    dirEl.className = 'group-dir';
    dirEl.open = false;
    dirEl.dataset.initial = 'true';

    const savedGroupState = localStorage.getItem(`nav-expanded-${dir.path}`);
    dirEl.open = savedGroupState === 'true';

    dirEl.addEventListener('toggle', () => {
      localStorage.setItem(`nav-expanded-${dir.path}`, dirEl.open.toString());
      const activeEl = navContainer.querySelector('.nav-file.active') as HTMLElement;
      if (activeEl) {
        const visibleTarget = findVisibleTarget(activeEl);
        updateVerticalLinePosition(visibleTarget);
      }
    });

    const header = document.createElement('summary');
    header.className = 'group-header';
    header.appendChild(document.createTextNode(dir.title));
    const arrow = document.createElement('span');
    arrow.className = 'group-arrow';
    header.appendChild(arrow);

    dirEl.appendChild(header);

    const content = document.createElement('div');
    content.className = 'group-content';

    dir.children.forEach(child => {
      const el = document.createElement('p');
      el.className = 'group-file nav-file inner-file';
      el.textContent = child.title;
      if (child.type === 'file') {
        el.dataset.file = child.file;
        el.onclick = () => {
          removeAllActiveClasses();
          el.classList.add('active');
          onLeafClick(child.file);
          updateVerticalLinePosition(el);
        };
      }
      content.appendChild(el);
    });

    dirEl.appendChild(content);

    return dirEl;
  }

  // 渲染一级目录（带箭头）
  function renderRootDir(root: NavRoot): HTMLDetailsElement {
    if (root.type !== 'dir') {
      throw new Error('renderRootDir 函数期望传入 NavDir 类型');
    }
    const rootEl = document.createElement('details');
    rootEl.className = 'root-dir';
    rootEl.open = false;
    rootEl.dataset.initial = 'true';
  
    const savedState = localStorage.getItem(`nav-expanded-${root.path}`);
    rootEl.open = savedState === 'true';
  
    rootEl.addEventListener('toggle', () => {
      localStorage.setItem(`nav-expanded-${root.path}`, rootEl.open.toString());
      const activeEl = navContainer.querySelector('.nav-file.active') as HTMLElement;
      if (activeEl) {
        const visibleTarget = findVisibleTarget(activeEl);
        updateVerticalLinePosition(visibleTarget);
      }
    });
  
    const header = document.createElement('summary');
    header.className = 'root-header';
    header.appendChild(document.createTextNode(root.title));
    const arrow = document.createElement('span');
    arrow.className = 'root-arrow';
    header.appendChild(arrow);
  
    header.style.cursor = 'pointer';
  
    header.addEventListener('click', () => {
      removeAllActiveClasses();
      // 移除添加 active 类的代码
      // header.classList.add('active'); 
      if (onDirClick) {
        onDirClick(root);
      }
      updateVerticalLinePosition(header);
    });
  
    rootEl.appendChild(header);
  
    const content = document.createElement('div');
    content.className = 'root-content';
  
    root.children.forEach(child => {
      content.appendChild(
        child.type === 'file' ? renderRootSubFile(child) : renderGroupDir(child)
      );
    });
  
    rootEl.appendChild(content);
  
    return rootEl;
  }

  // 渲染导航树
  navTree.forEach(node => {
    navContainer.appendChild(
      node.type === 'file' ? renderRootFile(node) : renderRootDir(node)
    );
  });

  // 无激活项时隐藏竖线
  if (!navContainer.querySelector('.nav-file.active')) {
    verticalLine.style.display = 'none';
  }

  // 初始化动画，激活当前页面对应项
  setTimeout(() => {
    document.querySelectorAll('[data-initial]').forEach(el => {
      el.removeAttribute('data-initial');
    });

    requestAnimationFrame(() => {
      const currentPage = localStorage.getItem('mkoneCurrentPage');
      if (currentPage) {
        const targetEl = navContainer.querySelector(`.nav-file[data-file="${currentPage}"]`);
        if (targetEl) {
          removeAllActiveClasses();
          targetEl.classList.add('active');
        }
      }

      const activeEl = navContainer.querySelector('.nav-file.active') as HTMLElement;
      if (activeEl) {
        const visibleTarget = findVisibleTarget(activeEl);
        updateVerticalLinePosition(visibleTarget);
      } else {
        verticalLine.style.display = 'none';
      }

      onInit?.();
    });
  }, 100);
}

// 查找可见的激活元素（防止父目录折叠隐藏）
function findVisibleTarget(activeEl: HTMLElement): HTMLElement {
  const rootDir = activeEl.closest('details.root-dir') as HTMLDetailsElement | null;
  if (rootDir && !rootDir.open) {
    const rootHeader = rootDir.querySelector('summary.root-header') as HTMLElement;
    if (rootHeader) return rootHeader;
  }

  const groupDir = activeEl.closest('details.group-dir') as HTMLDetailsElement | null;
  if (groupDir && !groupDir.open) {
    const groupHeader = groupDir.querySelector('summary.group-header') as HTMLElement;
    if (groupHeader) return groupHeader;
  }

  return activeEl;
}
