import test from 'node:test';
import assert from 'node:assert/strict';
import { captureImageDrop, imageFromDrop, imageFromURL, validateImage, copyAndOpenImage, submitMultipart, imageSearchAdapters, MAX_IMAGE_BYTES } from '../js/search/imageSearch.js';

const image = () => new Blob(['test image'], { type: 'image/png' });
function globalMock(t, name, value) {
  const old = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  t.after(() => { if (old) Object.defineProperty(globalThis, name, old); else delete globalThis[name]; });
}
function drop(data = {}, files = [], items = []) {
  return { files, items, getData: type => data[type] || '' };
}
test('drop snapshots an image file, including item-only and mixed file drops', async () => {
  const png = image(), text = new Blob(['text'], { type: 'text/plain' });
  assert.equal(await imageFromDrop(drop({}, [text, png])), png);
  assert.equal(await imageFromDrop(drop({}, [], [{ kind: 'file', getAsFile: () => png }])), png);
  let readable = true;
  const transfer = { files: [], getData(type) { assert.equal(readable, true); return type === 'text/uri-list' ? 'https://example.com/image.png' : ''; } };
  const source = captureImageDrop(transfer); readable = false;
  assert.equal(source.url, 'https://example.com/image.png');
});
test('linked HTML uses the actual image source instead of the enclosing page', t => {
  globalMock(t, 'DOMParser', class {
    parseFromString() { return { querySelector: () => ({ getAttribute: () => '/real-image.png' }) }; }
  });
  const source = captureImageDrop(drop({ 'text/html': '<a><img></a>', 'text/uri-list': 'https://example.com/article' }));
  assert.equal(source.url, 'https://example.com/real-image.png');
});
test('URI comments and plain image URLs are supported; invalid sources are rejected', () => {
  assert.equal(captureImageDrop(drop({ 'text/uri-list': '# comment\r\nhttps://example.com/p.png' })).url, 'https://example.com/p.png');
  assert.equal(captureImageDrop(drop({ 'text/plain': 'https://example.com/a.jpg' })).url, 'https://example.com/a.jpg');
  for (const input of ['', 'not an image', 'javascript:alert(1)', 'file:///private/image.png']) {
    assert.throws(() => captureImageDrop(drop({ 'text/plain': input })), /仅支持/);
  }
  assert.throws(() => validateImage(new Blob([], { type: 'image/png' })), /为空/);
});
test('URL input reads image streams and normalizes MIME, without sending credentials', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.com/image'); assert.equal(options.credentials, 'omit'); assert.ok(options.signal);
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'IMAGE/PNG; charset=utf-8' } });
  });
  const result = await imageFromURL('https://example.com/image');
  assert.equal(result.type, 'image/png'); assert.equal(result.size, 3);
  await assert.rejects(imageFromURL('javascript:alert(1)'), /仅支持/);
});
test('downloads enforce MIME, declared size and streamed size; failures propagate', async t => {
  let response = new Response('<html>', { headers: { 'content-type': 'text/html' } });
  t.mock.method(globalThis, 'fetch', async () => response);
  await assert.rejects(imageFromURL('https://example.com/image'), /仅支持图片/);
  let cancelled = false;
  response = { ok: true, headers: new Headers({ 'content-type': 'image/png', 'content-length': String(MAX_IMAGE_BYTES + 1) }), body: { async cancel() { cancelled = true; } } };
  await assert.rejects(imageFromURL('https://example.com/image'), /10MB/); assert.equal(cancelled, true);
  let released = false; cancelled = false;
  response = { ok: true, headers: new Headers({ 'content-type': 'image/png' }), body: { getReader() { return {
    async read() { return { done: false, value: new Uint8Array(MAX_IMAGE_BYTES + 1) }; },
    async cancel() { cancelled = true; }, releaseLock() { released = true; }
  }; } } };
  await assert.rejects(imageFromURL('https://example.com/image'), /10MB/);
  assert.equal(cancelled, true); assert.equal(released, true);
});
test('clipboard starts before navigation and blocked popup is reported without losing the image', async t => {
  const order = [];
  globalMock(t, 'createImageBitmap', async () => ({ width: 10, height: 10, close() {} }));
  globalMock(t, 'document', { createElement() { return {
    getContext: () => ({ drawImage() {} }), toBlob: callback => callback(image())
  }; } });
  globalMock(t, 'ClipboardItem', class { constructor(data) { this.data = data; } });
  globalMock(t, 'navigator', { clipboard: { async write(items) { order.push('copy'); await items[0].data['image/png']; } } });
  assert.deepEqual(await copyAndOpenImage(image(), 'google', () => { order.push('open'); return null; }), { opened: false });
  assert.deepEqual(order, ['copy', 'open']);
  const tab = { opener: {} };
  assert.deepEqual(await copyAndOpenImage(image(), 'bing', () => tab), { opened: true });
  assert.equal(tab.opener, null);
});
test('clipboard refusal propagates so the UI can offer manual upload', async t => {
  globalMock(t, 'navigator', {});
  let opened = false;
  await assert.rejects(copyAndOpenImage(image(), 'sogou', () => { opened = true; return {}; }), /无法复制/);
  assert.equal(opened, true);
});

// Keep the DOM small, but model attachment, input files and native submission
// separately so these tests catch regressions in the actual form contract.
function multipartDOM(t, onSubmit = () => {}) {
  const attached = [], timers = [], transfers = [];
  globalMock(t, 'document', {
    createElement(tag) {
      if (tag === 'input') return { tagName: 'INPUT' };
      assert.equal(tag, 'form');
      return {
        children: [],
        append(input) { this.children.push(input); },
        submit() { assert.ok(attached.includes(this)); onSubmit(this); },
        remove() { attached.splice(attached.indexOf(this), 1); }
      };
    },
    body: { append(form) { attached.push(form); } }
  });
  globalMock(t, 'File', class extends Blob {
    constructor(parts, name, options) { super(parts, options); this.name = name; }
  });
  globalMock(t, 'DataTransfer', class {
    constructor() {
      this.files = [];
      this.items = { add: file => { this.files.push(file); } };
      transfers.push(this);
    }
  });
  globalMock(t, 'setTimeout', (callback, delay) => { timers.push({ callback, delay }); return timers.length; });
  return { attached, timers, transfers };
}
const uploadConfig = () => ({
  action: 'https://upload.example.test/image', field: 'encoded_image',
  encoding: 'multipart', capturedAt: '2026-10-18',
  fields: { source: 'test page', token: 'a&b=中文', empty: '' }
});

test('multipart requires captured HTTPS configuration before creating a DOM form', async t => {
  let created = 0;
  globalMock(t, 'document', { createElement() { created++; throw new Error('unexpected DOM access'); } });
  for (const config of [null, {}, { ...uploadConfig(), capturedAt: '' },
    { ...uploadConfig(), capturedAt: undefined },
    ...['http://upload.example.test', 'ftp://upload.example.test', 'javascript:alert(1)']
      .map(action => ({ ...uploadConfig(), action }))]) {
    await assert.rejects(submitMultipart(image(), config), /上传接口尚未验证/);
  }
  await assert.rejects(submitMultipart(image(), { ...uploadConfig(), action: 'invalid URL' }), TypeError);
  assert.equal(created, 0);
});

test('multipart fills a real file input and submits the attached POST form synchronously', async t => {
  let gestureActive = true, submitted = 0;
  const dom = multipartDOM(t, form => {
    assert.equal(gestureActive, true, 'submission must occur in the initiating call stack');
    submitted++;
    assert.equal(form.method, 'POST');
    assert.equal(form.enctype, 'multipart/form-data');
    assert.equal(form.target, '_blank');
    assert.equal(form.action, uploadConfig().action);
    assert.equal(form.hidden, true);
    assert.deepEqual(form.children.slice(1), [
      { tagName: 'INPUT', type: 'hidden', name: 'source', value: 'test page' },
      { tagName: 'INPUT', type: 'hidden', name: 'token', value: 'a&b=中文' },
      { tagName: 'INPUT', type: 'hidden', name: 'empty', value: '' }
    ]);
  });
  const blob = image();
  const pending = submitMultipart(blob, uploadConfig());
  gestureActive = false;
  assert.equal(submitted, 1, 'an await before submit would lose the user gesture');
  const form = dom.attached[0], input = form.children[0];
  assert.equal(input.type, 'file');
  assert.equal(input.name, 'encoded_image');
  assert.equal(dom.transfers.length, 1);
  assert.equal(input.files, dom.transfers[0].files);
  assert.equal(input.files.length, 1);
  const file = input.files[0];
  assert.ok(file instanceof File);
  assert.equal(file.name, 'image');
  assert.equal(file.type, blob.type);
  assert.equal(file.size, blob.size);
  assert.deepEqual(await file.arrayBuffer(), await blob.arrayBuffer());
  await pending;
  assert.equal(dom.attached.length, 1, 'retain the form until deferred cleanup');
  assert.equal(dom.timers.length, 1);
  assert.equal(dom.timers[0].delay, 1000);
  dom.timers[0].callback();
  assert.deepEqual(dom.attached, []);
});

test('multipart accepts no additional hidden fields and rejects invalid images before DOM access', async t => {
  const dom = multipartDOM(t);
  for (const blob of [new Blob(['text'], { type: 'text/plain' }), new Blob([], { type: 'image/png' }),
    new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: 'image/png' })]) {
    await assert.rejects(submitMultipart(blob, uploadConfig()), /仅支持图片|为空|10MB/);
  }
  assert.deepEqual(dom.attached, []);
  assert.deepEqual(dom.transfers, []);
  const config = uploadConfig(); delete config.fields;
  await submitMultipart(image(), config);
  assert.equal(dom.attached[0].children.length, 1);
  dom.timers[0].callback();
  assert.deepEqual(dom.attached, []);
});


test('unverified or rejected engine uploads remain disabled instead of opening broken results', async t => {
  let created = 0;
  globalMock(t, 'document', { createElement() { created++; throw new Error('unexpected DOM access'); } });
  for (const adapter of Object.values(imageSearchAdapters)) {
    assert.equal(adapter.verified, false);
    await assert.rejects(adapter.submit(image()), /上传接口尚未验证/);
  }
  assert.equal(created, 0);
});
