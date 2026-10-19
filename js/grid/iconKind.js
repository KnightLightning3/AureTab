import { assetStore } from '../storage/idb.js';

export const ICON_CLASSIFIER = Object.freeze({ v: 2, size: 32, sampleSize: 2, alphaThreshold: 200 });

/** Only the four edge midpoints contribute; corners and interior are ignored. */
export function classifyPixels(pixels) {
  const { size, sampleSize, alphaThreshold } = ICON_CLASSIFIER;
  const middle = (size - sampleSize) / 2;
  const points = [[middle, 0], [middle, size - sampleSize], [0, middle], [size - sampleSize, middle]];
  return points.every(([left, top]) => {
    let alpha = 0;
    for (let y = top; y < top + sampleSize; y++) {
      for (let x = left; x < left + sampleSize; x++) alpha += pixels[(y * size + x) * 4 + 3];
    }
    return alpha / (sampleSize * sampleSize) > alphaThreshold;
  }) ? 'filled' : 'glyph';
}

export async function classifyBlob(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = bitmap;
    if (width < 32 || height < 32) return { kind: 'text', v: ICON_CLASSIFIER.v, width, height };
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = ICON_CLASSIFIER.size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { kind: classifyPixels(context.getImageData(0, 0, canvas.width, canvas.height).data), v: ICON_CLASSIFIER.v, width, height };
  } finally { bitmap.close(); }
}

/** Loads a cross-origin or _favicon URL as a plain image; fetch() would require
 * host_permissions (cross-origin) or is unsupported (the _favicon endpoint).
 * Tiny default placeholders (e.g. a 16px globe) are rejected so callers fall through. */
function loadImageElement(source, minSize = 32) {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img'); image.alt = ''; image.draggable = false;
    image.onload = () => {
      // Vector icons declare a nominal 1em size; their intrinsic pixel size is irrelevant.
      if (!minSize || (image.naturalWidth >= minSize && image.naturalHeight >= minSize)) resolve(image);
      else reject(new Error('图标过小'));
    };
    image.onerror = () => reject(new Error('图标加载失败'));
    image.src = source;
  });
}

// Keep both in-flight and completed classifications for this store's session.
// Store identity matters: previews/tests may use the same source in different stores.
const CACHE_LIMIT = 500;
// Bundled artwork changes with the extension; favicons are left alone (they rarely change).
const EXTENSION_VERSION = (() => { try { return chrome.runtime.getManifest().version; } catch { return ''; } })();
const classifications = new WeakMap();
export function loadClassifiedIcon(source, store = assetStore, suppliedBlob) {
  let entries = classifications.get(store);
  if (!entries) classifications.set(store, entries = new Map());
  const key = source.startsWith('chrome-extension://')
    ? `icon-cache:${EXTENSION_VERSION}:${source}` : `icon-cache:${source}`;
  let request = entries.get(key);
  if (!request && entries.size >= CACHE_LIMIT) {
    // Bound long-lived new-tab pages; an evicted promise stays valid for its caller.
    entries.delete(entries.keys().next().value);
  }
  if (!request) {
    request = (async () => {
      const cached = await store.get(key).catch(() => null);
      if (cached?.v === ICON_CLASSIFIER.v && ['filled', 'glyph', 'text'].includes(cached.kind) && cached.blob instanceof Blob) return cached;
      let blob = suppliedBlob ?? cached?.blob;
      const vector = /\.svg(?:[?#]|$)/i.test(source);
      if (!blob && (vector || /^https?:\/\//i.test(source) || /\/_favicon\//.test(source))) {
        // Cross-origin favicon pixels are unreadable (tainted canvas), the
        // _favicon endpoint is image-only, and SVG has no raster alpha to sample.
        return { image: await loadImageElement(source, vector ? 0 : 32), kind: 'glyph', v: ICON_CLASSIFIER.v };
      }
      // Custom uploads live in the asset store; read them directly instead of
      // making every renderer fetch the blob first.
      if (!blob && source.startsWith('icon:')) {
        blob = await store.get(source).catch(() => null);
        if (!blob) throw new Error('图标加载失败');
      }
      const fetched = blob ?? await fetch(source).then(response => {
        if (!response.ok) throw new Error('图标加载失败');
        return response.blob();
      });
      const record = { blob: fetched, ...await classifyBlob(fetched) };
      await store.put(key, record).catch(() => {});
      return record;
    })();
    entries.set(key, request);
    request.catch(() => { if (entries.get(key) === request) entries.delete(key); });
  }
  return request;
}

let decodedImages = new WeakMap();
const objectURLs = new Set();
let cleanupRegistered = false;
function decodedImage(record) {
  if (record.image) return Promise.resolve(record.image);
  let request = decodedImages.get(record);
  if (!request) {
    if (!cleanupRegistered && typeof window !== 'undefined') {
      window.addEventListener('pagehide', event => {
        // A page restored from the back/forward cache still owns its images.
        if (event.persisted) return;
        for (const url of objectURLs) URL.revokeObjectURL(url);
        objectURLs.clear();
        decodedImages = new WeakMap();
      });
      cleanupRegistered = true;
    }
    request = (async () => {
      const url = URL.createObjectURL(record.blob);
      objectURLs.add(url);
      try {
        const image = document.createElement('img'); image.alt = ''; image.draggable = false;
        image.src = url;
        await image.decode();
        return image;
      } catch (error) {
        objectURLs.delete(url);
        URL.revokeObjectURL(url);
        throw error;
      }
    })();
    decodedImages.set(record, request);
    request.catch(() => { if (decodedImages.get(record) === request) decodedImages.delete(record); });
  }
  return request;
}

export function iconKind(kind, manual) {
  if (kind === 'text') return 'text';
  return manual === 'color' ? 'filled' : manual === 'glyph' ? 'glyph' : kind;
}

/** One rendering path for bundled icons, favicon fallbacks, and custom uploads. */
export async function showClassifiedIcon(container, source, { manual, blob, store = assetStore } = {}) {
  const record = await loadClassifiedIcon(source, store, blob);
  const kind = iconKind(record.kind, manual);
  if (kind === 'text') return false;
  const template = await decodedImage(record);
  // The renderer owns container lifetime, including detached/prepared groups.
  container.dataset.kind = kind;
  container.replaceChildren(template.cloneNode(true));
  return true;
}
