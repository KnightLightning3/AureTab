let urls = [];
export function renderGroups(groups, active, onSelect) {
  const nav = document.querySelector('#groups'); nav.replaceChildren();
  for (const group of groups) { const button = document.createElement('button'); button.textContent = group.name; button.className = `group-button${group.id === active ? ' active' : ''}`; button.dataset.group = group.id; button.setAttribute('aria-current', group.id === active ? 'true' : 'false'); button.addEventListener('click', () => onSelect(group.id)); nav.append(button); }
}
export function renderGrid(group, store, onAdd) {
  for (const url of urls) URL.revokeObjectURL(url); urls = [];
  const grid = document.querySelector('#grid'); grid.replaceChildren(); document.querySelector('#group-title').textContent = group?.name ?? '我的空间';
  if (!group?.sites.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; const button = document.createElement('button'); button.textContent = '＋ 添加第一个图标'; button.onclick = onAdd; empty.append(button); grid.append(empty); return; }
  for (const site of group.sites) {
    const link = document.createElement('a'); link.href = site.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.draggable = true; link.dataset.site = site.id; link.className = `site${site.size === '2x2' ? ' large' : ''}`; link.title = `${site.title}\n${site.url}`;
    const icon = document.createElement('span'); icon.className = 'site-icon'; icon.textContent = site.text;
    const title = document.createElement('span'); title.className = 'site-title'; title.textContent = site.title; link.append(icon, title); grid.append(link);
    const showImage = (src, custom = false) => { const image = document.createElement('img'); image.alt = ''; image.draggable = false; image.className = custom ? 'custom' : ''; image.onload = () => { if (icon.isConnected) icon.replaceChildren(image); }; image.src = src; };
    if (site.iconId) store.get(site.iconId).then(blob => { if (!blob || !icon.isConnected) return; const url = URL.createObjectURL(blob); urls.push(url); showImage(url, true); }).catch(console.error);
    else if (!site.useText) { const url = new URL(chrome.runtime.getURL('/_favicon/')); url.searchParams.set('pageUrl', site.url); url.searchParams.set('size', '32'); showImage(url.href); }
  }
}
