import type { NavRoot, NavDir, NavFile } from '../sidebar/navTypes';
import { parseOrderAndName } from './docsParser';

let navTree: NavRoot[] = [];
let allPages: string[] = [];

export function buildNavTree(paths: string[]): void {
  navTree = [];
  allPages = [];

  // 1. 处理docs根目录直接文件（如 docs/04-test.md）
  const rootFiles: NavRoot[] = [];
  paths.forEach(path => {
    const normalizedPath = path.replace(/^\//, ''); 
    const parts = normalizedPath.split('/').filter(p => p);
    if (parts.length === 2 && parts[0] === 'docs') { 
      const fileName = parts[1]; // 保留原始文件名（含 .md 后缀）
      const { order, name } = parseOrderAndName(fileName); // 仅处理标题，不影响路径
      rootFiles.push({
        type: 'file',
        title: name, // 标题无 .md 后缀（如 "04-test"）
        order: order,
        file: fileName // 路径保留 .md 后缀（如 "04-test.md"）
      });
      allPages.push(fileName);
    }
  });

  // 2. 处理docs下的一级目录（如 docs/02-进阶/xxx）
  const rootDirs: Record<string, string[]> = {};
  paths.forEach(path => {
    const normalizedPath = path.replace(/^\//, ''); 
    const parts = normalizedPath.split('/').filter(p => p);
    if (parts.length >= 3 && parts[0] === 'docs') { 
      const rootName = parts[1]; 
      rootDirs[rootName] = rootDirs[rootName] || [];
      rootDirs[rootName].push(normalizedPath); // 存储标准化后的路径（如 "docs/02-进阶/01-第一个/02-test2.md"）
    }
  });

  // 转换为NavRoot[]（目录节点）（修改）
  const rootDirNodes: NavRoot[] = Object.keys(rootDirs).map(rootName => {
    const rootPaths = rootDirs[rootName];
    const { order, name: rootTitle } = parseOrderAndName(rootName);
  
    // 新增：完整路径（如 "docs/02-进阶"）
    const rootFullPath = `docs/${rootName}`; 
  
    const rootFilesInDir: string[] = []; 
    const groupDirs: Record<string, string[]> = {}; 
  
    rootPaths.forEach(normalizedPath => { 
      const parts = normalizedPath.split('/').filter(p => p);
      if (parts.length === 3) { 
        rootFilesInDir.push(normalizedPath); 
      } else if (parts.length >= 4) { 
        const groupName = parts[2]; 
        groupDirs[groupName] = groupDirs[groupName] || [];
        groupDirs[groupName].push(normalizedPath); 
      }
    });
  
    const children: (NavDir | NavFile)[] = [];
  
    // 添加当前目录下的文件（root-file）
    rootFilesInDir.forEach(normalizedPath => {
      const parts = normalizedPath.split('/').filter(p => p);
      const fileName = parts[2]; // "01-第一个.md"
      const { order, name: fileTitle } = parseOrderAndName(fileName);
      children.push({
        type: 'file',
        title: fileTitle,
        file: `${rootName}/${fileName}`, // 路径："02-进阶/01-第一个.md"（正确）
        order: order
      });
      allPages.push(`${rootName}/${fileName}`);
    });
  
    // 添加子目录（group-dir）（修改）
    Object.keys(groupDirs).forEach(groupName => {
      const groupPaths = groupDirs[groupName];
      const { order: groupOrder, name: groupTitle } = parseOrderAndName(groupName);
  
      // 子目录下的文件（关键修复：将文件路径添加到 allPages）
      const groupChildren: NavFile[] = groupPaths.map(normalizedPath => {
        const parts = normalizedPath.split('/').filter(p => p);
        const fullRelativePath = normalizedPath.replace('docs/', ''); 
        const fileName = parts[3]; 
        const { order: fileOrder, name: fileTitle } = parseOrderAndName(fileName);
        const fileNode: NavFile = {
          type: 'file',
          title: fileTitle,
          file: fullRelativePath,
          order: fileOrder
        };
        allPages.push(fileNode.file); 
        return fileNode;
      });
  
      // 新增：group目录的完整路径（基于root的完整路径拼接）
      const groupFullPath = `${rootFullPath}/${groupName}`; // 如 "docs/02-进阶/01-第一个"
  
      const groupDir: NavDir = {
        type: 'dir',
        title: groupTitle,
        order: groupOrder,
        children: groupChildren,
        path: groupFullPath // 改为完整路径（关键）
      };
      children.push(groupDir);
    });
  
    // 当前目录节点（修改path字段）
    return {
      type: 'dir',
      title: rootTitle,
      order: order,
      children: children.sort((a, b) => a.order - b.order),
      path: rootFullPath // 改为完整路径（关键）
    };
  });

  // 合并根文件和根目录，按order排序
  navTree = [...rootFiles, ...rootDirNodes].sort((a, b) => a.order - b.order);
}

export function getNavTree(): NavRoot[] { return [...navTree]; }
export function getAllPages(): string[] { return [...allPages]; }