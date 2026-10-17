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
import { buildBackup, download, parseBackup, planImport, dataURLToBlob } from './io/exportImport.js';
import { safeURL, validateData } from './io/schema.js';

const store = new LocalDataStore(); const wallpaper = new LocalWallpaperProvider();
let data, prefs, active, pendingBackup, fallbackBlob, fallbackEngine;
let queue = Promise.resolve();
const run = action => { const result = queue.then(action); queue = result.catch(() => {}); return result; };
const on = (selector, event, action) => $(selector).addEventListener(event, e => { try { Promise.resolve(action(e)).catch(report); } catch (error) { report(error); } });
function drawer(open) { document.body.classList.toggle('drawer-open', open); $('#drawer-backdrop').hidden = !open; $('#drawer-toggle').setAttribute('aria-expanded', String(open)); }
function render() {
  if (!data.groups.some(group => group.id === active)) active = data.groups[0]?.id;
  renderGroups(data.groups, active, id => { active = id; drawer(false); render(); });
  renderGrid(data.groups.find(group => group.id === active), assetStore, () => addSite().catch(report));
  applySettings(data, prefs); updateEngine();
}
function updateEngine() { const engine = engines[prefs.engine]; $('#engine').textContent = engine.mark; $('#engine').setAttribute('aria-label', `搜索引擎：${engine.name}`); $('.drop-hint').textContent = `松开以 ${engine.name} 识图`; }
async function change(action) {
  return run(async () => { const draft = structuredClone(data); await action(draft); const valid = validateData(draft); await store.save(valid); data = valid; render(); });
}
async function changePrefs(action) { return run(async () => { const next = { ...prefs }; action(next); await savePrefs(next); prefs = next; applySettings(data, prefs); updateEngine(); }); }
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
  const values = await editDialog(site ? '编辑图标' : '添加图标', [
    { name: 'title', label: '站点名称', value: site?.title ?? '', required: true, maxLength: 120 },
    { name: 'url', label: '网址（HTTP / HTTPS）', value: site?.url ?? 'https://', required: true, type: 'url' },
    { name: 'text', label: '文字图标（1 至 3 个字符）', value: site?.text ?? '', maxLength: 6 },
    { name: 'style', label: '图标显示', value: site?.useText ? 'text' : 'auto', options: [['auto', '网站图标优先'], ['text', '使用文字图标']] },
    { name: 'size', label: '尺寸', value: site?.size ?? '1x1', options: [['1x1', '1 × 1'], ['2x2', '2 × 2']] },
    { name: 'icon', label: '上传自定义图标（可选）', type: 'file', accept: 'image/*' },
    { name: 'removeIcon', label: '已有自定义图片', options: [['keep', '保留'], ['remove', '移除，恢复网站或文字图标']] },
  ]);
  if (!values) return;
  const title = values.get('title').trim(); const url = safeURL(values.get('url').trim());
  const text = values.get('text').trim() || Array.from(title).slice(0, 2).join('');
  if (Array.from(text).length > 3) throw new Error('文字图标最多 3 个字符');
  const next = { id: site?.id ?? crypto.randomUUID(), title, url, text, size: values.get('size'), useText: values.get('style') === 'text' };
  if (site?.iconId && values.get('removeIcon') !== 'remove') next.iconId = site.iconId;
  const file = values.get('icon');
  if (file?.size) { next.iconId = `icon:${crypto.randomUUID()}`; await assetStore.put(next.iconId, await compressImage(file, 256)); }
  await change(draft => { const target = draft.groups.find(item => item.id === group.id); if (!target) throw new Error('分组已被删除，请重试'); if (id) { const index = target.sites.findIndex(item => item.id === id); if (index < 0) throw new Error('图标已被删除'); target.sites[index] = next; } else target.sites.push(next); });
}
function openSettings() { applySettings(data, prefs); $('#settings-dialog').showModal(); }
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
  renderWallpaper(wallpaper).catch(report); $('#search-input').focus();
  on('#search-form', 'submit', event => { event.preventDefault(); const query = $('#search-input').value.trim(); if (query) window.open(searchURL(prefs.engine, query), '_blank', 'noopener,noreferrer'); });
  on('#engine', 'click', () => changePrefs(next => { const ids = Object.keys(engines); next.engine = ids[(ids.indexOf(next.engine) + 1) % ids.length]; }));
  on('#minimal-toggle', 'click', () => changePrefs(next => { next.minimal = !next.minimal; }));
  on('#drawer-toggle', 'click', () => drawer(!document.body.classList.contains('drawer-open')));
  on('#drawer-backdrop', 'click', () => drawer(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') drawer(false); });
  on('#add-site', 'click', () => addSite()); on('#add-group', 'click', () => addGroup()); on('#settings-open', 'click', openSettings);
  document.querySelectorAll('[data-setting]').forEach(select => select.addEventListener('change', () => {
    const key = select.dataset.setting; (key === 'layout' ? changePrefs(next => { next.layout = select.value; }) : change(draft => { draft.settings[key] = select.value; })).catch(report);
  }));
  on('#wallpaper-input', 'change', async event => { const file = event.target.files[0]; if (!file) return; try { await wallpaper.set(file); await renderWallpaper(wallpaper); toast('壁纸已保存'); } finally { event.target.value = ''; } });
  on('#wallpaper-clear', 'click', async () => { await wallpaper.clear(); await renderWallpaper(wallpaper); });
  on('#export-data', 'click', async () => { const backup = await buildBackup(data, prefs, assetStore, $('#include-assets').checked); download(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `easy-tab-${new Date().toISOString().slice(0, 10)}.json`); });
  on('#import-open', 'click', () => $('#import-file').click());
  on('#import-file', 'change', async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return; if (file.size > 120 * 1024 * 1024) throw new Error('备份文件不能超过 120MB');
    pendingBackup = parseBackup(JSON.parse(await file.text()));
    $('#import-summary').textContent = `${pendingBackup.data.groups.length} 个分组 · ${pendingBackup.data.groups.reduce((sum, group) => sum + group.sites.length, 0)} 个站点 · ${pendingBackup.assets.length} 张图片`;
    $('#settings-dialog').close(); $('#import-dialog').showModal();
  });
  on('#import-merge', 'click', () => importBackup('merge')); on('#import-replace', 'click', () => importBackup('replace'));
  bindContextMenu({
    addSite, addGroup, editSite: addSite, renameGroup: addGroup,
    deleteSite: id => change(draft => { for (const group of draft.groups) group.sites = group.sites.filter(site => site.id !== id); }),
    resizeSite: id => change(draft => { const site = draft.groups.flatMap(group => group.sites).find(item => item.id === id); if (site) site.size = site.size === '1x1' ? '2x2' : '1x1'; }),
    deleteGroup: async id => { const group = data.groups.find(item => item.id === id); if (group?.sites.length && !confirm(`删除“${group.name}”及其中的 ${group.sites.length} 个站点？`)) return; await change(draft => { draft.groups = draft.groups.filter(item => item.id !== id); }); },
    wallpaper: () => { openSettings(); $('#wallpaper-input').click(); }, settings: openSettings, error: report,
  });
  bindDragSort($('#grid'), $('#groups'), () => data, () => active, () => { const snapshot = structuredClone(data); run(async () => { await store.save(snapshot); data = snapshot; render(); }).catch(error => { report(error); store.load().then(value => { data = value; render(); }).catch(report); }); });
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
