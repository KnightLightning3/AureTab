import { faviconSources } from './favicon.js';
import { localIconURL } from './siteIcon.js';
import { showClassifiedIcon } from './iconKind.js';
import { groupIconElement } from '../ui/groupIcon.js';

// Limit concurrent icon decodes/downloads; the queue drains across group switches.
const ICON_CONCURRENCY = 4;
let activeLoads = 0;
const loadQueue = [];
function enqueue(task) {
  const run = () => {
    activeLoads++;
    Promise.resolve().then(task).catch(() => {}).finally(() => {
      activeLoads--;
      loadQueue.shift()?.();
    });
  };
  if (activeLoads < ICON_CONCURRENCY) run(); else loadQueue.push(run);
}

const starters = new WeakMap();
let iconObserver;
function observer() {
  if (typeof IntersectionObserver !== 'function') return null;
  if (!iconObserver) {
    iconObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const start = starters.get(entry.target);
        starters.delete(entry.target);
        iconObserver.unobserve(entry.target);
        start?.();
      }
    }, { root: document.querySelector('.grid-viewport') ?? null, rootMargin: '200px' });
  }
  return iconObserver;
}

const groupViews = new Map();
/** A cached group that is gone (or replaced) must not keep loading or observing. */
function retire(view) {
  if (!view) return;
  view.active = false;
  for (const node of view.nodes) { starters.delete(node); iconObserver?.unobserve(node); }
}
export function pruneGridCache(groups) {
  const ids = new Set(groups.map(group => group.id));
  for (const [id, view] of groupViews) if (!ids.has(id)) { retire(view); groupViews.delete(id); }
}
export function renderGroups(groups, active, onSelect) {
  const nav = document.querySelector('#groups');
  const existing = new Map([...nav.children].map(button => [button.dataset.group, button]));
  const buttons = groups.map(group => {
    const button = existing.get(group.id) ?? document.createElement('button');
    button.className = `group-button${group.id === active ? ' active' : ''}`;
    button.dataset.group = group.id; button.draggable = false; button.setAttribute('aria-current', group.id === active ? 'true' : 'false');
    // Rebuild only when the icon or label actually changed; a selection change is just a class toggle.
    if (button.dataset.icon !== (group.icon ?? '') || button.querySelector('.group-name')?.textContent !== group.name) {
      button.replaceChildren();
      const icon = groupIconElement(group.icon); if (icon) button.append(icon);
      const label = document.createElement('span'); label.className = 'group-name'; label.textContent = group.name;
      button.append(label); button.dataset.icon = group.icon ?? '';
    }
    button.onclick = () => onSelect(group.id); return button;
  });
  // Preserve focus on group buttons when selection changes.
  for (let i = 0; i < buttons.length; i++) if (nav.children[i] !== buttons[i]) nav.insertBefore(buttons[i], nav.children[i] ?? null);
  const live = new Set(buttons);
  for (const button of [...nav.children]) if (!live.has(button)) button.remove();
}
export function renderGrid(group, store, onAdd) {
  const root = document.querySelector('#grid');
  const key = group?.id ?? '__empty';
  const signature = JSON.stringify(group?.sites ?? []);
  const cached = groupViews.get(key);
  if (cached?.signature === signature) {
    if (root.dataset.group !== key || root.firstChild !== cached.nodes[0]) root.replaceChildren(...cached.nodes);
    if (root.dataset.group !== key) root.dataset.group = key; return;
  }
  if (cached) retire(cached);
  const grid = document.createDocumentFragment();
  const view = { signature, nodes: [], active: true };
  const commit = () => {
    view.nodes = [...grid.childNodes]; groupViews.set(key, view);
    root.replaceChildren(...view.nodes); if (root.dataset.group !== key) root.dataset.group = key;
  };
  if (!group?.sites.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; const button = document.createElement('button'); button.textContent = '＋ 添加第一个图标'; button.onclick = onAdd; empty.append(button); grid.append(empty); commit(); return; }
  for (const site of group.sites) {
    const link = document.createElement('a'); link.href = site.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.draggable = true; link.dataset.site = site.id; link.dataset.size = site.size; link.className = `site${{ '2x1': ' wide', '1x2': ' tall', '2x2': ' large' }[site.size] ?? ''}`; link.title = `${site.title}\n${site.url}`;
    const iconStyle = site.iconStyle === 'glyph' ? 'glyph' : 'color';
    const localIcon = !site.useText ? localIconURL(site.iconFile) : null;
    const icon = document.createElement('span'); icon.className = `site-icon ${site.iconId || !site.useText ? iconStyle : 'text'}`; icon.textContent = site.text;
    const title = document.createElement('span'); title.className = 'site-title'; title.textContent = site.title; link.append(icon, title); grid.append(link);
    if (!site.useText) {
      const options = { manual: site.iconStyle, store };
      const load = async () => {
        if (!view.active) return;
        // Every source is best-effort: a missing blob, unreadable bundled file or
        // <32px image must fall through to the next source, not end the chain.
        try {
          // The classifier reads icon:<id> from the store and caches the result.
          if (site.iconId && await showClassifiedIcon(icon, site.iconId, options)) return;
        } catch {}
        if (localIcon) {
          try { if (await showClassifiedIcon(icon, localIcon, options)) return; } catch {}
        }
        for (const source of faviconSources(site.url, iconStyle)) {
          try { if (await showClassifiedIcon(icon, source, options)) return; } catch {}
        }
      };
      // Only visible (or nearly visible) tiles request icons. A successful load is
      // cached by iconKind, so returning to this group does not request it again.
      const start = () => enqueue(load);
      const observed = observer();
      if (observed) { starters.set(link, start); observed.observe(link); }
      else start();
    }
  }
  if (group.sites.length) {
    const add = document.createElement('button'); add.type = 'button'; add.className = 'site add-site'; const plus = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); plus.setAttribute('viewBox', '0 0 24 24'); plus.setAttribute('aria-hidden', 'true'); const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M12 5v14M5 12h14'); plus.append(path); add.append(plus); add.title = '添加图标'; add.setAttribute('aria-label', '添加图标'); add.addEventListener('click', onAdd); grid.append(add);
  }
  commit();
}
