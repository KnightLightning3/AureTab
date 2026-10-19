import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findLocalIconVariants } from '../js/grid/localIconVariants.js';
import { localIconURL } from '../js/grid/siteIcon.js';
import { validateData } from '../js/io/schema.js';

test('offline discovery lists curated main and wide without stale selections', async t => {
  const originalFetch = globalThis.fetch, originalChrome = globalThis.chrome;
  const requests = [];
  globalThis.chrome = { runtime: { getURL: path => `chrome-extension://id/${path}` } };
  globalThis.fetch = async url => {
    requests.push(String(url));
    return { ok: true, json: async () => JSON.parse(readFileSync(url, 'utf8')) };
  };
  t.after(() => { globalThis.fetch = originalFetch; globalThis.chrome = originalChrome; });
  const icons = await findLocalIconVariants('https://chat.deepseek.com/');
  assert.deepEqual(new Set(icons.map(x => x.file)), new Set(['chat.deepseek.com.svg', 'chat.deepseek.com-text.svg']));
  const legacy = await findLocalIconVariants('https://chat.deepseek.com/', {
    iconFile: 'lobe-icons/deepseek-color.svg', iconWide: 'lobe-icons/deepseek-text.svg',
  });
  assert.deepEqual(legacy, icons);
  const changed = await findLocalIconVariants('https://mail.google.com/', {
    iconFile: 'lobe-icons/deepseek-color.svg', iconWide: 'chat.deepseek.com-text.svg',
  });
  assert.ok(changed.some(x => x.file === 'mail.google.com.svg'));
  assert.equal(changed.some(x => /deepseek|^google\.com/.test(x.file)), false);
  assert.deepEqual(await findLocalIconVariants('https://unknown-example.invalid/', { iconFile: 'lobe-icons/deepseek.svg' }), []);
  for (const item of [...icons, ...changed]) {
    assert.equal(item.file.includes('/'), false);
    assert.match(localIconURL(item.file), /^chrome-extension:\/\/id\/assets\/site-icons\/[^/]+$/);
  }
  assert.equal(icons.length, new Set(icons.map(x => x.file)).size);
  assert.deepEqual(await findLocalIconVariants('javascript:alert(1)'), []);
  assert.equal(requests.length, 2); // index and catalog are local and cached
});

test('only allowlisted library paths survive saved data validation', () => {
  const make = iconFile => ({ schemaVersion: 1, settings: { blur: '0', overlay: '15', radius: '16' }, groups: [{ id: 'g', name: 'g', sites: [{ id: 's', title: 't', text: 'T', size: '1x1', url: 'https://example.com', iconFile }] }] });
  for (const path of ['lobe-icons/deepseek-color.svg', 'dashboard-icons/svg/gmail.svg', 'simple-icons/icons/github.svg']) assert.equal(validateData(make(path)).groups[0].sites[0].iconFile, path);
  for (const path of ['../../bad.svg', 'lobe-icons/../evil.svg', 'anything/icon.svg', 'https://evil.test/icon.svg']) assert.throws(() => validateData(make(path)));
});
