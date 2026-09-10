/**
 * Markdown 标题折叠功能
 *
 * 将 #markdown-container 的各级标题（h1-h6）转换为可折叠区块：
 * - 点击标题可折叠/展开该标题下的内容（到下一个同级或更高级标题为止）
 * - 高级标题折叠时，其嵌套的低级标题及内容一并隐藏
 * - 页内导航跳转、内链锚点跳转时自动展开被折叠的祖先区块
 * - 打印时自动展开所有折叠区块，打印后恢复
 */

const CONTAINER_ID = 'markdown-container';

const isHeading = (el: Element): boolean => /^H[1-6]$/.test(el.tagName);

const headingLevel = (el: Element): number => Number(el.tagName[1]);

/**
 * 为标题包裹折叠区块（标题 + 到下一个同级/更高级标题之前的所有内容）
 */
function wrapSection(heading: HTMLElement): void {
  const level = headingLevel(heading);
  const parent = heading.parentNode;
  if (!parent) return;

  // 收集标题之后、下一个同级或更高级标题之前的所有兄弟元素
  const collected: Element[] = [];
  let next = heading.nextElementSibling;
  while (next && !(isHeading(next) && headingLevel(next) <= level)) {
    collected.push(next);
    next = next.nextElementSibling;
  }

  const section = document.createElement('div');
  section.className = `fold-section fold-level-${level}`;

  const body = document.createElement('div');
  body.className = 'fold-body';

  parent.insertBefore(section, heading);
  section.appendChild(heading);
  section.appendChild(body);
  collected.forEach(el => body.appendChild(el));

  heading.classList.add('fold-toggle');
  heading.setAttribute('aria-expanded', 'true');
  heading.setAttribute('tabindex', '0');
}

/**
 * 切换折叠状态
 */
function toggleSection(heading: HTMLElement): void {
  const section = heading.parentElement;
  if (!section?.classList.contains('fold-section')) return;
  const collapsed = section.classList.toggle('collapsed');
  heading.setAttribute('aria-expanded', String(!collapsed));
}

/**
 * 绑定折叠交互（事件委托，容器复用时无需重复绑定）
 */
// renderMarkdown 每次渲染都会执行初始化，事件委托监听器只需绑定一次
let toggleBound = false;

function bindToggleEvents(container: HTMLElement): void {
  if (toggleBound) return;
  toggleBound = true;

  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // 避免干扰标题内的链接、按钮、代码块交互
    if (target.closest('a, button, pre, code')) return;
    const heading = target.closest<HTMLElement>('.fold-toggle');
    if (heading) toggleSection(heading);
  });

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const heading = (e.target as HTMLElement).closest?.('.fold-toggle');
    if (heading) {
      e.preventDefault();
      toggleSection(heading as HTMLElement);
    }
  });
}

// 打印时展开所有折叠区块，打印后恢复
let printBound = false;
const collapsedBeforePrint = new Set<HTMLElement>();

function bindPrintExpand(): void {
  if (printBound) return;
  printBound = true;

  window.addEventListener('beforeprint', () => {
    collapsedBeforePrint.clear();
    document
      .querySelectorAll<HTMLElement>('.fold-section.collapsed')
      .forEach(section => {
        collapsedBeforePrint.add(section);
        section.classList.remove('collapsed');
      });
  });

  window.addEventListener('afterprint', () => {
    collapsedBeforePrint.forEach(section => section.classList.add('collapsed'));
    collapsedBeforePrint.clear();
  });
}

/**
 * 展开指定元素所在的整条折叠链（用于锚点跳转前调用）
 * @returns 是否有区块被展开
 */
export function expandHeadingChain(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;

  let changed = false;
  // 若目标本身是折叠标题，其标题本身始终可见，从其所在区块的外层开始展开
  let node: Element | null = el.classList.contains('fold-toggle')
    ? el.closest('.fold-section')?.parentElement ?? null
    : el;

  while (node) {
    const section = node.closest('.fold-section');
    if (!section) break;
    if (section.classList.contains('collapsed')) {
      section.classList.remove('collapsed');
      section
        .querySelector(':scope > .fold-toggle')
        ?.setAttribute('aria-expanded', 'true');
      changed = true;
    }
    node = section.parentElement;
  }
  return changed;
}

/**
 * 初始化标题折叠（在 Markdown 渲染完成后调用）
 */
export function setupFoldableHeadings(): void {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  // 仅处理容器的直接子级标题，避免处理 tabs / 提示块等嵌套内容中的标题
  const headings = Array.from(container.children).filter(isHeading) as HTMLElement[];
  if (!headings.length) return;

  headings.forEach(wrapSection);
  bindToggleEvents(container);
  bindPrintExpand();
}
