// 提取公共属性到一个基础接口
interface NavBase {
  type: 'dir' | 'file'; // 类型标识，区分目录和文件
  title: string; // 显示的标题
  order: number; // 排序序号
}

// 目录类型，继承自 NavBase（补充 path 属性）
export interface NavDir extends NavBase {
  type: 'dir'; // 明确类型为目录
  children: (NavDir | NavFile)[]; // 子项，可以是子目录或文件
  path: string; // 新增：目录的唯一路径标识（如 "02-进阶/01-第一个"）
}

// 文件类型，继承自 NavBase
export interface NavFile extends NavBase {
  type: 'file'; // 明确类型为文件
  file: string; // 文件路径
}

// 根目录或根文件类型，使用联合类型
export type NavRoot = NavDir | NavFile;