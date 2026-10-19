import test from 'node:test';
import assert from 'node:assert/strict';
import { CURATED_ALIASES, CURATED_MONO_FILES, CURATED_WIDE_FILES } from '../js/grid/curatedIconMap.js';
import { localIconURL, wideIconURL, isMonoIconFile, isLocalIconFile, resolveLocalIconFile } from '../js/grid/siteIcon.js';

test('legacy favicon names map to the bundled SVG and its wide wordmark', t => {
  const original = globalThis.chrome;
  globalThis.chrome = { runtime: { getURL: path => `chrome-extension://id/${path}` } };
  t.after(() => { globalThis.chrome = original; });
  assert.equal(localIconURL('github.com.png'), 'chrome-extension://id/assets/site-icons/github.com.svg');
  assert.equal(localIconURL('github.com.svg'), 'chrome-extension://id/assets/site-icons/github.com.svg');
  assert.equal(wideIconURL('github.com.png'), 'chrome-extension://id/assets/site-icons/github.com-text.svg');
  assert.equal(wideIconURL('github.com.svg'), 'chrome-extension://id/assets/site-icons/github.com-text.svg');
  assert.equal(wideIconURL('google.com.png'), 'chrome-extension://id/assets/site-icons/google.com-text.svg');
  assert.equal(isMonoIconFile('github.com.png'), true);
  assert.equal(isMonoIconFile('bilibili.com.png'), false);
  assert.equal(localIconURL('../github.com.svg'), null);
});


test('legacy libraries resolve only through curated aliases', t => {
  const original = globalThis.chrome;
  globalThis.chrome = { runtime: { getURL: path => `chrome-extension://id/${path}` } };
  t.after(() => { globalThis.chrome = original; });
  for (const old of ['lobe-icons/deepseek.svg', 'lobe-icons/deepseek-color.svg']) {
    assert.equal(isLocalIconFile(old), true);
    assert.equal(resolveLocalIconFile(old), 'chat.deepseek.com.svg');
    assert.equal(localIconURL(old), 'chrome-extension://id/assets/site-icons/chat.deepseek.com.svg');
  }
  assert.equal(resolveLocalIconFile('lobe-icons/unknown-unbundled.svg'), null);
  assert.equal(localIconURL('lobe-icons/unknown-unbundled.svg'), null);
  for (const unsafe of ['../bad.svg', 'lobe-icons/../bad.svg', 'other/icon.svg', '/bad.svg', 'https://evil.test/a.svg', 'lobe-icons/a.svg?x', 'lobe-icons/a%2f.svg']) {
    assert.equal(isLocalIconFile(unsafe), false);
    assert.equal(localIconURL(unsafe), null);
  }
});


test('user-selected ChatGPT knot and horizontal wordmark use the specified monochrome files', t => {
  const original = globalThis.chrome;
  globalThis.chrome = { runtime: { getURL: path => `chrome-extension://id/${path}` } };
  t.after(() => { globalThis.chrome = original; });
  for (const file of ['chatgpt.com.svg', 'chatgpt.com.png']) {
    assert.equal(isMonoIconFile(file), true);
    assert.equal(wideIconURL(file), 'chrome-extension://id/assets/site-icons/chatgpt.com-text.svg');
  }
});


test('curated metadata exclusively controls mono and wide for every curated file', t => {
  const original = globalThis.chrome;
  globalThis.chrome = { runtime: { getURL: path => `chrome-extension://id/${path}` } };
  t.after(() => { globalThis.chrome = original; });
  const mono = new Set(CURATED_MONO_FILES);
  const files = new Set([...Object.values(CURATED_ALIASES).filter(file => typeof file === 'string'), ...mono,
    ...Object.keys(CURATED_WIDE_FILES), ...Object.values(CURATED_WIDE_FILES)]);
  for (const file of files) {
    assert.equal(isMonoIconFile(file), mono.has(file), file);
    assert.equal(wideIconURL(file), CURATED_WIDE_FILES[file] ? localIconURL(CURATED_WIDE_FILES[file]) : null, file);
  }
  for (const [alias, file] of Object.entries(CURATED_ALIASES)) {
    if (file === null) {
      assert.equal(resolveLocalIconFile(alias), null, alias);
      assert.equal(localIconURL(alias), null, alias);
      assert.equal(wideIconURL(alias), null, alias);
      assert.equal(isMonoIconFile(alias), false, alias);
      continue;
    }
    assert.equal(isMonoIconFile(alias), mono.has(file), alias);
  }
});
