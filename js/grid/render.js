import { faviconSources } from './favicon.js';
import { localIconURL } from './siteIcon.js';
import { showClassifiedIcon } from './iconKind.js';
const groupViews = new Map();
export function pruneGridCache(groups) {
  const ids = new Set(groups.map(group => group.id));
  for (const id of groupViews.keys()) if (!ids.has(id)) groupViews.delete(id);
}
export function renderGroups(groups, active, onSelect) {
  const nav = document.querySelector('#groups');
  const existing = new Map([...nav.children].map(button => [button.dataset.group, button]));
  const buttons = groups.map(group => {
    const button = existing.get(group.id) ?? document.createElement('button');
    button.textContent = group.name; button.className = `group-button${group.id === active ? ' active' : ''}`;
    button.dataset.group = group.id; button.setAttribute('aria-current', group.id === active ? 'true' : 'false');
    button.onclick = () => onSelect(group.id); return button;
  });
  // Preserve focus on group buttons when selection changes.
  for (let i = 0; i < buttons.length; i++) if (nav.children[i] !== buttons[i]) nav.insertBefore(buttons[i], nav.children[i] ?? null);
  for (const button of [...nav.children]) if (!buttons.includes(button)) button.remove();
}
export function renderGrid(group, store, onAdd) {
  const root = document.querySelector('#grid');
  const key = group?.id ?? '__empty';
  const signature = JSON.stringify(group?.sites ?? []);
  const cached = groupViews.get(key);
  if (cached?.signature === signature) {
    if (root.dataset.group !== key || root.firstChild !== cached.nodes[0]) root.replaceChildren(...cached.nodes);
    root.dataset.group = key; return;
  }
  const grid = document.createDocumentFragment();
  const commit = () => {
    const nodes = [...grid.childNodes]; groupViews.set(key, { signature, nodes });
    root.replaceChildren(...nodes); root.dataset.group = key;
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
        if (site.iconId) {
          const blob = await store.get(site.iconId);
          if (blob) return showClassifiedIcon(icon, site.iconId, { ...options, blob });
        }
        if (localIcon) return showClassifiedIcon(icon, localIcon, options);
        for (const source of faviconSources(site.url, iconStyle)) {
          try { if (await showClassifiedIcon(icon, source, options)) return; } catch {}
        }
      };
      load().catch(() => { /* Keep the text placeholder when decoding or loading fails. */ });
    }
  }
  if (group.sites.length) {
    const add = document.createElement('button'); add.type = 'button'; add.className = 'site add-site'; const plus = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); plus.setAttribute('viewBox', '0 0 24 24'); plus.setAttribute('aria-hidden', 'true'); const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M12 5v14M5 12h14'); plus.append(path); add.append(plus); add.title = '添加图标'; add.setAttribute('aria-label', '添加图标'); add.addEventListener('click', onAdd); grid.append(add);
  }
  commit();
}
