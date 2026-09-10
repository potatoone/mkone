import { getMetadata } from '../parser';
import { getElement } from '../../utils/utils';
import type { NavDir, NavFile } from '../../sidebar/navTypes';
import { hidePageTitle } from '../../page/pageTitle';
import { getOutlineState, setOutlineSort } from '../../page/outlineState';

// 简化接口定义
interface OverviewItem {
  title: string;
  time: string | null;
  file: string;
  desc: string | null;
}

interface SortState {
  type: 'time' | 'name' | 'overview';
  asc: boolean;
}

// 收集文件（简化reduce逻辑）
const collectAllFiles = (items: (NavDir | NavFile)[]): { title: string; file: string }[] => {
  const files: { title: string; file: string }[] = [];
  const traverse = (items: (NavDir | NavFile)[]) => {
    items.forEach(item => {
      if (item.type === 'file') files.push({ title: item.title, file: item.file });
      else if (item.type === 'dir' && item.children) traverse(item.children);
    });
  };
  traverse(items);
  return files;
};

// 加载元数据（简化错误处理）
const loadMetadata = (file: string) => getMetadata(file);

// 排序逻辑（简化比较器）
const sortItems = (items: OverviewItem[], { type, asc }: SortState): OverviewItem[] => {
  return [...items].sort((a, b) => {
    if (type === 'time') {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return asc ? a.time.localeCompare(b.time) : b.time.localeCompare(a.time);
    }
    return asc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
  });
};

const DEFAULT_DESC = '该目录包含文档列表，可通过菜单切换排序方式';

/**
 * 模块级状态：菜单事件只绑定一次，必须复用「当前」数据，
 * 否则闭包会一直引用首次渲染的列表（切换目录后菜单会渲染上一个目录的内容）
 */
let currentItems: OverviewItem[] = [];
let currentSortState: SortState = { type: 'time', asc: false };

/** 构建头部骨架并绑定菜单事件（已构建时只更新目录描述） */
function ensureHeader(container: HTMLElement, dirDesc: string): void {
  const text = dirDesc || DEFAULT_DESC;
  const descEl = container.querySelector('.overview-desc p');

  if (descEl) {
    descEl.textContent = text; // 换目录时同步描述
    return;
  }

  container.innerHTML = `
      <div class="overview-header">
        <div class="overview-title-header">Outline</div>
        <div class="overview-menu">
          <button class="menu-btn" data-type="overview"><span>概览</span></button>
          <button class="menu-btn" data-type="time"><span>更新时间</span></button>
          <button class="menu-btn" data-type="name"><span>A-Z</span></button>
          <div class="menu-underline"></div>
        </div>
      </div>
      <div class="overview-scroll">
        <div class="overview-desc">
          <p>${text}</p>
        </div>
        <div class="list-content hidden"></div>
      </div>
    `;

  // 绑定菜单事件（使用事件委托）
  container.querySelector('.overview-menu')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.menu-btn');
    if (!btn) return;

    const type = btn.dataset.type as SortState['type'];
    const next: SortState = {
      type,
      asc: type === 'overview' ? currentSortState.asc :
        currentSortState.type === type ? !currentSortState.asc : type === 'time' ? false : true
    };

    if (next.type === currentSortState.type && next.asc === currentSortState.asc) return;
    currentSortState = next;
    setOutlineSort(next.type, next.asc); // 持久化菜单选择
    paint(container);
  });
}

/** 按当前数据与排序状态刷新界面 */
function paint(container: HTMLElement): void {
  const overviewDesc = container.querySelector('.overview-desc') as HTMLElement | null;
  const listContent = container.querySelector('.list-content') as HTMLElement | null;
  if (!overviewDesc || !listContent) return;

  // 更新菜单状态
  container.querySelectorAll<HTMLElement>('.menu-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentSortState.type);
  });

  // 更新下划线位置
  const activeBtn = container.querySelector(`.menu-btn[data-type="${currentSortState.type}"]`) as HTMLElement | null;
  const underline = container.querySelector('.menu-underline') as HTMLElement | null;
  if (activeBtn && underline) {
    underline.style.width = `${activeBtn.offsetWidth}px`;
    underline.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
  }

  // 切换内容显示
  overviewDesc.classList.toggle('hidden', currentSortState.type !== 'overview');
  listContent.classList.toggle('hidden', currentSortState.type === 'overview');

  // 渲染列表（非概览模式）
  if (currentSortState.type !== 'overview') {
    listContent.innerHTML = sortItems(currentItems, currentSortState).map(item => `
        <div class="overview-item">
          <a href="${item.file}" class="internal-link doc-title" data-file="${item.file}">${item.title}</a>
          <div class="doc-desc">${item.desc || 'No Description'}</div>
          <div class="doc-time">${(item.time)}</div>
        </div>
      `).join('');
  }
}

// 渲染概览（合并重复逻辑）
const renderOverview = (
  overviewItems: OverviewItem[],
  isFirstLevel: boolean,
  sortState: SortState,
  dirDesc: string
) => {
  const container = getElement('#overview', HTMLElement);
  if (!container) return console.warn('未找到 #overview 容器');

  // 非一级目录隐藏
  if (!isFirstLevel) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  currentItems = overviewItems;
  currentSortState = { ...sortState };

  ensureHeader(container, dirDesc);
  paint(container);
};

// 对外暴露的渲染函数（简化异步逻辑）
export const renderOverView = async (
  items: (NavDir | NavFile)[],
  isFirstLevel = true,
  dirDesc = ''
) => {
  const allFiles = collectAllFiles(items);
  if (!allFiles.length) return;

  // 并行请求所有元数据（结果顺序与文件顺序一致）
  const overviewItems: OverviewItem[] = await Promise.all(
    allFiles.map(async ({ title, file }) => {
      const meta = await loadMetadata(file);
      return { title, file, time: meta?.time ?? 'No Time Mark', desc: meta?.desc || null };
    })
  );

  // 沿用上次菜单选中的视图（概览 / 更新时间 / A-Z 及排序方向）
  const saved = getOutlineState();
  renderOverview(overviewItems, isFirstLevel, { type: saved.sortType, asc: saved.sortAsc }, dirDesc);
  hidePageTitle(document.getElementById('pageTitle'));
};
