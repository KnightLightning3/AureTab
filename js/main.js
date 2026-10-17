import { LocalDataStore, loadPrefs, savePrefs } from './storage/LocalDataStore.js';
import { assetStore } from './storage/idb.js';
import { LocalWallpaperProvider, renderWallpaper, compressImage } from './wallpaper/Local.js';
import { engines, searchURL } from './search/engines.js';
import { imageSearchAdapters, imageFromDrop, copyImage } from './search/imageSearch.js';
import { renderGroups, renderGrid } from './grid/render.js';
import { bindDragSort } from './grid/dragSort.js';
import { bindContextMenu } from './ui/contextMenu.js';
import { $, toast, report, bindDialogClose, editDialog } from './ui/dialogs.js';
import { applySettings } from './ui/settings.js';
import { startClock } from './ui/clock.js';
import { mountIconPicker } from './ui/iconPicker.js';
import { buildBackup, download, parseBackup, planImport, dataURLToBlob } from './io/exportImport.js';
import { safeURL, validateData } from './io/schema.js';

const store = new LocalDataStore(); const wallpaper = new LocalWallpaperProvider();
let data, prefs, active, pendingBackup, fallbackBlob, fallbackEngine, settingsReturnFocus;
let queue = Promise.resolve();
const run = action => { const result = queue.then(action); queue = result.catch(() => {}); return result; };
const on = (selector, event, action) => $(selector).addEventListener(event, e => { try { Promise.resolve(action(e)).catch(report); } catch (error) { report(error); } });
function drawer(open) { document.body.classList.toggle('drawer-open', open); $('#drawer-backdrop').hidden = !open; $('#drawer-toggle').setAttribute('aria-expanded', String(open)); }
function toggleSettings(open) {
  const panel = $('#settings-panel');
  document.body.classList.toggle('settings-open', open);
  panel.inert = !open; panel.setAttribute('aria-hidden', String(!open)); $('#settings-open').setAttribute('aria-expanded', String(open));
  if (open) settingsReturnFocus = document.activeElement;
  else if (settingsReturnFocus?.isConnected && settingsReturnFocus !== document.body) { settingsReturnFocus.focus(); settingsReturnFocus = null; }
}
function render() {
  if (!data.groups.some(group => group.id === active)) active = data.groups[0]?.id;
  renderGroups(data.groups, active, id => { active = id; drawer(false); render(); });
  renderGrid(data.groups.find(group => group.id === active), assetStore, () => addSite().catch(report));
  applySettings(data, prefs); updateEngine();
}
function updateEngine() {
  const engine = engines[prefs.engine]; const trigger = $('#engine'); let icon = trigger.querySelector('.engine-icon');
  if (!icon) { trigger.replaceChildren(); icon = document.createElement('span'); icon.className = 'engine-icon'; icon.setAttribute('aria-hidden', 'true'); trigger.append(icon); }
  icon.dataset.engine = prefs.engine; trigger.setAttribute('aria-label', `搜索引擎：${engine.name}`); $('.drop-hint').textContent = `松开以 ${engine.name} 识图`;
}
function closeEngineMenu() { const menu = $('#engine-menu'); if (menu.hidden) return; menu.hidden = true; $('#engine').setAttribute('aria-expanded', 'false'); }
function openEngineMenu() {
  const menu = $('#engine-menu'); const trigger = $('#engine'); menu.replaceChildren();
  for (const [id, engine] of Object.entries(engines)) {
    const item = document.createElement('button'); item.type = 'button'; item.setAttribute('role', 'menuitemradio'); item.setAttribute('aria-checked', String(prefs.engine === id));
    const icon = document.createElement('span'); icon.className = 'engine-icon'; icon.dataset.engine = id; icon.setAttribute('aria-hidden', 'true');
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
async function change(action) {
  return run(async () => { const draft = structuredClone(data); await action(draft); const valid = validateData(draft); await store.save(valid); data = valid; render(); });
}
async function changePrefs(action) { return run(async () => { const next = { ...prefs }; action(next); await savePrefs(next); prefs = next; applySettings(data, prefs); updateEngine(); }); }
function applyPrefs(next) { prefs = next; applySettings(data, prefs); updateEngine(); run(() => savePrefs(next)).catch(report); }
async function addGroup(id) {
  const group = data.groups.find(item => item.id === id);
  const values = await editDialog(group ? '重命名分组' : '新建分组', [{ name: 'name', label: '分组名称', value: group?.name ?? '', required: true, maxLength: 40 }]);
  if (!values) return;
  await change(draft => { if (id) { const target = draft.groups.find(item => item.id === id); if (!target) throw new Error('该分组已被删除'); target.name = values.get('name').trim(); } else { const newId = crypto.randomUUID(); draft.groups.push({ id: newId, name: values.get('name').trim(), sites: [] }); active = newId; } });
}
async function addSite(id) {
  if (!data.groups.length) { await addGroup(); if (!data.groups.length) return; }
  const group = id ? data.groups.find(item => item.sites.some(site => site.id === id)) : data.groups.find(item => item.id === active);
  const site = group?.sites.find(item => item.id === id);
  const fields = [
    { name: 'title', label: '站点名称', value: site?.title ?? '', required: true, maxLength: 120 },
    { name: 'url', label: '网址（HTTP / HTTPS）', value: site?.url ?? 'https://', required: true, type: 'url' },
    { name: 'text', label: '文字图标（1 至 3 个字符）', value: site?.text ?? '', maxLength: 6 },
    { name: 'size', label: '尺寸', value: site?.size ?? '1x1', options: [['1x1', '1 × 1'], ['2x1', '2 × 1 横向'], ['1x2', '1 × 2 纵向'], ['2x2', '2 × 2']] },
    { name: 'icon', label: '上传自定义图标（可选）', type: 'file', accept: 'image/*' },
  ];
  if (site?.iconId) fields.push({ name: 'removeIcon', label: '已有自定义图片', options: [['keep', '保留'], ['remove', '移除，恢复网站或文字图标']] });
  const values = await editDialog(site ? '编辑图标' : '添加图标', fields, ({ form, container }) => mountIconPicker(container, form, site));
  if (!values) return;
  const title = values.get('title').trim(); const url = safeURL(values.get('url').trim());
  const text = values.get('text').trim() || Array.from(title).slice(0, 2).join('');
  if (Array.from(text).length > 3) throw new Error('文字图标最多 3 个字符');
  const choice = values.get('iconChoice') || (site?.iconId ? 'custom' : site?.useText ? 'text' : 'color');
  const next = { id: site?.id ?? crypto.randomUUID(), title, url, text, size: values.get('size') };
  const file = values.get('icon');
  if (file?.size) { next.iconId = `icon:${crypto.randomUUID()}`; next.iconStyle = 'color'; await assetStore.put(next.iconId, await compressImage(file, 256)); }
  else if (choice === 'custom' && site?.iconId && values.get('removeIcon') !== 'remove') { next.iconId = site.iconId; next.iconStyle = site.iconStyle === 'glyph' ? 'glyph' : 'color'; }
  else if (choice === 'text') next.useText = true;
  else { next.useText = false; next.iconStyle = choice === 'glyph' ? 'glyph' : 'color'; }
  await change(draft => { const target = draft.groups.find(item => item.id === group.id); if (!target) throw new Error('分组已被删除，请重试'); if (id) { const index = target.sites.findIndex(item => item.id === id); if (index < 0) throw new Error('图标已被删除'); target.sites[index] = next; } else target.sites.push(next); });
}
function openSettings() { closeEngineMenu(); applySettings(data, prefs); toggleSettings(true); $('#settings-close').focus(); }
function closeSettings() { if (document.body.classList.contains('settings-open')) toggleSettings(false); }
function openFallback(blob, engine, reason) {
  fallbackBlob = blob; fallbackEngine = engine; $('#fallback-message').textContent = reason; $('#fallback-copy').disabled = !blob; $('#fallback-download').disabled = !blob; $('#fallback-dialog').showModal();
}
async function importBackup(mode) {
  if (!pendingBackup) return;
  await run(async () => {
    const plan = planImport(data, pendingBackup, mode);
    const oldWallpaper = await wallpaper.getCurrent();
    const decoded = plan.assets.map(asset => [asset.id, dataURLToBlob(asset.data)]);
    // Decode before any writes. Imported SVG/HTML and malformed image data never render.
    for (const [, blob] of decoded) { const bitmap = await createImageBitmap(blob); bitmap.close(); }
    await assetStore.putMany(decoded);
    try {
      if (mode === 'replace' && !plan.assets.some(asset => asset.id === 'wallpaper')) await wallpaper.clear();
      await chrome.storage.local.set(mode === 'replace' ? { appData: plan.data, devicePrefs: plan.prefs } : { appData: plan.data });
    } catch (error) { if (mode === 'replace') { if (oldWallpaper) await assetStore.put('wallpaper', oldWallpaper); else await wallpaper.clear(); } throw error; }
    data = plan.data; if (mode === 'replace') prefs = plan.prefs;
    pendingBackup = null; $('#import-dialog').close(); render(); await renderWallpaper(wallpaper); toast('导入完成');
  });
}
async function start() {
  [data, prefs] = await Promise.all([store.load(), loadPrefs()]); active = data.groups[0]?.id; bindDialogClose(); render();
  // Grid renders without waiting for IDB or the full wallpaper to decode.
  renderWallpaper(wallpaper).catch(report); startClock(() => prefs); $('#search-input').focus();
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
  on('#minimal-toggle', 'click', () => {
    let applied = false;
    const apply = () => { if (applied) return; applied = true; applyPrefs({ ...prefs, minimal: !prefs.minimal }); };
    if (document.startViewTransition) {
      try { document.startViewTransition(apply); } catch { apply(); }
      setTimeout(apply, 260);
    } else apply();
  });
  on('#drawer-toggle', 'click', () => drawer(!document.body.classList.contains('drawer-open')));
  on('#drawer-backdrop', 'click', () => drawer(false));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('#engine-menu').hidden) { closeEngineMenu(); $('#engine').focus(); return; }
    if (document.body.classList.contains('settings-open')) closeSettings(); else drawer(false);
  });
  on('#add-site', 'click', () => addSite()); on('#add-group', 'click', () => addGroup()); on('#settings-open', 'click', openSettings);
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
    const key = select.dataset.setting; (key === 'layout' ? changePrefs(next => { next.layout = select.value; }) : change(draft => { draft.settings[key] = select.value; })).catch(report);
  }));
  document.querySelectorAll('[data-pref]').forEach(input => input.addEventListener('change', () => {
    const key = input.dataset.pref;
    changePrefs(next => { next[key] = input.type === 'checkbox' ? input.checked : input.value; }).catch(report);
  }));
  const themeChoices = [...document.querySelectorAll('[data-theme-choice]')];
  themeChoices.forEach((button, index) => {
    button.addEventListener('click', () => applyPrefs({ ...prefs, theme: button.dataset.themeChoice }));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = themeChoices[(index + direction + themeChoices.length) % themeChoices.length];
      next.focus(); next.click();
    });
  });
  on('#wallpaper-input', 'change', async event => { const file = event.target.files[0]; if (!file) return; try { await wallpaper.set(file); await renderWallpaper(wallpaper); toast('壁纸已保存'); } finally { event.target.value = ''; } });
  on('#wallpaper-clear', 'click', async () => { await wallpaper.clear(); await renderWallpaper(wallpaper); });
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
    addSite, addGroup, editSite: addSite, renameGroup: addGroup,
    deleteSite: id => change(draft => { for (const group of draft.groups) group.sites = group.sites.filter(site => site.id !== id); }),
    resizeSite: (id, size) => change(draft => { const site = draft.groups.flatMap(group => group.sites).find(item => item.id === id); if (site && ['1x1', '2x1', '1x2', '2x2'].includes(size)) site.size = size; }),
    deleteGroup: async id => { const group = data.groups.find(item => item.id === id); if (group?.sites.length && !confirm(`删除“${group.name}”及其中的 ${group.sites.length} 个站点？`)) return; await change(draft => { draft.groups = draft.groups.filter(item => item.id !== id); }); },
    wallpaper: () => { openSettings(); $('#wallpaper-input').click(); }, settings: openSettings, error: report,
  });
  bindDragSort($('#grid'), $('#groups'), () => data, () => active, () => { const snapshot = structuredClone(data); run(async () => { await store.save(snapshot); data = snapshot; render(); }).catch(error => { report(error); store.load().then(value => { data = value; render(); }).catch(report); }); });
  let wheelLocked = false, wheelIdle;
  $('#sidebar').addEventListener('wheel', event => {
    if (event.ctrlKey || data.groups.length < 2 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const direction = Math.sign(event.deltaY);
    if (!direction) return;
    event.preventDefault();
    clearTimeout(wheelIdle); wheelIdle = setTimeout(() => { wheelLocked = false; }, 160);
    if (wheelLocked) return;
    wheelLocked = true;
    const index = data.groups.findIndex(group => group.id === active);
    const next = data.groups[(index + direction + data.groups.length) % data.groups.length];
    if (next) { active = next.id; render(); }
  }, { passive: false });
  let dragDepth = 0;
  $('#search-form').addEventListener('dragenter', event => { if (event.dataTransfer.types.includes('application/x-easy-tab-site')) return; event.preventDefault(); dragDepth++; $('#search-form').classList.add('drag-over'); });
  $('#search-form').addEventListener('dragover', event => { if (!event.dataTransfer.types.includes('application/x-easy-tab-site')) event.preventDefault(); });
  $('#search-form').addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#search-form').classList.remove('drag-over'); } });
  $('#search-form').addEventListener('drop', async event => {
    if (event.dataTransfer.types.includes('application/x-easy-tab-site')) return;
    event.preventDefault(); dragDepth = 0; $('#search-form').classList.remove('drag-over'); const engine = prefs.engine;
    try {
      const blob = await imageFromDrop(event.dataTransfer);
      try { await imageSearchAdapters[engine].submit(blob); openFallback(blob, engine, '已尝试提交。若没有显示结果，可复制图片到官方页面继续。'); }
      catch { openFallback(blob, engine, '上传接口尚未抓包验证。请复制图片并到官方图搜页面粘贴。'); }
    } catch (error) { if (error.message === '仅支持图片' || error.message.includes('10MB')) report(error); else { openFallback(null, engine, '网页图片无法下载（可能受跨域或网络限制）。请先将图片保存到本地后拖入。'); } }
  });
  // Keep this listener synchronous up to window.open so the new tab retains a click gesture.
  $('#fallback-copy').addEventListener('click', () => {
    const tab = window.open(engines[fallbackEngine].images, '_blank'); if (tab) tab.opener = null;
    copyImage(fallbackBlob).then(() => { $('#fallback-dialog').close(); toast('已复制图片，请在页面中按 Ctrl+V'); }).catch(error => { $('#fallback-message').textContent = `${error.message}。也可保存图片后在官方页面上传。`; });
  });
  on('#fallback-download', 'click', () => download(fallbackBlob, 'easy-tab-search-image'));
  store.onExternalChange(next => { data = next; render(); });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.devicePrefs) loadPrefs().then(next => { prefs = next; applySettings(data, prefs); updateEngine(); }).catch(report); });
}
start().catch(error => { report(error); $('#grid').textContent = '数据加载失败。请检查扩展权限或备份后重装；已有数据未被自动清空。'; });
