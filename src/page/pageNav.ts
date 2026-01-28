import { renderMarkdown } from '../markdown/markdown';
import type { Heading } from '../markdown/markdown';

let navLockId: string | null = null;

const STORAGE_KEYS = {
  navActive: 'mkone.nav.activeId',
  navVisible: 'mkone.nav.visible'
} as const;

const getEl = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

export async function initPageNavigation(filePath: string) {
  const headings = await renderMarkdown(filePath);
  if (!headings.length) return;

  generateNavigation(headings);
  bindMobileNavToggle();
  setupHeadingObserver();
  await waitImagesLoaded();

  window.scrollTo(0, 0);
  updateActiveNavState(headings[0].id);

  togglePageNavigation(localStorage.getItem(STORAGE_KEYS.navVisible) !== 'false');
}

function waitImagesLoaded(timeout = 5000): Promise<void> {
  const imgs = Array.from(document.images).filter(img => !img.complete);
  if (!imgs.length) return Promise.resolve();

  return new Promise((resolve) => {
    let loaded = 0;
    const timer = setTimeout(resolve, timeout);
    const check = () => { if (++loaded === imgs.length) clearTimeout(timer), resolve(); };
    imgs.forEach(img => img.addEventListener('load', check));
    imgs.forEach(img => img.addEventListener('error', check));
  });
}

function scrollToHeading(id: string, cb?: () => void) {
  navLockId = id;
  waitImagesLoaded().then(() => {
    const el = document.getElementById(id);
    if (!el) return navLockId = null, cb?.();

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    let lastY = window.scrollY, count = 0;
    const check = () => {
      if (Math.abs(window.scrollY - lastY) < 1 || count++ > 20) {
        updateActiveNavState(id);
        navLockId = null;
        cb?.();
      } else {
        lastY = window.scrollY;
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  });
}

function setupHeadingObserver() {
  const headings = document.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id]');
  const observer = new IntersectionObserver(entries => {
    if (navLockId) return;

    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;

    const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (top) {
      const id = top.target.id;
      updateActiveNavState(id);
      localStorage.setItem(STORAGE_KEYS.navActive, id);
    }
  }, {
    rootMargin: '-80px 0px -70% 0px',
    threshold: 0
  });

  headings.forEach(h => observer.observe(h));
}

function generateNavigation(headings: Heading[]) {
  const nav = getEl('pageNav');
  if (!nav) return;

  nav.innerHTML = `
    <div class="nav-items-container">
      <div class="nav-title">On This Page</div>
      <div class="nav-indicator"></div>
      ${headings.map(h =>
        `<a href="#${h.id}" class="nav-item level-${h.level}" style="padding-left:${(h.level - 1) * 15}px">
          ${h.text}
        </a>`).join('')}
    </div>
  `;
  bindNavEvents();
}

function bindNavEvents() {
  getEl('pageNav')?.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLAnchorElement>('.nav-item');
    if (item) {
      e.preventDefault();
      const id = item.getAttribute('href')?.slice(1);
      if (id) {
        localStorage.setItem(STORAGE_KEYS.navActive, id);
        scrollToHeading(id, () => updateActiveNavState(id));
      }
    }
  });
}

export function updateActiveNavState(id: string) {
  document.querySelectorAll<HTMLAnchorElement>('.nav-item').forEach(item => {
    const isActive = item.getAttribute('href') === `#${id}`;
    item.classList.toggle('active', isActive);
    if (isActive) updateFollowLine(item);
  });
}

function updateFollowLine(activeItem: HTMLElement) {
  const bar = document.querySelector<HTMLElement>('.nav-indicator');
  const container = activeItem.offsetParent as HTMLElement | null;
  if (!bar || !container) return;

  const { top, height } = activeItem.getBoundingClientRect();
  const containerTop = container.getBoundingClientRect().top;
  bar.style.top = `${top - containerTop}px`;
  bar.style.height = `${height}px`;
}

function bindMobileNavToggle() {
  const title = getEl('pageTitle'), nav = getEl('pageNav');
  if (!title || !nav) return;

  title.onclick = (e) => (e.stopPropagation(), nav.classList.toggle('show'));
  document.onclick = (e) => !nav.contains(e.target as Node) && nav.classList.remove('show');
  nav.onclick = (e) => e.target === nav && nav.classList.remove('show');
}

export const togglePageNavigation = (v: boolean) => {
  const nav = getEl('pageNav');
  if (nav) nav.style.display = v ? '' : 'none';
};

export const hidePageNavigation = () => togglePageNavigation(false);
export const showPageNavigation = () => togglePageNavigation(true);
