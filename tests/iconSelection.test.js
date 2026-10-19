import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveIconSelection } from '../js/ui/iconSelection.js';
const values = fields => new Map(Object.entries(fields));
const url = 'https://github.com/';
test('source selection wins over an unselected upload or existing custom icon', () => {
  const form = { iconChoice: 'auto', iconLocal: 'simple-icons/icons/github.svg', iconLocalDomain: 'github.com', icon: { size: 20 }, iconStyle: 'glyph', iconBackground: '#000000' };
  assert.deepEqual(resolveIconSelection(values(form), { iconId: 'icon:old' }, url), { properties: { iconFile: 'github.com.svg', iconStyle: 'glyph', iconBackground: '#000000' }, upload: null });
  assert.deepEqual(resolveIconSelection(values({ ...form, iconChoice: 'text' }), {}, url).properties, { useText: true, iconStyle: 'glyph', iconBackground: '#000000' });
  assert.equal(resolveIconSelection(values({ ...form, iconChoice: 'remote' }), {}, url).properties.iconFile, undefined);
});
test('custom upload, existing custom, and automatic reset keep independent display settings', () => {
  const upload = { size: 20 };
  assert.equal(resolveIconSelection(values({ iconChoice: 'custom', icon: upload }), {}, url).upload, upload);
  assert.equal(resolveIconSelection(values({ iconChoice: 'custom' }), { iconId: 'icon:old' }, url).properties.iconId, 'icon:old');
  assert.deepEqual(resolveIconSelection(values({ iconChoice: 'auto', iconStyle: '', iconBackground: 'glass' }), { iconStyle: 'glyph', iconBackground: '#000000' }, url).properties, {});
});
test('changing domain cannot retain stale local artwork and arbitrary paths are rejected', () => {
  assert.deepEqual(resolveIconSelection(values({ iconChoice: 'auto', iconLocal: 'github.com.svg', iconLocalDomain: 'github.com' }), {}, 'https://example.com/').properties, {});
  assert.deepEqual(resolveIconSelection(values({ iconChoice: 'auto', iconLocal: '../bad.svg', iconLocalDomain: 'github.com' }), {}, url).properties, {});
});
