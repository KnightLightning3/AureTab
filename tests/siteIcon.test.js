import test from 'node:test';
import assert from 'node:assert/strict';
import { localIconURL, wideIconURL, isMonoIconFile } from '../js/grid/siteIcon.js';

test('legacy favicon names map to the bundled SVG and its wide wordmark', t => {
  const original = globalThis.chrome;
  globalThis.chrome = { runtime: { getURL: path => `chrome-extension://id/${path}` } };
  t.after(() => { globalThis.chrome = original; });
  assert.equal(localIconURL('github.com.png'), 'chrome-extension://id/assets/site-icons/github.com.svg');
  assert.equal(localIconURL('github.com.svg'), 'chrome-extension://id/assets/site-icons/github.com.svg');
  assert.equal(wideIconURL('github.com.png'), 'chrome-extension://id/assets/site-icons/github.com-text.svg');
  assert.equal(wideIconURL('github.com.svg'), 'chrome-extension://id/assets/site-icons/github.com-text.svg');
  assert.equal(wideIconURL('google.com.png'), null);
  assert.equal(isMonoIconFile('github.com.png'), true);
  assert.equal(isMonoIconFile('bilibili.com.png'), false);
  assert.equal(localIconURL('../github.com.svg'), null);
});
