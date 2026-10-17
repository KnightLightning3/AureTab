import { validateData, parseBackup } from './schema.js';
export { parseBackup } from './schema.js';
export const blobToDataURL = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
export function dataURLToBlob(data) { const [header, encoded] = data.split(','); const binary = atob(encoded); return new Blob([Uint8Array.from(binary, ch => ch.charCodeAt(0))], { type: header.slice(5, header.indexOf(';')) }); }
export function download(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function buildBackup(data, prefs, store, includeAssets) {
  const copy = structuredClone(data); const assets = [];
  const ids = new Set(copy.groups.flatMap(group => group.sites.map(site => site.iconId).filter(Boolean)));
  if (includeAssets) {
    for (const id of ['wallpaper', ...ids]) { const blob = await store.get(id); if (blob) assets.push({ id, data: await blobToDataURL(blob) }); }
  }
  const included = new Set(assets.map(asset => asset.id));
  for (const group of copy.groups) for (const site of group.sites) if (!included.has(site.iconId)) delete site.iconId;
  return { version: 1, exportedAt: new Date().toISOString(), data: validateData(copy), prefs: structuredClone(prefs), assets };
}
/** Renames every imported image/site/group ID, preventing collisions with existing data.
 * Asset IDs on replacement are also new: a failed metadata write cannot corrupt current images.
 */
export function planImport(current, raw, mode) {
  if (!['merge', 'replace'].includes(mode)) throw new Error('未知导入方式');
  const backup = parseBackup(raw); const assets = []; const mapping = new Map();
  for (const asset of backup.assets) {
    if (asset.id === 'wallpaper') { if (mode === 'replace') assets.push(asset); continue; }
    const id = `icon:${crypto.randomUUID()}`; mapping.set(asset.id, id); assets.push({ id, data: asset.data });
  }
  for (const group of backup.data.groups) {
    if (mode === 'merge') group.id = crypto.randomUUID();
    for (const site of group.sites) { if (mode === 'merge') site.id = crypto.randomUUID(); if (site.iconId) { if (mapping.has(site.iconId)) site.iconId = mapping.get(site.iconId); else delete site.iconId; } }
  }
  const data = mode === 'merge' ? { ...structuredClone(current), groups: [...structuredClone(current.groups), ...backup.data.groups] } : backup.data;
  return { data: validateData(data), prefs: backup.prefs, assets };
}
