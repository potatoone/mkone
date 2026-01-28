// viewParser.ts
// 导出元数据类型，供其他文件导入复用
export interface MarkdownMetadata {
  time?: string;
  desc?: string;
}

export function parseFrontMatter(markdown: string): {
  metadata: MarkdownMetadata; // 这里使用导出的接口，替代原本的匿名对象类型
  content: string;
} {
  const match = markdown.match(/^---\s*([\s\S]+?)\s*---\s*/);
  if (!match) return { metadata: {}, content: markdown };

  const rawYaml = match[1];
  const content = markdown.slice(match[0].length);

  const metadata: MarkdownMetadata = {}; // 同样使用导出的接口

  rawYaml.split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (!key) return;
    const value = rest.join(':').trim();

    const k = key.trim().toLowerCase();

    if (k === 'time') {
      metadata.time = value.replace(/^['"]|['"]$/g, '');
    } else if (k === 'desc') {
      metadata.desc = value.replace(/^['"]|['"]$/g, '');
    }
  });

  return { metadata, content };
}