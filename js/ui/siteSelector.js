import { searchSites } from '../search/siteIndex.js';
import { mountEditorFields } from './dialogs.js';
import { showClassifiedIcon } from '../grid/iconKind.js';
import { localIconURL } from '../grid/siteIcon.js';

let dataPromise;
function loadData() {
  if (!dataPromise) {
    const url = new URL('../../data/sites.json', import.meta.url);
    dataPromise = fetch(url)
      .then(response => { if (!response.ok) throw new Error('站点清单加载失败'); return response.json(); })
      .catch(error => { dataPromise = null; throw error; });
  }
  return dataPromise;
}

export function openSiteSelector({ onSelect, onCustom, fields, customize } = {}) {
  const returnFocus = document.activeElement;
  const dialog = document.createElement('dialog'); dialog.className = 'site-selector-dialog'; dialog.setAttribute('aria-label', '添加标签');
  const heading = document.createElement('div'); heading.className = 'dialog-heading';
  const title = document.createElement('h2'); title.textContent = '添加标签';
  const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.className = 'site-selector-close'; closeButton.setAttribute('aria-label', '关闭'); closeButton.textContent = '×';
  heading.append(title, closeButton);
  const search = document.createElement('input'); search.type = 'search'; search.className = 'site-selector-search'; search.placeholder = '搜索站点名称、别名或域名'; search.setAttribute('aria-label', '搜索站点');
  const body = document.createElement('div'); body.className = 'site-selector-body';
  const nav = document.createElement('div'); nav.className = 'site-selector-categories'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', '站点分类');
  const custom = document.createElement('button'); custom.type = 'button'; custom.className = 'site-selector-category site-selector-custom'; custom.textContent = '自定义标签'; custom.setAttribute('role', 'tab'); nav.append(custom);
  const panel = document.createElement('div'); panel.className = 'site-selector-panel';
  const grid = document.createElement('div'); grid.className = 'site-selector-grid';
  const hint = document.createElement('p'); hint.className = 'site-selector-hint'; hint.textContent = '正在加载站点清单…';
  panel.append(grid, hint); body.append(nav, panel); dialog.append(heading, search, body);
  document.body.append(dialog); dialog.showModal(); search.focus();

  let result = null, picker;
  let customForm;
  if (fields) {
    customForm = document.createElement('form'); customForm.className = 'site-selector-editor'; customForm.hidden = true;
    const editorFields = document.createElement('div'); editorFields.className = 'site-editor-fields';
    mountEditorFields(editorFields, fields); customForm.append(editorFields);
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消'; cancel.onclick = () => close();
    const save = document.createElement('button'); save.type = 'submit'; save.className = 'primary'; save.textContent = '保存';
    actions.append(cancel, save); customForm.append(actions); panel.append(customForm);
    picker = customize?.({ dialog, form: customForm, container: editorFields });
    customForm.addEventListener('submit', event => { event.preventDefault(); result = new FormData(customForm); close(); });
  }
  const showCustom = () => {
    if (!customForm) { close(); onCustom?.(); return; }
    activeCategory = '__custom'; search.value = ''; render(); customForm.elements.title.focus();
  };
  let categories = [], sites = [], activeCategory = '', dataLoaded = false, closed = false, resolveClosed;
  const closedPromise = new Promise(resolve => { resolveClosed = resolve; });
  const close = () => { if (closed) return; closed = true; clearTimeout(searchTimer); dialog.close(); dialog.remove(); if (returnFocus?.isConnected) returnFocus.focus(); resolveClosed(result); };
  const choose = site => {
    if (customForm) {
      customForm.elements.title.value = site.name; customForm.elements.url.value = `https://${site.domain}/`;
      customForm.elements.text.value = ''; customForm.elements.icon.value = '';
      picker?.setLocal(site.icon || '', site.domain); showCustom(); return;
    }
    close(); try { onSelect?.(site); } catch (error) { console.error(error); } };
  custom.onclick = showCustom;
  const syncCategories = () => {
    const searching = Boolean(search.value.trim());
    nav.querySelectorAll('.site-selector-category').forEach(button => {
      const active = !searching && (button === custom ? activeCategory === '__custom' : button.dataset.category === activeCategory);
      button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active));
    });
  };
  const renderCategories = () => {
    nav.replaceChildren(custom);
    for (const category of categories) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'site-selector-category'; button.dataset.category = category.id; button.setAttribute('role', 'tab'); button.textContent = category.name;
      button.onclick = () => { activeCategory = category.id; search.value = ''; render(); };
      nav.append(button);
    }
  };
  const render = () => {
    if (closed) return;
    const editing = activeCategory === '__custom' && customForm && !search.value.trim();
    if (customForm) customForm.hidden = !editing;
    grid.hidden = Boolean(editing); syncCategories();
    if (editing) { hint.hidden = true; return; }
    if (!dataLoaded) { hint.hidden = false; hint.textContent = '正在加载站点清单…'; return; }
    const query = search.value.trim();
    const list = query ? searchSites(sites, query, 24) : sites.filter(site => site.cat === activeCategory);
    grid.replaceChildren();
    if (!list.length) { hint.hidden = false; hint.textContent = query ? '未找到，可直接输入网址' : '暂无站点'; }
    else hint.hidden = true;
    for (const site of list) {
      const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'site-selector-tile'; tile.dataset.domain = site.domain; tile.dataset.name = site.name;
      tile.title = site.name + '\n' + site.domain; tile.setAttribute('aria-label', site.name + '，' + site.domain);
      const icon = document.createElement('span'); icon.className = 'site-icon'; icon.textContent = Array.from(site.name)[0] || '?';
      const label = document.createElement('span'); label.className = 'site-title'; label.textContent = site.name;
      tile.append(icon, label); tile.onclick = () => choose(site); grid.append(tile);
      if (site.icon) {
        const src = localIconURL(site.icon);
        if (src) {
          showClassifiedIcon(icon, src).catch(() => {});
        }
      }
    }
    grid.classList.remove('is-refreshing'); void grid.offsetWidth; grid.classList.add('is-refreshing');
    panel.scrollTop = 0;
  };
  let searchTimer;
  search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(render, 150); });
  search.addEventListener('keydown', event => {
    if (!['Enter', 'ArrowDown'].includes(event.key) || grid.hidden) return;
    // Flush the 150ms debounce so Enter never selects a stale result.
    clearTimeout(searchTimer); render();
    const first = grid.querySelector('.site-selector-tile'); if (!first) return;
    event.preventDefault();
    if (event.key === 'Enter') first.click(); else first.focus();
  });
  nav.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const buttons = [...nav.querySelectorAll('.site-selector-category')]; if (!buttons.length) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement); const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    buttons[(Math.max(0, index) + (forward ? 1 : -1) + buttons.length) % buttons.length].focus();
  });
  grid.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const tiles = [...grid.querySelectorAll('.site-selector-tile')]; if (!tiles.length) return;
    const index = tiles.indexOf(document.activeElement); if (index < 0) return;
    event.preventDefault();
    const columns = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
    let next = index;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tiles.length - 1;
    else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
    else if (event.key === 'ArrowRight') next = Math.min(tiles.length - 1, index + 1);
    else next = Math.max(0, Math.min(tiles.length - 1, index + (event.key === 'ArrowDown' ? columns : -columns)));
    tiles[next].focus();
  });
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); close(); } });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', () => { if (!closed) { closed = true; dialog.remove(); if (returnFocus?.isConnected) returnFocus.focus(); } resolveClosed(result); });
  closeButton.onclick = close;

  loadData().then(data => {
    if (closed) return;
    categories = Array.isArray(data.categories) ? data.categories : [];
    sites = Array.isArray(data.sites) ? data.sites : [];
    activeCategory = activeCategory || categories[0]?.id || sites[0]?.cat || '';
    dataLoaded = true; renderCategories(); render();
  }).catch(error => {
    console.error(error);
    if (closed) return;
    hint.textContent = '站点清单加载失败，可选择自定义标签输入网址'; hint.hidden = activeCategory === '__custom';
  });
  return closedPromise;
}
