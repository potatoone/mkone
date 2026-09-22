/**
 * 表格右键菜单：复制单元格 / 整行 / 整列 / 全表
 *
 * - 仅在正文表格的单元格（td / th）上右键时接管，其他位置保留原生右键菜单
 * - 复制为「制表符分隔」的纯文本：整行 / 全表可直接粘贴进 Excel、Sheets 成表格，
 *   整列为每行一个值（粘贴到表格软件即成一列）
 * - 点击菜单项后关闭菜单并给出 toast 反馈
 */

import { copyText, showError, showSuccess } from '../../utils/utils';
import { t, type MessageKey } from '../../utils/i18n';

const MENU_ID = 'table-context-menu';
const TABLE_SELECTOR = '#markdown-container table';
const HIGHLIGHT_CLASS = 'table-cell-menu-target';

type CopyAction = 'cell' | 'row' | 'column' | 'table';

/** 菜单项文案 / 复制结果中指向的对象的词典 key */
const ACTION_LABEL_KEY: Record<CopyAction, { menu: MessageKey; target: MessageKey }> = {
  cell: { menu: 'table.copyCell', target: 'table.targetCell' },
  row: { menu: 'table.copyRow', target: 'table.targetRow' },
  column: { menu: 'table.copyColumn', target: 'table.targetColumn' },
  table: { menu: 'table.copyTable', target: 'table.targetTable' }
};

let menuEl: HTMLElement | null = null;
let targetCell: HTMLTableCellElement | null = null;
let bound = false;

/** 单元格内多行文本压成一行，避免破坏制表符 / 换行的分隔结构 */
const flatten = (text: string): string => text.replace(/\s*\n\s*/g, ' ').trim();

/** 创建菜单容器（懒创建，只建一次；点击用事件委托，重建文案不会丢监听） */
function ensureMenu(): HTMLElement {
  if (menuEl) return menuEl;

  menuEl = document.createElement('div');
  menuEl.id = MENU_ID;
  menuEl.className = 'table-context-menu';
  document.body.appendChild(menuEl);

  menuEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action as CopyAction;
    const text = buildText(action);
    hideMenu();

    if (!text) return;
    copyText(text)
      .then(() => showSuccess(t('table.copied', [t(ACTION_LABEL_KEY[action].target)])))
      .catch(() => showError(t('table.copyFailed')));
  });

  return menuEl;
}

/** 渲染菜单项文案（每次弹出按当前语言刷新） */
function renderMenuItems(): HTMLElement {
  const menu = ensureMenu();
  menu.innerHTML = (Object.keys(ACTION_LABEL_KEY) as CopyAction[])
    .map(action => `<button type="button" data-action="${action}">${t(ACTION_LABEL_KEY[action].menu)}</button>`)
    .join('');
  return menu;
}

/** 按动作生成要复制的文本 */
function buildText(action: CopyAction): string {
  const cell = targetCell;
  if (!cell) return '';

  if (action === 'cell') return (cell.innerText || cell.textContent || '').trim();

  const row = cell.parentElement as HTMLTableRowElement | null;
  const table = cell.closest('table');
  if (!row || !table) return '';

  const rows = Array.from(table.rows);

  if (action === 'row') {
    return Array.from(row.cells).map(c => flatten(c.innerText)).join('\t');
  }

  const index = Array.from(row.cells).indexOf(cell);

  if (action === 'column') {
    return rows
      .map(r => r.cells[index])
      .filter((c): c is HTMLTableCellElement => Boolean(c))
      .map(c => flatten(c.innerText))
      .join('\n');
  }

  // 全表：行内以制表符分隔，行间换行
  return rows
    .map(r => Array.from(r.cells).map(c => flatten(c.innerText)).join('\t'))
    .join('\n');
}

/** 在鼠标位置弹出菜单（自动避让视口边缘） */
function showMenu(x: number, y: number): void {
  const menu = renderMenuItems();
  menu.classList.add('show');

  const { offsetWidth: w, offsetHeight: h } = menu;
  const left = Math.max(4, Math.min(x, window.innerWidth - w - 4));
  const top = Math.max(4, Math.min(y, window.innerHeight - h - 4));

  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

/** 高亮右键选中的单元格（清除上一次的高亮） */
function highlightCell(cell: HTMLTableCellElement): void {
  clearHighlight();
  cell.classList.add(HIGHLIGHT_CLASS);
}

function clearHighlight(): void {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
}

function hideMenu(): void {
  menuEl?.classList.remove('show');
  clearHighlight();
  targetCell = null;
}

/** 初始化（事件委托，全局绑定一次） */
export function setupTableContextMenu(): void {
  if (bound) return;
  bound = true;

  document.addEventListener('contextmenu', (e) => {
    const cell = (e.target as HTMLElement | null)?.closest?.('td, th') as HTMLTableCellElement | null;

    // 非表格单元格：交由浏览器原生右键菜单
    if (!cell || !cell.closest(TABLE_SELECTOR)) {
      hideMenu();
      return;
    }

    e.preventDefault();
    targetCell = cell;
    highlightCell(cell);
    showMenu(e.clientX, e.clientY);
  });

  // 点击别处 / Esc / 滚动 / 缩放 / 失焦 都关闭菜单
  document.addEventListener('click', (e) => {
    if (menuEl && !menuEl.contains(e.target as Node)) hideMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideMenu();
  });
  window.addEventListener('scroll', hideMenu, true);
  window.addEventListener('resize', hideMenu);
  window.addEventListener('blur', hideMenu);
}
