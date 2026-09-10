/**
 * Outline（目录概览页）状态持久化
 *
 * - 记录最后打开的是哪个一级目录的 Outline：刷新浏览器后仍停留在该 Outline
 * - 记录菜单选中的视图（概览 / 更新时间 / A-Z）与升降序，切换目录时保持一致
 * - 打开任意文档会清除「Outline 已打开」标记，避免刷新后打断阅读
 */

import { storage } from '../utils/utils';

const STORAGE_KEY = 'mkoneOutlineState';

export type OutlineSortType = 'time' | 'name' | 'overview';

export interface OutlineState {
  /** 最后打开的 Outline 所属一级目录标题；null 表示当前不在 Outline */
  dirTitle: string | null;
  /** 菜单选中的视图 */
  sortType: OutlineSortType;
  /** 时间 / 名称视图是否为升序 */
  sortAsc: boolean;
}

const DEFAULT_STATE: OutlineState = {
  dirTitle: null,
  sortType: 'time',
  sortAsc: false
};

const stored = storage.get<Partial<OutlineState>>(STORAGE_KEY, {}) || {};
const state: OutlineState = { ...DEFAULT_STATE, ...stored };

function persist(): void {
  storage.set(STORAGE_KEY, state);
}

/** 读取当前状态（副本，避免外部直接修改内部对象） */
export function getOutlineState(): OutlineState {
  return { ...state };
}

/** 记录哪个一级目录的 Outline 处于打开状态（传 null 表示已切换到文档） */
export function setOutlineDir(dirTitle: string | null): void {
  if (state.dirTitle === dirTitle) return;
  state.dirTitle = dirTitle;
  persist();
}

/** 记录菜单选中的视图与排序方向 */
export function setOutlineSort(sortType: OutlineSortType, sortAsc: boolean): void {
  if (state.sortType === sortType && state.sortAsc === sortAsc) return;
  state.sortType = sortType;
  state.sortAsc = sortAsc;
  persist();
}
