import { WallpaperProvider } from './WallpaperProvider.js';
import { assetStore } from '../storage/idb.js';
export async function compressImage(file, maxEdge = 1920, { preserveAlpha = false } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('仅支持图片');
  if (file.size > 30 * 1024 * 1024) throw new Error('壁纸或图标不能超过 30MB');
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d'); if (!preserveAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); } ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片处理失败')), preserveAlpha ? 'image/png' : 'image/jpeg', 0.85));
  } finally { bitmap.close(); }
}
export class LocalWallpaperProvider extends WallpaperProvider {
  id = 'local';
  async getCurrent() { return (await assetStore.get('wallpaper')) ?? null; }
  async set(file) {
    const compressed = await compressImage(file);
    try { await assetStore.put('wallpaper', compressed, 4000); }
    catch { await assetStore.put('wallpaper', file); }
  }
  async clear() { await assetStore.delete('wallpaper'); }
}
let currentURL;
let generation = 0;
export async function renderWallpaper(provider) {
  const stamp = ++generation; const blob = await provider.getCurrent();
  if (stamp !== generation) return;
  const element = document.querySelector('#wallpaper');
  if (!blob) { element.classList.remove('loaded'); element.style.backgroundImage = ''; if (currentURL) URL.revokeObjectURL(currentURL); currentURL = undefined; return; }
  const url = URL.createObjectURL(blob); const img = new Image(); img.src = url;
  try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error('壁纸无法解码'); }
  if (stamp !== generation) { URL.revokeObjectURL(url); return; }
  if (currentURL) URL.revokeObjectURL(currentURL); currentURL = url;
  element.style.backgroundImage = `url("${url}")`; element.classList.add('loaded');
}
