// parseMeta.ts
export function parseFrontMatter(markdown: string): {
  metadata: {
    time?: string;
    desc?: string;
  };
  content: string;
} {
  const match = markdown.match(/^---\s*([\s\S]+?)\s*---\s*/);
  if (!match) return { metadata: {}, content: markdown };

  const rawYaml = match[1];
  const content = markdown.slice(match[0].length);

  const metadata: { time?: string; desc?: string } = {};

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
