// 链接类型
interface LinkItem {
  title: string;
  url: string;
}

// 检查链接数据格式是否正确
const isValidLinkData = (links: unknown): links is LinkItem[] =>
  Array.isArray(links) && links.every(link => link.title && link.url);

// 生成链接 HTML 片段
const generateLinkHTML = (links: LinkItem[]) =>
  links.map(link => `
    <a 
      href="${link.url}" 
      target="_blank"
      class="sidebar-link-item"
    >
      ${link.title}
    </a>
  `).join('');

// 依次尝试多个候选路径（兼容根路径部署、子路径部署与本地开发）
const CANDIDATE_PATHS = ['./config/links.json', 'config/links.json', '/config/links.json', './links.json'];

/**
 * 读取并解析 JSON：
 * - 校验响应状态与 Content-Type，避免把 SPA 兜底的 index.html 当 JSON 解析
 * - 兼容带 BOM 的文件
 */
async function fetchJson(urls: string[]): Promise<unknown> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) continue; // 返回 HTML（兜底页）时跳过

      const text = (await res.text()).replace(/^\uFEFF/, '');
      if (!text.trim()) continue;

      return JSON.parse(text);
    } catch {
      // 尝试下一个候选路径
    }
  }
  throw new Error('links.json 无法获取或不是合法 JSON');
}

// 初始化侧边栏链接
export async function initSidebarLinks() {
  const linksContainer = document.getElementById('sidebar-links');
  if (!linksContainer) {
    console.warn('未找到链接容器（#sidebar-links），链接无法显示');
    return;
  }

  try {
    const links = await fetchJson(CANDIDATE_PATHS);
    if (!isValidLinkData(links)) throw new Error('links.json格式错误，需包含[{title, url}, ...]');

    linksContainer.innerHTML = `
      <hr class="sidebar-links-sep">
      <div class="sidebar-links-list">
        ${generateLinkHTML(links)}
      </div>
    `;
  } catch (error) {
    // 侧边链接属于可选内容，失败时静默降级，不影响主流程
    console.warn('链接加载失败（已跳过）:', error);
    linksContainer.innerHTML = '';
  }
}
