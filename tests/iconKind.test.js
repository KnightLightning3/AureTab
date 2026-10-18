import test from 'node:test';
import assert from 'node:assert/strict';
import { compressImage } from '../js/wallpaper/Local.js';
import { ICON_CLASSIFIER, classifyPixels, classifyBlob, loadClassifiedIcon, iconKind, showClassifiedIcon } from '../js/grid/iconKind.js';

function image(alpha = 0) {
  const pixels = new Uint8ClampedArray(32 * 32 * 4);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = alpha;
  return pixels;
}
function rect(pixels, left, top, width, height, alpha) {
  for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) pixels[(y * 32 + x) * 4 + 3] = alpha;
}

test('opaque tile and opaque RGB image decode to filled', () => {
  assert.equal(classifyPixels(image(255)), 'filled');
  // RGB images acquire alpha=255 for every pixel when read from the canvas.
  const rgb = image(255); rgb[0] = 80; rgb[1] = 120; rgb[2] = 200;
  assert.equal(classifyPixels(rgb), 'filled');
});
test('rounded tile ignores transparent corners', () => {
  const pixels = image(255);
  for (const [x, y] of [[0, 0], [28, 0], [0, 28], [28, 28]]) rect(pixels, x, y, 4, 4, 0);
  assert.equal(classifyPixels(pixels), 'filled');
});
test('small central artwork and fully transparent pixels are glyphs', () => {
  const pixels = image(); rect(pixels, 12, 12, 8, 8, 255);
  assert.equal(classifyPixels(pixels), 'glyph');
  assert.equal(classifyPixels(image()), 'glyph');
});
test('every midpoint uses the mean of its 2x2 region, strictly above 200', () => {
  const pixels = image(255);
  rect(pixels, 15, 0, 2, 2, 200);
  assert.equal(classifyPixels(pixels), 'glyph');
  rect(pixels, 15, 0, 2, 2, 201);
  assert.equal(classifyPixels(pixels), 'filled');
  rect(pixels, 15, 0, 1, 1, 0); // Mean 150.75, despite the other three being 201.
  assert.equal(classifyPixels(pixels), 'glyph');
  for (const [x, y] of [[15, 0], [15, 30], [0, 15], [30, 15]]) {
    const edge = image(255); rect(edge, x, y, 2, 2, 0);
    assert.equal(classifyPixels(edge), 'glyph');
  }
});
test('shadow or thin midpoint gaps may misclassify; manual style overrides the result', () => {
  // Known limitation: translucent shadows and thin edge gaps use manual options as fallback.
  const shadow = image(180);
  assert.equal(classifyPixels(shadow), 'glyph');
  const gap = image(255); rect(gap, 15, 0, 1, 2, 0);
  assert.equal(classifyPixels(gap), 'glyph');
  assert.equal(iconKind('glyph', 'color'), 'filled');
  assert.equal(iconKind('filled', 'glyph'), 'glyph');
  assert.equal(iconKind('glyph', 'auto'), 'glyph');
  assert.equal(iconKind('text', 'color'), 'text');
});
test('bitmap decoding, 32px fallback, v2 cache reuse and old-cache reclassification', async t => {
  let decodes = 0, closes = 0, draws = 0, small = false, brokenCanvas = false;
  const originalBitmap = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  t.after(() => {
    for (const [name, descriptor] of [['createImageBitmap', originalBitmap], ['document', originalDocument]]) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  });
  globalThis.createImageBitmap = async () => {
    decodes++;
    return { width: small ? 16 : 64, height: 64, close() { closes++; } };
  };
  globalThis.document = { createElement(name) {
    assert.equal(name, 'canvas');
    return { getContext(type) {
      assert.equal(type, '2d');
      if (brokenCanvas) throw new Error('canvas failed');
      return {
        drawImage(bitmap, x, y, w, h) { draws++; assert.deepEqual([x, y, w, h], [0, 0, 32, 32]); },
        getImageData(x, y, w, h) { assert.deepEqual([x, y, w, h], [0, 0, 32, 32]); return { data: image(255) }; }
      };
    } };
  } };
  const blob = new Blob(['fixture']);
  const records = new Map([['icon-cache:fixture', { blob, kind: 'glyph', v: 1 }]]);
  const store = { async get(key) { return records.get(key); }, async put(key, value) { records.set(key, value); } };
  const updated = await loadClassifiedIcon('fixture', store);
  assert.equal(updated.kind, 'filled'); assert.equal(updated.v, 2);
  assert.equal(ICON_CLASSIFIER.v, 2); assert.equal(decodes, 1); assert.equal(closes, 1);
  assert.equal(await loadClassifiedIcon('fixture', store), updated); assert.equal(decodes, 1);
  small = true;
  assert.equal((await classifyBlob(blob)).kind, 'text'); assert.equal(draws, 1); assert.equal(closes, 2);
  small = false; brokenCanvas = true;
  await assert.rejects(classifyBlob(blob), /canvas failed/); assert.equal(closes, 3);
  let fills = 0, outputType;
  globalThis.document = { createElement() { return {
    getContext() { return { fillRect() { fills++; }, drawImage() {} }; },
    toBlob(callback, type) { outputType = type; callback(new Blob(['encoded'], { type })); }
  }; } };
  const upload = new Blob(['upload'], { type: 'image/png' });
  await compressImage(upload, 256, { preserveAlpha: true });
  assert.equal(outputType, 'image/png'); assert.equal(fills, 0);
  await compressImage(upload);
  assert.equal(outputType, 'image/jpeg'); assert.equal(fills, 1);
});


function mockGlobal(t, name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
}

function memoryStore(record) {
  return {
    gets: 0, puts: 0,
    async get() { this.gets++; return record; },
    async put(key, value) { this.puts++; record = value; }
  };
}

test('classification caches completed and concurrent loads per store, including persisted text', async t => {
  const blob = new Blob(['cached']);
  const first = memoryStore({ blob, kind: 'filled', v: 2 });
  const second = memoryStore({ blob, kind: 'glyph', v: 2 });
  const text = memoryStore({ blob, kind: 'text', v: 2 });
  mockGlobal(t, 'createImageBitmap', () => { throw new Error('must not classify valid records'); });
  mockGlobal(t, 'fetch', () => { throw new Error('must not download valid records'); });
  const results = await Promise.all([
    loadClassifiedIcon('same', first), loadClassifiedIcon('same', first),
    loadClassifiedIcon('same', second), loadClassifiedIcon('same', text)
  ]);
  assert.equal(results[0], results[1]);
  assert.equal(results[0].kind, 'filled');
  assert.equal(results[2].kind, 'glyph');
  assert.equal(results[3].kind, 'text');
  assert.equal(await loadClassifiedIcon('same', first), results[0]);
  assert.deepEqual([first.gets, second.gets, text.gets], [1, 1, 1]);
  assert.deepEqual([first.puts, second.puts, text.puts], [0, 0, 0]);
});

test('downloads and classifications deduplicate; failures retry and failed persistence still caches', async t => {
  let downloads = 0, classifications = 0, failDownload = true, failClassification = true;
  const blob = new Blob(['download']);
  mockGlobal(t, 'fetch', async () => {
    downloads++;
    return { ok: !failDownload, async blob() { return blob; } };
  });
  mockGlobal(t, 'createImageBitmap', async () => {
    classifications++;
    if (failClassification) throw new Error('bitmap failed');
    return { width: 16, height: 64, close() {} };
  });
  const store = memoryStore();
  store.put = async () => { store.puts++; throw new Error('storage full'); };
  const concurrent = () => Promise.allSettled([
    loadClassifiedIcon('download', store), loadClassifiedIcon('download', store)
  ]);
  assert.ok((await concurrent()).every(result => result.status === 'rejected'));
  assert.equal(downloads, 1); assert.equal(classifications, 0);
  failDownload = false;
  assert.ok((await concurrent()).every(result => result.status === 'rejected'));
  assert.equal(downloads, 2); assert.equal(classifications, 1);
  failClassification = false;
  const results = await concurrent();
  assert.ok(results.every(result => result.status === 'fulfilled'));
  assert.equal(results[0].value, results[1].value);
  assert.equal(results[0].value.kind, 'text');
  await loadClassifiedIcon('download', store);
  assert.deepEqual([store.gets, downloads, classifications, store.puts], [3, 3, 2, 1]);
  const supplied = memoryStore();
  assert.equal((await loadClassifiedIcon('upload', supplied, blob)).blob, blob);
  assert.equal(downloads, 3);
});

test('display reuses decoded templates for detached containers, retries decode and releases URLs on page exit', async t => {
  let decodes = 0, created = 0, failDecode = false;
  const revoked = [], handlers = new Map();
  mockGlobal(t, 'window', { addEventListener(name, callback) { handlers.set(name, callback); } });
  t.mock.method(URL, 'createObjectURL', () => `blob:fixture-${++created}`);
  t.mock.method(URL, 'revokeObjectURL', url => { revoked.push(url); });
  mockGlobal(t, 'document', { createElement(name) {
    assert.equal(name, 'img');
    return {
      async decode() { decodes++; if (failDecode) throw new Error('decode failed'); },
      cloneNode() { return { src: this.src, alt: this.alt, draggable: this.draggable }; }
    };
  } });
  mockGlobal(t, 'createImageBitmap', () => { throw new Error('must not reclassify'); });
  const container = () => ({
    isConnected: false, dataset: {}, children: [],
    replaceChildren(child) { this.children = [child]; }
  });
  const blob = new Blob(['image']);
  const store = memoryStore({ blob, kind: 'filled', v: 2 });
  const a = container(), b = container();
  assert.deepEqual(await Promise.all([
    showClassifiedIcon(a, 'same', { store }),
    showClassifiedIcon(b, 'same', { store, manual: 'glyph' })
  ]), [true, true]);
  assert.equal(a.dataset.kind, 'filled'); assert.equal(b.dataset.kind, 'glyph');
  assert.equal(a.children[0].src, b.children[0].src);
  assert.notEqual(a.children[0], b.children[0]);
  assert.equal(a.children[0].alt, ''); assert.equal(a.children[0].draggable, false);
  assert.equal(await showClassifiedIcon(a, 'same', { store }), true);
  assert.deepEqual([store.gets, created, decodes, revoked.length], [1, 1, 1, 0]);

  const other = memoryStore({ blob, kind: 'glyph', v: 2 });
  const c = container();
  await showClassifiedIcon(c, 'same', { store: other, manual: 'color' });
  assert.equal(c.dataset.kind, 'filled');
  assert.notEqual(c.children[0].src, a.children[0].src);
  const text = memoryStore({ blob, kind: 'text', v: 2 });
  assert.equal(await showClassifiedIcon(container(), 'same', { store: text, manual: 'color' }), false);
  assert.deepEqual([created, decodes], [2, 2]);

  const retryStore = memoryStore({ blob, kind: 'glyph', v: 2 });
  failDecode = true;
  const failures = await Promise.allSettled([
    showClassifiedIcon(container(), 'retry', { store: retryStore }),
    showClassifiedIcon(container(), 'retry', { store: retryStore })
  ]);
  assert.ok(failures.every(result => result.status === 'rejected'));
  assert.deepEqual([created, decodes, revoked.length], [3, 3, 1]);
  failDecode = false;
  assert.equal(await showClassifiedIcon(container(), 'retry', { store: retryStore }), true);
  assert.deepEqual([retryStore.gets, created, decodes], [1, 4, 4]);
  handlers.get('pagehide')({ persisted: true });
  assert.equal(revoked.length, 1);
  handlers.get('pagehide')({ persisted: false });
  assert.deepEqual(new Set(revoked), new Set(['blob:fixture-1', 'blob:fixture-2', 'blob:fixture-3', 'blob:fixture-4']));
  assert.equal(revoked.length, 4);
});
