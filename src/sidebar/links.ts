// 链接类型
interface LinkItem {
  title: string;
  url: string;
}

// 检查链接数据格式是否正确
const isValidLinkData = (links: unknown): links is LinkItem[] => 
  Array.isArray(links) && links.every(link => link.title && link.url);

// 生成链接 HTML 片段（新增 target="_blank"）
const generateLinkHTML = (links: LinkItem[]) => 
  links.map(link => `
    <a 
      href="${link.url}" 
      target="_blank"  // 默认新标签页打开
      class="sidebar-link-item"
    >
      ${link.title}
    </a>
  `).join('');

// 初始化侧边栏链接（未修改部分保持不变）
export async function initSidebarLinks() {
  const linksContainer = document.getElementById('sidebar-links');
  if (!linksContainer) {
    console.warn('未找到链接容器（#sidebar-links），链接无法显示');
    return;
  }

  try {
    const res = await fetch('./docs/config/links.json');
    if (!res.ok) throw new Error(`链接加载失败（状态码：${res.status}）`);

    const links = await res.json();
    if (!isValidLinkData(links)) throw new Error('links.json格式错误，需包含[{title, url}, ...]');

    linksContainer.innerHTML = `
      <hr class="sidebar-links-sep">
      <div class="sidebar-links-list">
        ${generateLinkHTML(links)}
      </div>
    `;
  } catch (error) {
    console.error('链接加载失败:', error);
    linksContainer.innerHTML = '<span style="color:#888; font-size:14px;">链接加载失败</span>';
  }
}