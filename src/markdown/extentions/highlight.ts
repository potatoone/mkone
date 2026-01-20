

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

// 2. 注册语言
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

// 3. 别名映射（关联文件扩展名与语言）
hljs.registerAliases(['c'], { languageName: 'c' });
hljs.registerAliases(['go'], { languageName: 'go' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['js'], { languageName: 'javascript' });
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'xhtml', 'svg'], { languageName: 'xml' }); // HTML 用 xml 解析
hljs.registerAliases(['css'], { languageName: 'css' });
hljs.registerAliases(['bat', 'cmd', 'batch'], { languageName: 'dos' }); // Batch 映射到 dos
hljs.registerAliases(['sh', 'zsh', 'shell'], { languageName: 'bash' });
hljs.registerAliases(['sql'], { languageName: 'sql' });
hljs.registerAliases(['dockerfile', 'docker'], { languageName: 'dockerfile' });
hljs.registerAliases(['yaml', 'yml'], { languageName: 'yaml' });


// 4. 导出高亮函数（供业务代码调用）
export function highlightCode(code: string, lang?: string) {
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value;
  }
  // 自动检测语言（如果未指定或语言不支持）
  return hljs.highlightAuto(code).value;
}