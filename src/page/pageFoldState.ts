/**
 * 标题折叠状态持久化
 *
 * - 按文档记录「被折叠的标题 id 列表」，切换页面 / 刷新浏览器后自动恢复
 * - 标题 id 由 parser 依据标题文本生成（稳定、可读），因此文档小改后仍能命中；
 *   已不存在于文档中的 id 会在下次写入时自然被剔除
 * - 用户每次点击折叠/展开时立即落盘（单文档数据极小，无需防抖）
 */

import { storage } from '../utils/utils';

const STORAGE_KEY = 'mkoneFoldStates';
const MAX_ENTRIES = 200; // 最多保存多少篇文档的折叠状态

/** 文档路径 → 被折叠的标题 id 列表 */
type FoldMap = Record<string, string[]>;

const states: FoldMap = storage.get<FoldMap>(STORAGE_KEY, {}) || {};

/** 限制存储条数，优先保留最近写入的（对象键顺序即插入顺序） */
function trim(): void {
  const keys = Object.keys(states);
  if (keys.length <= MAX_ENTRIES) return;
  keys.slice(0, keys.length - MAX_ENTRIES).forEach(key => delete states[key]);
}

/** 读取某篇文档上次被折叠的标题 id */
export function getCollapsedHeadingIds(file: string): string[] {
  return states[file] ?? [];
}

/** 写入某篇文档的折叠状态（传空数组即清除记录） */
export function setCollapsedHeadingIds(file: string, ids: string[]): void {
  if (ids.length) {
    states[file] = ids;
  } else {
    delete states[file];
  }
  trim();
  storage.set(STORAGE_KEY, states);
}
