import { engines } from './engines.js';
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export function validateImage(blob) {
  if (!blob?.type.startsWith('image/')) throw new Error('仅支持图片');
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 10MB');
  return blob;
}
/** Populate only after capturing an official upload request. No guessed endpoints.
 * Each config needs {action, field, fields, encoding, capturedAt}.
 * Official-page links are navigation links, never assumed upload endpoints.
 */
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
  document.body.append(form); form.submit(); setTimeout(() => form.remove(), 1000);
}
export const imageSearchAdapters = Object.fromEntries(Object.entries(engines).map(([id, engine]) => [id, {
  name: engine.name, verified: false, submit: blob => submitMultipart(blob, verifiedUploads[id]),
}]));
export async function imageFromDrop(transfer) {
  if (transfer.files.length) return validateImage(transfer.files[0]);
  const uri = transfer.getData('text/uri-list').split(/\r?\n/).find(line => line && !line.startsWith('#'));
  if (!uri) throw new Error('仅支持图片');
  const url = new URL(uri); if (!['https:', 'http:'].includes(url.protocol)) throw new Error('仅支持 HTTP(S) 图片链接');
  const response = await fetch(url.href, { credentials: 'omit', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('图片下载失败');
  if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('仅支持图片');
  if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error('图片不能超过 10MB');
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error('图片不能超过 10MB'); } chunks.push(chunk.value); } }
  finally { reader.releaseLock(); }
  return validateImage(new Blob(chunks, { type: response.headers.get('content-type').split(';')[0] }));
}
/** PNG is the interoperable ClipboardItem image type. Called by a fresh click gesture. */
export async function copyImage(blob) {
  if (!navigator.clipboard?.write || !globalThis.ClipboardItem) throw new Error('此浏览器无法复制图片，请保存后在官方页面上传');
  const png = (async () => {
    const bitmap = await createImageBitmap(blob); const canvas = document.createElement('canvas');
    try { canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap, 0, 0); }
    finally { bitmap.close(); }
    return new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片转换失败')), 'image/png'));
  })();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
