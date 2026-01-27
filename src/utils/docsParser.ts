// 移除文件名前的数字前缀
export const removeNumericPrefix = (str: string): string => str.replace(/^\d+_/, '');

// 移除文件名的 .md 后缀
export const removeMdExtension = (str: string): string => str.endsWith('.md') ? str.slice(0, -3) : str;

// 生成用于显示的干净标题
export const cleanTitle = (fileName: string): string => {
  const pathParts = fileName.split('/');
  const fileNameWithExt = pathParts.pop() || '';
  const cleanedDirectoryParts = pathParts.map(removeNumericPrefix);
  const directoryPath = cleanedDirectoryParts.join('/');
  const fileNameClean = removeMdExtension(removeNumericPrefix(fileNameWithExt));
  return directoryPath ? `${directoryPath}/${fileNameClean}` : fileNameClean;
};

// 解析文件名的顺序和名称
export function parseOrderAndName(fileName: string) {
  const match = fileName.match(/^(\d+)_(.+?)(?:\.md)?$/);
  if (match) {
    return {
      order: parseInt(match[1], 10),
      name: match[2]
    };
  }
  return {
    order: Infinity,
    name: fileName.replace(/\.md$/, '')
  };
}

// 导出所有页面的数组
export const allPages: string[] = [];