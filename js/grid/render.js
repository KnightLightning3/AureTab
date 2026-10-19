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

// One blurred layer behind the grid, masked to the icon rectangles. This keeps
// the glass look without one backdrop filter per icon.
let glassPlate, glassMaskFrame = 0, glassResizeObserver, glassSettingsObserver;
function plateFor(root) {
  if (!glassPlate) {
    glassPlate = document.createElement('div');
    glassPlate.className = 'grid-glass';
    glassPlate.setAttribute('aria-hidden', 'true');
  }
  if (glassPlate.parentNode !== root) root.prepend(glassPlate);
  return glassPlate;
}
function applyGlassMask() {
  const root = document.querySelector('#grid');
  if (!glassPlate?.isConnected || !root) return;
  const width = root.clientWidth, height = root.clientHeight;
  if (!width || !height) return;
  const radius = getComputedStyle(document.body).getPropertyValue('--radius').trim();
  const circular = radius.endsWith('%');
  const fixedRadius = circular ? 0 : parseFloat(radius) || 0;
  const rootRect = root.getBoundingClientRect();
  const rects = [];
  for (const icon of root.querySelectorAll('.site-icon')) {
    const rect = icon.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const x = rect.left - rootRect.left, y = rect.top - rootRect.top;
    const rx = circular ? rect.width / 2 : Math.min(fixedRadius, rect.width / 2);
    const ry = circular ? rect.height / 2 : Math.min(fixedRadius, rect.height / 2);
    rects.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rect.width.toFixed(1)}" height="${rect.height.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="#fff"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${rects.join('')}</svg>`;
  glassPlate.style.setProperty('--grid-glass-mask', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}
export function scheduleGlassMask() {
  if (glassMaskFrame) return;
  const frame = typeof globalThis.requestAnimationFrame === 'function'
    ? callback => globalThis.requestAnimationFrame(callback)
    : callback => setTimeout(callback, 0);
  glassMaskFrame = frame(() => { glassMaskFrame = 0; applyGlassMask(); }) || 1;
}
function observeGlass(root) {
  plateFor(root); scheduleGlassMask();
  if (!glassResizeObserver && typeof ResizeObserver === 'function') {
    glassResizeObserver = new ResizeObserver(scheduleGlassMask);
    glassResizeObserver.observe(root);
  }
  if (!glassSettingsObserver && typeof MutationObserver === 'function') {
    glassSettingsObserver = new MutationObserver(scheduleGlassMask);
    glassSettingsObserver.observe(document.body, { attributes: true, attributeFilter: ['data-radius', 'class'] });
  }
}
/** Swap only the tiles; keeping the plate in place avoids rebuilding its filter. */
function replaceGridNodes(root, plate, nodes) {
  for (const child of [...root.childNodes]) if (child !== plate) child.remove();
  if (plate.parentNode !== root) root.prepend(plate);
  root.append(...nodes);
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
    const plate = plateFor(root);
    if (root.dataset.group !== key || root.children[1] !== cached.nodes[0]) replaceGridNodes(root, plate, cached.nodes);
    if (root.dataset.group !== key) root.dataset.group = key;
    observeGlass(root); applyGlassMask(); return;
  }
  if (cached) retire(cached);
  const grid = document.createDocumentFragment();
  const view = { signature, nodes: [], active: true };
  const commit = () => {
    view.nodes = [...grid.childNodes]; groupViews.set(key, view);
    const plate = plateFor(root);
    replaceGridNodes(root, plate, view.nodes); if (root.dataset.group !== key) root.dataset.group = key;
    observeGlass(root);
    // Measure the new tiles now so the glass is correct on the very next paint.
    applyGlassMask();
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
