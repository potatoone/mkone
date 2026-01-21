import { parseFrontMatter } from './viewParser';
import { getElement } from '../../utils/utils';
import type { NavDir, NavFile } from '../../sidebar/navTypes';
import { hidePageTitle } from '../../utils/pageTitle';

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
const loadMetadata = async (file: string): Promise<{ time?: string; desc?: string } | null> => {
  try {
    const url = file.startsWith('./') ? file : `./docs/${file}`;
    const res = await fetch(url);
    return res.ok ? parseFrontMatter(await res.text()).metadata : null;
  } catch (err) {
    console.error('加载元数据失败:', file, err);
    return null;
  }
};

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

  // 初始化DOM（仅首次渲染）
  if (!container.querySelector('.overview-header')) {
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
          <p>${dirDesc || '该目录包含文档列表，可通过菜单切换排序方式'}</p>
        </div>
        <div class="list-content hidden"></div>
      </div>
    `;

    // 绑定菜单事件（使用事件委托）
    container.querySelector('.overview-menu')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.menu-btn');
      if (!btn) return;

      const type = btn.dataset.type as SortState['type'];
      const newState: SortState = {
        type,
        asc: type === 'overview' ? sortState.asc :
          sortState.type === type ? !sortState.asc : type === 'time' ? false : true
      };

      if (newState.type === sortState.type && newState.asc === sortState.asc) return;
      Object.assign(sortState, newState);
      updateUI();
    });
  }

  // 更新UI（合并重复选择器）
  const updateUI = () => {
    const [overviewDesc, listContent] = [
      container.querySelector('.overview-desc') as HTMLElement,
      container.querySelector('.list-content') as HTMLElement
    ];

    // 更新菜单状态
    container.querySelectorAll<HTMLElement>('.menu-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === sortState.type);
    });

    // 更新下划线位置
    const activeBtn = container.querySelector(`.menu-btn[data-type="${sortState.type}"]`) as HTMLElement;
    const underline = container.querySelector('.menu-underline') as HTMLElement;
    if (activeBtn && underline) {
      underline.style.width = `${activeBtn.offsetWidth}px`;
      underline.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
    }

    // 切换内容显示
    overviewDesc.classList.toggle('hidden', sortState.type !== 'overview');
    listContent.classList.toggle('hidden', sortState.type === 'overview');

    // 渲染列表（非概览模式）
    if (sortState.type !== 'overview') {
      listContent.innerHTML = sortItems(overviewItems, sortState).map(item => `
        <div class="overview-item">
          <a href="${item.file}" class="internal-link doc-title" data-file="${item.file}">${item.title}</a>
          <div class="doc-desc">${item.desc || '无描述'}</div>
          <div class="doc-time">${(item.time)}</div>
        </div>
      `).join('');
    }
  };

  updateUI();
};

// 对外暴露的渲染函数（简化异步逻辑）
export const renderOverView = async (
  items: (NavDir | NavFile)[],
  isFirstLevel = true,
  dirDesc = ''
) => {
  const allFiles = collectAllFiles(items);
  if (!allFiles.length) return;

  // 保持文件顺序的异步处理
  const overviewItems: OverviewItem[] = [];
  for (const { title, file } of allFiles) {
    const meta = await loadMetadata(file);
    overviewItems.push({ title, file, time: meta?.time ?? null, desc: meta?.desc || null });
  }

  renderOverview(overviewItems, isFirstLevel, { type: 'time', asc: false }, dirDesc);
  hidePageTitle(document.getElementById('pageTitle'));
};