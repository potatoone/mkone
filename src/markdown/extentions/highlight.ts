

import hljs from 'highlight.js/lib/core';

// 1. 核心语言模块导入
import c from 'highlight.js/lib/languages/c';               // C
import go from 'highlight.js/lib/languages/go';             // Go
import python from 'highlight.js/lib/languages/python';     // Python
import javascript from 'highlight.js/lib/languages/javascript'; // JavaScript
import typescript from 'highlight.js/lib/languages/typescript'; // TypeScript
import xml from 'highlight.js/lib/languages/xml';           // HTML/XML
import css from 'highlight.js/lib/languages/css';           // CSS
import dos from 'highlight.js/lib/languages/dos';           // DOS/Batch
import bash from 'highlight.js/lib/languages/bash';         // Shell
import sql from 'highlight.js/lib/languages/sql';           // SQL
import dockerfile from 'highlight.js/lib/languages/dockerfile'; // Dockerfile
import yaml from 'highlight.js/lib/languages/yaml';         // YAML
import json from 'highlight.js/lib/languages/json';         // JSON
import java from 'highlight.js/lib/languages/java';         // Java
import nginx from 'highlight.js/lib/languages/nginx';       // Nginx 配置

// 2. 注册语言（hljs 内置语言名与别名已含本名，无需再自我注册）
hljs.registerLanguage('c', c);
hljs.registerLanguage('go', go);
hljs.registerLanguage('python', python);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('dos', dos);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('java', java);
hljs.registerLanguage('nginx', nginx);

// 3. 别名映射（仅注册与语言名不同的扩展名）
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['js'], { languageName: 'javascript' });
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'xhtml', 'svg'], { languageName: 'xml' }); // HTML 用 xml 解析
hljs.registerAliases(['bat', 'cmd', 'batch'], { languageName: 'dos' }); // Batch 映射到 dos
hljs.registerAliases(['sh', 'zsh', 'shell'], { languageName: 'bash' });
hljs.registerAliases(['docker'], { languageName: 'dockerfile' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });


// 4. 导出高亮函数（供业务代码调用）

// 自动检测语言结果缓存（键：代码原文，值：检测语言）
// 供代码块语言标记复用，避免 DOM 阶段二次执行 highlightAuto
const autoLangCache = new Map<string, string>();

// 纯文本类语言：不做高亮，仅转义原文（highlight.js 未内置 txt）
const PLAIN_LANGS = new Set(['txt', 'text', 'plain', 'plaintext']);

export function highlightCode(code: string, lang?: string) {
  // mermaid 代码块不做高亮，返回转义后的原文（由 mermaidDiagram.ts 渲染成图表）
  if (lang === 'mermaid') {
    return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // 纯文本代码块：跳过高亮与自动检测，保持原样
  if (lang && PLAIN_LANGS.has(lang)) {
    return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value;
  }
  // 自动检测语言（如果未指定或语言不支持）
  const result = hljs.highlightAuto(code);
  if (result.language) autoLangCache.set(code, result.language);
  return result.value;
}

/**
 * 获取代码块的自动检测语言（带缓存）
 * 缓存未命中时（如 HTML 走 304 缓存路径、highlightCode 未执行）现场检测一次
 * @returns 检测语言名，未检测到时返回 null
 */
export function detectLanguage(code: string): string | null {
  if (!autoLangCache.has(code)) {
    const result = hljs.highlightAuto(code);
    if (result.language) autoLangCache.set(code, result.language);
  }
  return autoLangCache.get(code) ?? null;
}