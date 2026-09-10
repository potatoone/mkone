import type { NavRoot, NavDir, NavFile } from '../sidebar/navTypes';
import { parseOrderAndName } from './docsParser';

let navTree: NavRoot[] = [];
let allPages: string[] = [];

// 中间结构：用于把扁平的路径列表还原成任意深度的目录树
interface TmpNode {
  dirs: Map<string, TmpNode>;
  files: { name: string; rel: string }[];
}

const createTmpNode = (): TmpNode => ({ dirs: new Map(), files: [] });

/**
 * 根据 md 路径列表构建导航树（支持任意目录深度）
 * @param paths 形如 "/docs/01_入门/01_项目介绍.md" 的路径集合
 */
export function buildNavTree(paths: string[]): void {
  navTree = [];
  allPages = [];

  const root = createTmpNode();
  const rootFiles: { name: string; rel: string }[] = [];

  // 1. 把扁平路径还原成树形中间结构
  paths.forEach(path => {
    const rel = path.replace(/^\/?docs\//, ''); // "01_入门/03_使用/01_基本说明.md"
    const parts = rel.split('/').filter(Boolean);
    if (!parts.length) return;

    const fileName = parts.pop()!;
    if (!parts.length) {
      // docs 根目录下的直接文件（如 docs/03_关于.md）
      rootFiles.push({ name: fileName, rel: fileName });
      return;
    }

    let cursor = root;
    parts.forEach(segment => {
      if (!cursor.dirs.has(segment)) cursor.dirs.set(segment, createTmpNode());
      cursor = cursor.dirs.get(segment)!;
    });
    cursor.files.push({ name: fileName, rel });
  });

  // 2. 递归转换为 NavFile / NavDir（每层按 order 排序）
  const toFileNode = (name: string, rel: string): NavFile => {
    const { order, name: title } = parseOrderAndName(name);
    allPages.push(rel);
    return { type: 'file', title, order, file: rel };
  };

  const toNodes = (node: TmpNode, fullPath: string): (NavDir | NavFile)[] => {
    const nodes: (NavDir | NavFile)[] = [];

    node.files.forEach(f => nodes.push(toFileNode(f.name, f.rel)));

    node.dirs.forEach((child, segment) => {
      const { order, name: title } = parseOrderAndName(segment);
      const childPath = `${fullPath}/${segment}`;
      nodes.push({
        type: 'dir',
        title,
        order,
        path: childPath, // 如 "docs/03_技术部文档/05_技术部规范"
        children: toNodes(child, childPath)
      });
    });

    return nodes.sort((a, b) => a.order - b.order);
  };

  navTree = [
    ...rootFiles.map(f => toFileNode(f.name, f.rel)),
    ...toNodes(root, 'docs')
  ].sort((a, b) => a.order - b.order);
}

export function getNavTree(): NavRoot[] { return [...navTree]; }
export function getAllPages(): string[] { return [...allPages]; }
