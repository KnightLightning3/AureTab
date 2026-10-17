import { faviconSources } from './favicon.js';
let urls = [];
const MIN_FAVICON_SIZE = 32;
export function renderGroups(groups, active, onSelect) {
  const nav = document.querySelector('#groups'); nav.replaceChildren();
  for (const group of groups) { const button = document.createElement('button'); button.textContent = group.name; button.className = `group-button${group.id === active ? ' active' : ''}`; button.dataset.group = group.id; button.setAttribute('aria-current', group.id === active ? 'true' : 'false'); button.addEventListener('click', () => onSelect(group.id)); nav.append(button); }
}
export function renderGrid(group, store, onAdd) {
  for (const url of urls) URL.revokeObjectURL(url); urls = [];
  const grid = document.querySelector('#grid'); grid.replaceChildren();
  if (!group?.sites.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; const button = document.createElement('button'); button.textContent = '＋ 添加第一个图标'; button.onclick = onAdd; empty.append(button); grid.append(empty); return; }
  for (const site of group.sites) {
    const link = document.createElement('a'); link.href = site.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.draggable = true; link.dataset.site = site.id; link.dataset.size = site.size; link.className = `site${{ '2x1': ' wide', '1x2': ' tall', '2x2': ' large' }[site.size] ?? ''}`; link.title = `${site.title}\n${site.url}`;
    const iconStyle = site.iconStyle === 'glyph' ? 'glyph' : 'color';
    const icon = document.createElement('span'); icon.className = `site-icon ${site.iconId || !site.useText ? iconStyle : 'text'}`; icon.textContent = site.text;
    const title = document.createElement('span'); title.className = 'site-title'; title.textContent = site.title; link.append(icon, title); grid.append(link);
    if (site.iconId) store.get(site.iconId).then(blob => {
      if (!blob || !icon.isConnected) return;
      const url = URL.createObjectURL(blob); urls.push(url);
      const image = document.createElement('img'); image.alt = ''; image.draggable = false; image.className = 'custom'; image.onload = () => { if (icon.isConnected) icon.replaceChildren(image); }; image.src = url;
    }).catch(console.error);
    else if (!site.useText) {
      const sources = faviconSources(site.url, iconStyle); let index = 0;
      const tryNext = () => {
        if (!icon.isConnected || index >= sources.length) return;
        const image = document.createElement('img'); image.alt = ''; image.draggable = false;
        image.onload = () => {
          if (!icon.isConnected) return;
          if (image.naturalWidth >= MIN_FAVICON_SIZE && image.naturalHeight >= MIN_FAVICON_SIZE) icon.replaceChildren(image);
          else tryNext();
        };
        image.onerror = () => { if (icon.isConnected) tryNext(); };
        image.src = sources[index++];
      };
      tryNext();
    }
  }
}
