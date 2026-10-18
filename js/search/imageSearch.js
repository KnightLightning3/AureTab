import { engines } from './engines.js';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_SIDE = 8192;
// Raster formats only: the backup importer rejects SVG, and remote vector data
// must not reach the clipboard/upload path.
const RASTER_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon']);
const isRaster = type => typeof type === 'string' && RASTER_TYPES.has(type.toLowerCase());
export function validateImage(blob) {
  if (!isRaster(blob?.type)) throw new Error('仅支持图片');
  if (!blob.size) throw new Error('图片内容为空');
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 10MB');
  return blob;
}
/** Loopback, link-local and RFC1918 hosts must not be probed from the extension origin. */
export function isPrivateHost(hostname) {
  const host = String(hostname ?? '').toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const a = Number(ipv4[1]), b = Number(ipv4[2]);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
/** Populate only after capturing an official upload request. No guessed endpoints.
 * Each config needs {action, field, fields, encoding, capturedAt}.
 * Official-page links are navigation links, never assumed upload endpoints.
 */
// Google official flow: POST https://lens.google.com/v3/upload (2026-10-18).
// Cross-site multipart reproduction returned 403, even with public query parameters.
// Keep direct uploads disabled until a cross-site submission reaches actual results.
const verifiedUploads = { google: null, bing: null, sogou: null };
export async function submitMultipart(blob, config) {
  validateImage(blob);
  if (!config?.capturedAt || new URL(config.action).protocol !== 'https:') throw new Error('上传接口尚未验证');
  const form = document.createElement('form');
  form.method = 'POST'; form.enctype = 'multipart/form-data'; form.target = '_blank'; form.action = config.action; form.hidden = true;
  const field = document.createElement('input'); field.name = config.field;
  if (config.encoding === 'base64') {
    field.type = 'hidden'; field.value = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
  } else {
    field.type = 'file'; const transfer = new DataTransfer(); transfer.items.add(new File([blob], 'image', { type: blob.type })); field.files = transfer.files;
  }
  form.append(field);
  for (const [name, value] of Object.entries(config.fields ?? {})) { const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.append(input); }
  document.body.append(form);
  try { form.submit(); } finally { setTimeout(() => form.remove(), 1000); }
}
export const imageSearchAdapters = Object.fromEntries(Object.entries(engines).map(([id, engine]) => [id, {
  name: engine.name, verified: Boolean(verifiedUploads[id]), submit: blob => submitMultipart(blob, verifiedUploads[id]),
}]));
/** Snapshot DataTransfer while the drop event is active; its data store expires afterwards. */
export function captureImageDrop(transfer) {
  const files = Array.from(transfer?.files ?? []);
  const items = Array.from(transfer?.items ?? []);
  for (const item of items) if (item.kind === 'file') {
    const file = item.getAsFile(); if (file && !files.includes(file)) files.push(file);
  }
  const file = files.find(file => isRaster(file.type));
  if (file) return { file };
  if (files.length) throw new Error('仅支持图片');
  const read = type => transfer?.getData?.(type) || '';
  // A linked image often exposes the enclosing page in uri-list; prefer its actual img src.
  const html = read('text/html');
  const image = html ? new DOMParser().parseFromString(html, 'text/html').querySelector('img[src]') : null;
  const uri = read('text/uri-list').split(/\r?\n/).map(line => line.trim())
    .find(line => line && !line.startsWith('#'))?.replace(/^<(.*)>$/, '$1');
  // A bad uri-list must not poison an otherwise usable absolute source.
  let base;
  try { base = uri ? new URL(uri).href : undefined; } catch { base = undefined; }
  for (const candidate of [image?.getAttribute('src'), uri, read('text/plain').trim()]) {
    if (!candidate) continue;
    let url;
    try { url = new URL(candidate, base); } catch { continue; }
    if (!['https:', 'http:'].includes(url.protocol)) continue;
    return { url: url.href };
  }
  throw new Error('仅支持图片或完整图片链接');
}

export async function imageFromDrop(transfer) {
  const source = captureImageDrop(transfer);
  if (source.file) return validateImage(source.file);
  return imageFromURL(source.url);
}
export async function imageFromURL(url) {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('仅支持 HTTP(S) 图片链接');
  if (parsed.username || parsed.password) throw new Error('图片链接不能包含账号信息');
  if (isPrivateHost(parsed.hostname)) throw new Error('不支持本地或内网图片地址');
  const response = await fetch(parsed.href, { credentials: 'omit', signal: AbortSignal.timeout(10000) });
  const discard = () => response.body?.cancel().catch(() => {});
  if (!response.ok) { await discard(); throw new Error('图片下载失败'); }
  let finalHost = '';
  try { finalHost = response.url ? new URL(response.url).hostname : ''; } catch {}
  if (finalHost && isPrivateHost(finalHost)) { await discard(); throw new Error('不支持本地或内网图片地址'); }
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!isRaster(type)) { await discard(); throw new Error('仅支持图片'); }
  if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) {
    await discard(); throw new Error('图片不能超过 10MB');
  }
  if (!response.body) return validateImage(await response.blob());
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error('图片不能超过 10MB'); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  return validateImage(new Blob(chunks, { type }));
}

/** Start clipboard writing before opening a new page, preserving the fresh click gesture. */
export async function copyAndOpenImage(blob, engine, open = () => window.open(engines[engine].images, '_blank')) {
  validateImage(blob);
  const copying = copyImage(blob);
  let tab;
  try { tab = open(); if (tab) tab.opener = null; }
  catch (error) { await copying.catch(() => {}); throw error; }
  await copying;
  return { opened: Boolean(tab) };
}
/** PNG is the interoperable ClipboardItem image type. Called by a fresh click gesture. */
export async function copyImage(blob) {
  if (!navigator.clipboard?.write || !globalThis.ClipboardItem) throw new Error('此浏览器无法复制图片，请保存后在官方页面上传');
  const png = (async () => {
    const bitmap = await createImageBitmap(blob);
    try {
      const { width, height } = bitmap;
      if (!width || !height) throw new Error('图片转换失败');
      // A 10MB compressed file can still declare gigapixels; clamp before allocating a canvas.
      const scale = Math.min(1, MAX_IMAGE_SIDE / width, MAX_IMAGE_SIDE / height, Math.sqrt(MAX_IMAGE_PIXELS / (width * height)));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片转换失败')), 'image/png'));
    } finally { bitmap.close(); }
  })();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
