import { LocalDataStore, loadPrefs, savePrefs } from './storage/LocalDataStore.js';
import { assetStore } from './storage/idb.js';
import { LocalWallpaperProvider, renderWallpaper, compressImage } from './wallpaper/Local.js';
import { engines, searchURL } from './search/engines.js';
import { imageSearchAdapters, imageFromDrop, copyAndOpenImage } from './search/imageSearch.js';
import { renderGroups, renderGrid, pruneGridCache } from './grid/render.js';
import { loadClassifiedIcon } from './grid/iconKind.js';
import { localIconURL } from './grid/siteIcon.js';
import { bindGridLayout } from './ui/groupNavigation.js';
import { bindDragSort, bindGroupDragSort, moveSite, moveGroup } from './grid/dragSort.js';
import { bindContextMenu } from './ui/contextMenu.js';
import { $, toast, report, bindDialogClose, editDialog } from './ui/dialogs.js';
import { applySettings } from './ui/settings.js';
import { startClock } from './ui/clock.js';
import { mountIconPicker } from './ui/iconPicker.js';
import { mountGroupIconPicker, DEFAULT_GROUP_ICON } from './ui/groupIcon.js';
import { buildBackup, download, parseBackup, planImport, dataURLToBlob } from './io/exportImport.js';
import { safeURL, validateData } from './io/schema.js';

const store = new LocalDataStore(); const wallpaper = new LocalWallpaperProvider();
let data, prefs, active, pendingBackup, fallbackBlob, fallbackEngine, settingsReturnFocus, customThumbURL;
let queue = Promise.resolve();
const run = action => { const result = queue.then(action); queue = result.catch(() => {}); return result; };
const on = (selector, event, action) => $(selector).addEventListener(event, e => { try { Promise.resolve(action(e)).catch(report); } catch (error) { report(error); } });
function drawer(open) { document.body.classList.toggle('drawer-open', open); $('#drawer-backdrop').hidden = !open; $('#drawer-toggle').setAttribute('aria-expanded', String(open)); }
function toggleSettings(open) {
  const panel = $('#settings-panel');
  if (open) settingsReturnFocus = document.activeElement; // Capture before inert blurs it.
  document.body.classList.toggle('settings-open', open);
  panel.inert = !open; panel.setAttribute('aria-hidden', String(!open)); $('#settings-open').setAttribute('aria-expanded', String(open));
  // The drawer is modal: keep assistive technology out of the obscured page.
  for (const element of [document.querySelector('.topbar'), document.querySelector('main.workspace')]) if (element) element.inert = open;
  if (!open && settingsReturnFocus?.isConnected && settingsReturnFocus !== document.body) { settingsReturnFocus.focus(); settingsReturnFocus = null; }
}
function render() {
  if (!data.groups.some(group => group.id === active)) active = data.groups[0]?.id;
  pruneGridCache(data.groups);
  renderGroups(data.groups, active, selectGroup);
  renderGrid(data.groups.find(group => group.id === active), assetStore, () => chooseNewSite().catch(report));
  applySettings(data, prefs); updateEngine();
}
function selectGroup(id, direction) {
  if (id === active) { drawer(false); return; }
  if (!data.groups.some(group => group.id === id)) return;
  const previousIndex = data.groups.findIndex(group => group.id === active);
  const nextIndex = data.groups.findIndex(group => group.id === id);
  const movement = direction ?? (nextIndex > previousIndex ? 1 : -1);
  active = id; drawer(false); render();
  const viewport = $('.grid-viewport');
  viewport.scrollTop = movement < 0 ? viewport.scrollHeight : 0;
  const grid = $('#grid');
  for (const animation of grid.getAnimations()) animation.cancel();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    grid.animate([
      { transform: `translateY(${movement * 28}px)`, opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 }
    ], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
}
function updateEngine() {
  const engine = engines[prefs.engine]; const trigger = $('#engine'); let icon = trigger.querySelector('.engine-icon');
  if (!icon) { trigger.replaceChildren(); icon = document.createElement('img'); icon.className = 'engine-icon'; icon.alt = ''; icon.setAttribute('aria-hidden', 'true'); trigger.append(icon); }
  icon.src = engine.icon; trigger.setAttribute('aria-label', `搜索引擎：${engine.name}`); $('.drop-hint').textContent = `松开以 ${engine.name} 识图`;
}
function closeEngineMenu() { const menu = $('#engine-menu'); if (menu.hidden) return; menu.hidden = true; $('#engine').setAttribute('aria-expanded', 'false'); }
function openEngineMenu() {
  const menu = $('#engine-menu'); const trigger = $('#engine'); menu.replaceChildren();
  for (const [id, engine] of Object.entries(engines)) {
    const item = document.createElement('button'); item.type = 'button'; item.setAttribute('role', 'menuitemradio'); item.setAttribute('aria-checked', String(prefs.engine === id));
    const icon = document.createElement('img'); icon.className = 'engine-icon'; icon.alt = ''; icon.src = engine.icon; icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span'); name.className = 'engine-name'; name.textContent = engine.name;
    item.append(icon, name); if (prefs.engine === id) item.classList.add('active');
    item.onclick = () => { closeEngineMenu(); changePrefs(next => { next.engine = id; }).catch(report); trigger.focus(); };
    menu.append(item);
  }
  menu.hidden = false; trigger.setAttribute('aria-expanded', 'true');
  const rect = trigger.getBoundingClientRect(); const anchor = $('#search-form').getBoundingClientRect(); const box = menu.getBoundingClientRect();
  const top = anchor.bottom + 8 + box.height <= innerHeight - 6 ? anchor.bottom + 8 : Math.max(6, rect.top - box.height - 8);
  menu.style.left = `${Math.max(6, Math.min(rect.left, innerWidth - box.width - 6))}px`; menu.style.top = `${top}px`;
  (menu.querySelector('[aria-checked="true"]') ?? menu.firstElementChild)?.focus({ preventScroll: true });
}
/** Read-modify-write with a revision check, so another tab's save is never
 * silently overwritten. Returns without saving when the mutation is a no-op. */
async function commitData(mutate) {
  return run(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const base = await store.load().catch(() => data);
      const draft = structuredClone(base);
      if (await mutate(draft) === false) return;
      draft.revision = (base.revision ?? 0) + 1;
      const valid = validateData(draft);
      const latest = await store.load().catch(() => null);
      if (latest && (latest.revision ?? 0) !== (base.revision ?? 0)) continue;
      await store.save(valid); data = valid; render(); scheduleAssetGC(); return;
    }
    throw new Error('数据正在被其他标签页修改，请重试');
  });
}
async function change(action) { return commitData(async draft => { await action(draft); return true; }); }
const ASSET_GC_DELAY = 10 * 60 * 1000;
let assetGCTimer;
/** Delete uploaded icons no longer referenced by the saved data, but only after
 * ten quiet minutes and only if the data did not change during the scan. */
function scheduleAssetGC() {
  clearTimeout(assetGCTimer);
  assetGCTimer = setTimeout(() => {
    run(async () => {
      const snapshot = await store.load().catch(() => null);
      if (!snapshot) return;
      const live = new Set(snapshot.groups.flatMap(group => group.sites.map(site => site.iconId).filter(Boolean)));
      const keys = await assetStore.keys();
      const orphans = keys.filter(key => typeof key === 'string' && key.startsWith('icon:') && !live.has(key));
      if (!orphans.length) return;
      const latest = await store.load().catch(() => null);
      if (!latest || JSON.stringify(latest) !== JSON.stringify(snapshot)) return;
      for (const key of orphans) await assetStore.delete(key).catch(() => {});
    }).catch(() => {});
  }, ASSET_GC_DELAY);
}
function changePrefs(action) {
  return run(async () => {
    const next = await loadPrefs().catch(() => ({ ...prefs }));
    action(next);
    await savePrefs(next); prefs = next; applySettings(data, prefs); updateEngine();
  });
}
/** Pref mutators share the save queue so a slower write cannot clobber a newer one. */
function applyPrefs(mutate) { return changePrefs(mutate); }
async function addGroup(id) {
  const group = data.groups.find(item => item.id === id);
  const values = await editDialog(group ? '重命名分组' : '新建分组', [{ name: 'name', label: '分组名称', value: group?.name ?? '', required: true, maxLength: 40 }], ({ form, container }) => mountGroupIconPicker(container, form, group?.icon));
  if (!values) return;
  const icon = values.get('groupIcon') || group?.icon || DEFAULT_GROUP_ICON;
  await change(draft => { if (id) { const target = draft.groups.find(item => item.id === id); if (!target) throw new Error('该分组已被删除'); target.name = values.get('name').trim(); target.icon = icon; } else { const newId = crypto.randomUUID(); draft.groups.push({ id: newId, name: values.get('name').trim(), icon, sites: [] }); active = newId; } });
}
async function addSite(id, prefill = {}, editor = editDialog) {
  if (!data.groups.length) { await addGroup(); if (!data.groups.length) return; }
  const group = id ? data.groups.find(item => item.sites.some(site => site.id === id)) : data.groups.find(item => item.id === active);
  const site = group?.sites.find(item => item.id === id);
  if (id && !site) throw new Error('图标已被删除，请重试');
  if (!group) throw new Error('分组已被删除，请重试');
  const fields = [
    { name: 'title', label: '网站名称', value: site?.title ?? prefill.title ?? '', required: true, maxLength: 120 },
    { name: 'url', label: '网址（HTTP / HTTPS）', value: site?.url ?? prefill.url ?? 'https://', required: true },
    { name: 'text', label: '文字图标（1 至 3 个字符）', value: site?.text ?? '', maxLength: 6 },
    { name: 'size', label: '尺寸', value: site?.size ?? '1x1', options: [['1x1', '1 × 1'], ['2x1', '2 × 1 横向'], ['1x2', '1 × 2 纵向'], ['2x2', '2 × 2']] },
    { name: 'icon', label: '上传自定义图标（可选）', type: 'file', accept: 'image/*' },
  ];
  if (site?.iconId) fields.push({ name: 'removeIcon', label: '已有自定义图片', options: [['keep', '保留'], ['remove', '移除，恢复网站或文字图标']] });
  // Validate before the dialog closes so a typo never discards the user's input.
  const validateSite = values => {
    const title = values.get('title').trim();
    if (!title) throw new Error('请填写网站名称');
    const rawUrl = values.get('url').trim();
    safeURL(/^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    const text = values.get('text').trim() || Array.from(title).slice(0, 2).join('');
    if (Array.from(text).length > 3) throw new Error('文字图标最多 3 个字符');
  };
  const values = await editor(site ? '编辑图标' : '添加图标', fields, ({ form, container }) => {
    const originalHost = site ? new URL(site.url).hostname : '';
    return mountIconPicker(container, form, site, { iconFile: site?.iconFile ?? prefill.iconFile, domain: originalHost || prefill.domain, browse: editor === editDialog });
  }, validateSite);
  if (!values) return;
  const title = values.get('title').trim();
  const rawUrl = values.get('url').trim();
  const url = safeURL(/^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  const text = values.get('text').trim() || Array.from(title).slice(0, 2).join('');
  if (Array.from(text).length > 3) throw new Error('文字图标最多 3 个字符');
  const choice = values.get('iconChoice') || (site?.iconId ? 'custom' : site?.useText ? 'text' : site?.iconStyle || 'auto');
  const nextHost = new URL(url).hostname;
  const localFile = values.get('iconLocal') || '';
  const localDomain = values.get('iconLocalDomain') || '';
  const localMatches = localFile && localDomain && (nextHost === localDomain || nextHost.endsWith('.' + localDomain));
  const next = { id: site?.id ?? crypto.randomUUID(), title, url, text, size: values.get('size') };
  if (localMatches) next.iconFile = localFile;
  const file = values.get('icon'); let uploadedBlob;
  if (file?.size) { next.iconId = `icon:${crypto.randomUUID()}`; if (choice === 'color' || choice === 'glyph') next.iconStyle = choice; uploadedBlob = await compressImage(file, 256, { preserveAlpha: true }); await assetStore.put(next.iconId, uploadedBlob); }
  else if (choice !== 'text' && !localMatches && site?.iconId && values.get('removeIcon') !== 'remove') { next.iconId = site.iconId; if (choice === 'color' || choice === 'glyph') next.iconStyle = choice; else if (choice === 'custom' && site.iconStyle) next.iconStyle = site.iconStyle; }
  else if (choice === 'text') next.useText = true;
  else { next.useText = false; if (choice === 'color' || choice === 'glyph') next.iconStyle = choice; }
  // Classify newly acquired artwork before saving; later renders read its kind/v marker.
  if (!next.useText) {
    const source = next.iconId || localIconURL(next.iconFile);
    if (source) {
      try { await loadClassifiedIcon(source, assetStore, uploadedBlob); } catch {}
    }
  }
  await change(draft => { const target = draft.groups.find(item => item.id === group.id); if (!target) throw new Error('分组已被删除，请重试'); if (id) { const index = target.sites.findIndex(item => item.id === id); if (index < 0) throw new Error('图标已被删除'); target.sites[index] = next; } else target.sites.push(next); });
}
async function chooseNewSite() {
  const { openSiteSelector } = await import('./ui/siteSelector.js');
  await addSite(undefined, {}, (_title, fields, customize, validate) => openSiteSelector({ fields, customize, validate }));
}
/** Show the stored custom wallpaper in its settings thumbnail, not a fixed “＋”. */
async function updateWallpaperThumb() {
  const image = $('#wallpaper-custom-thumb'), placeholder = $('[data-thumb-placeholder]');
  const blob = await wallpaper.getCurrent().catch(() => null);
  if (customThumbURL) { URL.revokeObjectURL(customThumbURL); customThumbURL = undefined; }
  if (blob) {
    customThumbURL = URL.createObjectURL(blob);
    if (image) { image.src = customThumbURL; image.hidden = false; }
    if (placeholder) placeholder.hidden = true;
  } else {
    if (image) { image.removeAttribute('src'); image.hidden = true; }
    if (placeholder) placeholder.hidden = false;
  }
}
function openSettings() { closeEngineMenu(); applySettings(data, prefs); toggleSettings(true); updateWallpaperThumb().catch(() => {}); $('#settings-close').focus(); }
function closeSettings() { if (document.body.classList.contains('settings-open')) toggleSettings(false); }
const MINIMAL_FADE = 60, MINIMAL_MOVE = 380;
let minimalSwitching = false;
/** Minimal mode keeps the search content at its normal size. Its new position is
 * reached with a FLIP translate at the same time as the disappearing chrome fades. */
function switchMinimal() {
  if (minimalSwitching) return;
  const toggle = () => applyPrefs(next => { next.minimal = !next.minimal; });
  const content = $('.search-content');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!content || reduced) { toggle().catch(report); return; }
  minimalSwitching = true;
  const body = document.body;
  body.style.setProperty('--minimal-fade', `${MINIMAL_FADE}ms`);
  const entering = !prefs.minimal;
  const before = content.getBoundingClientRect();
  // Capture the chrome before the layout swap so an entering fade can keep it
  // visually in place after the minimal layout removes it from flow.
  const chrome = [document.querySelector('.topbar'), document.querySelector('.collection')]
    .filter(Boolean)
    .map(element => ({ element, rect: element.getBoundingClientRect(), display: getComputedStyle(element).display, style: element.getAttribute('style') }));
  const restore = () => {
    for (const item of chrome) {
      if (item.style === null) item.element.removeAttribute('style'); else item.element.setAttribute('style', item.style);
    }
  };
  // Leaving: mark the returning chrome transparent before it becomes visible.
  if (!entering) body.classList.add('minimal-switch');
  const finish = () => toggle().then(() => {
    if (entering) {
      // Keep the old chrome as a fading, out-of-flow overlay; the centered layout
      // is already active, so both the fade and the move can start right now.
      for (const { element, rect, display } of chrome) {
        const current = element.getAttribute('style');
        element.style.cssText = `${current ? current + ';' : ''}position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;display:${display};pointer-events:none;z-index:-1;`;
      }
      void body.offsetWidth; // Commit opacity 1 before the fade class is added.
      body.classList.add('minimal-switch');
    }
    const after = content.getBoundingClientRect();
    const dx = before.left - after.left, dy = before.top - after.top;
    let animation;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      animation = content.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' }
      ], { duration: MINIMAL_MOVE, easing: 'cubic-bezier(.22,.8,.2,1)' });
    }
    const cleanup = () => { body.classList.remove('minimal-switch'); restore(); };
    // Entering: keep the overlay until the fade-out finishes. Leaving: fade in now.
    if (entering) setTimeout(cleanup, MINIMAL_FADE);
    else requestAnimationFrame(cleanup);
    return animation?.finished ?? Promise.resolve();
  }).catch(error => {
    body.classList.remove('minimal-switch'); restore(); throw error;
  }).finally(() => { minimalSwitching = false; });
  finish().catch(report);
}
function openFallback(blob, engine, reason) {
  fallbackBlob = blob; fallbackEngine = engine; $('#fallback-message').textContent = reason; $('#fallback-copy').disabled = !blob; $('#fallback-download').disabled = !blob; if (!$('#fallback-dialog').open) $('#fallback-dialog').showModal();
}
async function importBackup(mode) {
  if (!pendingBackup) return;
  const buttons = [$('#import-merge'), $('#import-replace')];
  for (const button of buttons) button.disabled = true;
  try {
    await run(async () => {
      if (!pendingBackup) return; // A double click queued a second (now empty) import.
      const plan = planImport(data, pendingBackup, mode);
      const imported = validateData({ ...plan.data, revision: (data.revision ?? 0) + 1 });
      const oldWallpaper = await wallpaper.getCurrent();
      const decoded = plan.assets.map(asset => [asset.id, dataURLToBlob(asset.data)]);
      // Decode before any writes. Imported SVG/HTML and malformed image data never render.
      for (const [, blob] of decoded) { const bitmap = await createImageBitmap(blob); bitmap.close(); }
      await assetStore.putMany(decoded);
      try {
        if (mode === 'replace' && !plan.assets.some(asset => asset.id === 'wallpaper')) await wallpaper.clear();
        await chrome.storage.local.set(mode === 'replace' ? { appData: imported, devicePrefs: plan.prefs } : { appData: imported });
      } catch (error) { if (mode === 'replace') { if (oldWallpaper) await assetStore.put('wallpaper', oldWallpaper); else await wallpaper.clear(); } throw error; }
      data = imported; if (mode === 'replace') prefs = plan.prefs;
      pendingBackup = null; $('#import-dialog').close(); render(); await renderWallpaper(wallpaper, prefs.wallpaper); updateWallpaperThumb().catch(() => {}); scheduleAssetGC(); toast('导入完成');
    });
  } finally {
    for (const button of buttons) button.disabled = false;
  }
}
async function start() {
  [data, prefs] = await Promise.all([store.load(), loadPrefs()]); active = data.groups[0]?.id; bindDialogClose(); render();
  // Grid renders without waiting for IDB or the full wallpaper to decode.
  renderWallpaper(wallpaper, prefs.wallpaper).catch(report); startClock(() => prefs); scheduleAssetGC(); $('#search-input').focus();
  on('#search-form', 'submit', event => { event.preventDefault(); const query = $('#search-input').value.trim(); if (query) window.open(searchURL(prefs.engine, query), '_blank', 'noopener,noreferrer'); });
  on('#engine', 'click', () => { if ($('#engine-menu').hidden) openEngineMenu(); else closeEngineMenu(); });
  $('#engine-menu').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); closeEngineMenu(); $('#engine').focus(); return; }
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...$('#engine-menu').querySelectorAll('button')]; if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (forward ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  });
  $('#engine-menu').addEventListener('focusout', event => { const next = event.relatedTarget; if (!(next instanceof Element) || (!next.closest('#engine-menu') && next !== $('#engine'))) closeEngineMenu(); });
  document.addEventListener('pointerdown', event => { if (!(event.target instanceof Element)) return; if (!event.target.closest('#engine-menu') && !event.target.closest('#engine')) closeEngineMenu(); });
  document.addEventListener('scroll', closeEngineMenu, true); window.addEventListener('resize', closeEngineMenu);
  on('#minimal-toggle', 'click', () => switchMinimal());
  on('#drawer-toggle', 'click', () => drawer(!document.body.classList.contains('drawer-open')));
  on('#drawer-backdrop', 'click', () => drawer(false));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('#context-menu').hidden) return; // the menu's own handler closes it and restores focus
    if (!$('#engine-menu').hidden) { closeEngineMenu(); $('#engine').focus(); return; }
    if (document.body.classList.contains('settings-open')) closeSettings(); else drawer(false);
  });
  on('#add-group', 'click', () => addGroup()); on('#settings-open', 'click', openSettings);
  on('#settings-close', 'click', closeSettings); on('#settings-backdrop', 'click', closeSettings);
  $('#settings-panel').addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...$('#settings-panel').querySelectorAll('button, select, input')].filter(item => !item.disabled && item.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.querySelectorAll('[data-setting]').forEach(select => select.addEventListener('change', () => {
    // Capture the value now; the queued save may run after the control was reset.
    const key = select.dataset.setting, value = select.value;
    (key === 'layout' ? changePrefs(next => { next.layout = value; }) : change(draft => { draft.settings[key] = value; })).catch(report);
  }));
  document.querySelectorAll('[data-pref]').forEach(input => input.addEventListener('change', () => {
    const key = input.dataset.pref, value = input.type === 'checkbox' ? input.checked : input.value;
    changePrefs(next => { next[key] = value; }).catch(report);
  }));
  const themeChoices = [...document.querySelectorAll('[data-theme-choice]')];
  themeChoices.forEach((button, index) => {
    button.addEventListener('click', () => applyPrefs(next => { next.theme = button.dataset.themeChoice; }).catch(report));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = themeChoices[(index + direction + themeChoices.length) % themeChoices.length];
      next.focus(); next.click();
    });
  });
  on('#wallpaper-input', 'change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { await wallpaper.set(file); await changePrefs(next => { next.wallpaper = 'custom'; }); await renderWallpaper(wallpaper, 'custom'); await updateWallpaperThumb(); toast('壁纸已保存'); } finally { event.target.value = ''; }
  });
  const wallpaperChoices = [...document.querySelectorAll('[data-wallpaper]')];
  wallpaperChoices.forEach((button, index) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.wallpaper;
      if (choice === 'custom') { $('#wallpaper-input').click(); return; }
      changePrefs(next => { next.wallpaper = choice; }).then(() => renderWallpaper(wallpaper, choice)).catch(report);
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = wallpaperChoices[(index + direction + wallpaperChoices.length) % wallpaperChoices.length];
      next.focus(); next.click();
    });
  });
  on('#export-data', 'click', async () => { const backup = await buildBackup(data, prefs, assetStore, $('#include-assets').checked); download(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `easy-tab-${new Date().toISOString().slice(0, 10)}.json`); });
  on('#import-open', 'click', () => $('#import-file').click());
  on('#import-file', 'change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return; if (file.size > 120 * 1024 * 1024) throw new Error('备份文件不能超过 120MB');
    pendingBackup = parseBackup(JSON.parse(await file.text()));
    $('#import-summary').textContent = `${pendingBackup.data.groups.length} 个分组 · ${pendingBackup.data.groups.reduce((sum, group) => sum + group.sites.length, 0)} 个站点 · ${pendingBackup.assets.length} 张图片`;
    closeSettings(); $('#import-dialog').showModal();
  });
  on('#import-merge', 'click', () => importBackup('merge')); on('#import-replace', 'click', () => importBackup('replace'));
  bindContextMenu({
    addSite: chooseNewSite, addGroup, editSite: addSite, renameGroup: addGroup,
    deleteSite: id => change(draft => { for (const group of draft.groups) group.sites = group.sites.filter(site => site.id !== id); }),
    resizeSite: (id, size) => change(draft => { const site = draft.groups.flatMap(group => group.sites).find(item => item.id === id); if (site && ['1x1', '2x1', '1x2', '2x2'].includes(size)) site.size = size; }),
    deleteGroup: async id => { const group = data.groups.find(item => item.id === id); if (group?.sites.length && !confirm(`删除“${group.name}”及其中的 ${group.sites.length} 个站点？`)) return; await change(draft => { draft.groups = draft.groups.filter(item => item.id !== id); }); },
    wallpaper: () => { openSettings(); $('#wallpaper-input').click(); }, settings: openSettings, error: report,
  });
  bindDragSort($('#grid'), $('#groups'), (siteId, groupId, before) => {
    const target = groupId ?? active;
    commitData(draft => moveSite(draft, siteId, target, before)).catch(report);
  });
  bindGroupDragSort($('#groups'), (groupId, before) => {
    commitData(draft => moveGroup(draft, groupId, before)).catch(report);
  });
  bindGridLayout($('.collection'));
  // Global group shortcut: Up/Down anywhere except while typing or in another surface.
  document.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input,textarea,select,[contenteditable="true"],dialog,#settings-panel,#engine-menu,#context-menu')) return;
    if (document.querySelector('dialog[open]') || document.body.classList.contains('settings-open')) return;
    if (!$('#engine-menu').hidden || !$('#context-menu').hidden) return;
    const index = data.groups.findIndex(group => group.id === active);
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const next = data.groups[index + direction];
    if (!next) return;
    event.preventDefault();
    selectGroup(next.id, direction);
  });
  let dragDepth = 0, imageRequest = 0;
  const resetImageDrag = () => { dragDepth = 0; $('#search-form').classList.remove('drag-over'); };
  const prepareImageSearch = async (load, engine) => {
    const request = ++imageRequest;
    try {
      const blob = await load;
      if (request !== imageRequest) return;
      if (imageSearchAdapters[engine].verified) {
        try {
          await imageSearchAdapters[engine].submit(blob);
          openFallback(blob, engine, '已提交图片。若没有出现识图结果，可复制图片到官方页面继续。');
        } catch { openFallback(blob, engine, '图片未能自动上传。请复制图片，在官方图搜页面粘贴。'); }
      } else openFallback(blob, engine, `已准备好图片。点击“复制图片并打开图搜”，在 ${engines[engine].name} 页面的相机入口粘贴（⌘V / Ctrl+V）。`);
    } catch (error) {
      if (request !== imageRequest) return;
      if (error.message.startsWith('仅支持') || error.message.includes('10MB') || error.message.includes('为空')) report(error);
      else openFallback(null, engine, '网页图片无法读取，可能受到跨域或网络限制。请先保存图片，再打开官方图搜页面上传。');
    }
  };
  on('#image-search-open', 'click', () => {
    const tab = window.open(engines[prefs.engine].images, '_blank'); if (tab) tab.opener = null;
    else toast('新页面被拦截，请允许此页面打开新标签页后重试');
  });
  $('#search-form').addEventListener('dragenter', event => { if (event.dataTransfer.types.includes('application/x-easy-tab-site')) return; event.preventDefault(); dragDepth++; $('#search-form').classList.add('drag-over'); });
  $('#search-form').addEventListener('dragover', event => { if (!event.dataTransfer.types.includes('application/x-easy-tab-site')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
  $('#search-form').addEventListener('dragleave', () => { if (--dragDepth <= 0) resetImageDrag(); });
  $('#search-form').addEventListener('drop', event => {
    if (event.dataTransfer.types.includes('application/x-easy-tab-site')) return;
    event.preventDefault(); resetImageDrag();
    // Read transfer contents immediately, before the browser protects the dropped data.
    prepareImageSearch(imageFromDrop(event.dataTransfer), prefs.engine);
  });
  window.addEventListener('blur', resetImageDrag);
  document.addEventListener('dragend', resetImageDrag);
  const openOfficialImages = () => {
    const tab = window.open(engines[fallbackEngine].images, '_blank'); if (tab) tab.opener = null;
    return tab;
  };
  on('#fallback-open', 'click', () => { if (!openOfficialImages()) toast('新页面被拦截，请允许此页面打开新标签页后重试'); });
  on('#fallback-copy', 'click', async () => {
    const button = $('#fallback-copy'); if (!fallbackBlob || button.disabled) return;
    button.disabled = true;
    try {
      const { opened } = await copyAndOpenImage(fallbackBlob, fallbackEngine, openOfficialImages);
      if (!opened) $('#fallback-message').textContent = '图片已复制，但新页面被拦截。请点击“打开图搜页面”，在相机入口粘贴（⌘V / Ctrl+V）。';
      else { $('#fallback-dialog').close(); toast('图片已复制，请在官方图搜页面的相机入口粘贴（⌘V / Ctrl+V）'); }
    } catch (error) { $('#fallback-message').textContent = `${error.message || '图片复制失败'}。可保存图片后在官方图搜页面上传。`; }
    finally { button.disabled = !fallbackBlob; }
  });
  on('#fallback-download', 'click', () => {
    if (!fallbackBlob) return;
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[fallbackBlob.type] || 'img';
    download(fallbackBlob, `easy-tab-search-image.${ext}`);
  });
  store.onExternalChange(next => run(async () => {
    // Our own write fires the same event; skip the redundant full render.
    if (JSON.stringify(next) === JSON.stringify(data)) return;
    data = next; render();
  }).catch(report));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.devicePrefs) return;
    run(async () => {
      const next = await loadPrefs();
      if (JSON.stringify(next) === JSON.stringify(prefs)) return;
      prefs = next; applySettings(data, prefs); updateEngine();
      await renderWallpaper(wallpaper, prefs.wallpaper);
    }).catch(report);
  });
}
start().catch(error => { report(error); $('#grid').textContent = '数据加载失败。请检查扩展权限或备份后重装；已有数据未被自动清空。'; });
