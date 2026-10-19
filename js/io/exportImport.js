import { validateData, parseBackup, isParsedBackup } from './schema.js';
export { parseBackup } from './schema.js';
export const blobToDataURL = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
export function dataURLToBlob(data) { const [header, encoded] = data.split(','); const binary = atob(encoded); return new Blob([Uint8Array.from(binary, ch => ch.charCodeAt(0))], { type: header.slice(5, header.indexOf(';')) }); }
export function download(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
/** Bounded concurrency keeps large exports from opening hundreds of transactions at once. */
async function mapLimit(items, limit, task) {
  const results = new Array(items.length); let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) { const current = index++; results[current] = await task(items[current]); }
  }));
  return results;
}
export async function buildBackup(data, prefs, store, includeAssets) {
  const copy = structuredClone(data); const assets = [];
  const ids = new Set(copy.groups.flatMap(group => group.sites.map(site => site.iconId).filter(id => id && id !== 'wallpaper')));
  if (includeAssets) {
    const read = await mapLimit(['wallpaper', ...ids], 4, async id => {
      const blob = await store.get(id);
      return blob ? { id, data: await blobToDataURL(blob) } : null;
    });
    for (const asset of read) if (asset) assets.push(asset);
  }
  const included = new Set(assets.map(asset => asset.id));
  for (const group of copy.groups) for (const site of group.sites) if (!included.has(site.iconId)) delete site.iconId;
  const exportedPrefs = structuredClone(prefs);
  // Without the blob, a "custom" wallpaper selection would import as a blank background.
  if (!includeAssets && exportedPrefs.wallpaper === 'custom') exportedPrefs.wallpaper = 'none';
  return { version: 1, exportedAt: new Date().toISOString(), data: validateData(copy), prefs: exportedPrefs, assets };
}
/** Renames every imported image/site/group ID, preventing collisions with existing data.
 * Asset IDs on replacement are also new: a failed metadata write cannot corrupt current images.
 */
export function planImport(current, raw, mode) {
  if (!['merge', 'replace'].includes(mode)) throw new Error('未知导入方式');
  // An already-validated backup skips the (expensive) base64 re-scan.
  const backup = isParsedBackup(raw) ? raw : parseBackup(raw);
  const assets = []; const mapping = new Map();
  // Never write asset payloads that no site in the backup references.
  const referenced = new Set(backup.data.groups.flatMap(group => group.sites.map(site => site.iconId).filter(Boolean)));
  for (const asset of backup.assets) {
    if (asset.id === 'wallpaper') { if (mode === 'replace') assets.push(asset); continue; }
    if (!referenced.has(asset.id)) continue;
    const id = `icon:${crypto.randomUUID()}`; mapping.set(asset.id, id); assets.push({ id, data: asset.data });
  }
  // Copy only the metadata so a retry never sees mutated IDs or references.
  const groups = structuredClone(backup.data.groups);
  for (const group of groups) {
    if (mode === 'merge') group.id = crypto.randomUUID();
    for (const site of group.sites) { if (mode === 'merge') site.id = crypto.randomUUID(); if (site.iconId) { if (mapping.has(site.iconId)) site.iconId = mapping.get(site.iconId); else delete site.iconId; } }
  }
  const data = mode === 'merge' ? { ...structuredClone(current), groups: [...structuredClone(current.groups), ...groups] } : { ...backup.data, groups };
  const prefs = { ...backup.prefs };
  // Legacy backups can select a custom wallpaper whose blob was not exported.
  if (mode === 'replace' && prefs.wallpaper === 'custom' && !backup.assets.some(asset => asset.id === 'wallpaper')) prefs.wallpaper = 'none';
  return { data: validateData(data), prefs, assets };
}
