import test from 'node:test';
import assert from 'node:assert/strict';
import { validateData, parseBackup, safeURL } from '../js/io/schema.js';
import { planImport, buildBackup } from '../js/io/exportImport.js';
import { DEFAULT_PREFS } from '../js/storage/DataStore.js';
import { moveSite, moveGroup } from '../js/grid/dragSort.js';
import { searchURL } from '../js/search/engines.js';
import { validateImage, MAX_IMAGE_BYTES } from '../js/search/imageSearch.js';
const data = () => ({ schemaVersion: 1, settings: { blur: '0', overlay: '15', radius: '16' }, groups: [{ id: 'a', name: '工作', icon: 'favorite', sites: [{ id: 's1', title: 'Example', url: 'https://example.com/', text: 'E', size: '1x1', iconId: 'icon:1' }, { id: 's2', title: '中文', url: 'https://example.org/', text: '中', size: '2x2' }] }, { id: 'b', name: '学习', icon: 'favorite', sites: [] }] });
const backup = () => ({ version: 1, data: data(), prefs: { engine: 'bing', minimal: false, layout: 'center' }, assets: [{ id: 'icon:1', data: 'data:image/png;base64,AAAA' }] });
test('valid backup and empty state preserve shape', () => { assert.deepEqual(parseBackup(backup()).data, data()); assert.equal(validateData({ ...data(), groups: [] }).groups.length, 0); });
test('reject unsupported versions, script URLs, duplicate IDs, invalid presets', () => {
  assert.throws(() => parseBackup({ ...backup(), version: 2 })); assert.throws(() => safeURL('javascript:alert(1)'));
  const duplicate = data(); duplicate.groups[1].sites.push({ ...duplicate.groups[0].sites[0] }); assert.throws(() => validateData(duplicate));
  assert.throws(() => validateData({ ...data(), settings: { blur: '3' } }));
  assert.throws(() => parseBackup({ ...backup(), assets: [{ id: 'bad', data: 'data:image/svg+xml;base64,AAAA' }] }));
});
test('merge remaps IDs and image references without changing existing data or settings', () => {
  const current = data(); const original = structuredClone(current); const plan = planImport(current, backup(), 'merge');
  assert.deepEqual(current, original); assert.equal(plan.data.groups.length, 4); assert.notEqual(plan.data.groups[2].id, 'a'); assert.notEqual(plan.data.groups[2].sites[0].id, 's1');
  assert.equal(plan.data.groups[2].sites[0].iconId, plan.assets[0].id); assert.notEqual(plan.assets[0].id, 'icon:1'); assert.deepEqual(plan.data.settings, current.settings);
});
test('replace restores all metadata, missing assets use text or favicon fallback', () => {
  const plan = planImport({ ...data(), groups: [] }, { ...backup(), assets: [] }, 'replace');
  const expected = data(); delete expected.groups[0].sites[0].iconId; assert.deepEqual(plan.data, expected); assert.equal(plan.prefs.engine, 'bing');
});
test('bundled icon references are preserved and path traversal is rejected', () => {
  const value = data(); value.groups[0].sites[0].iconFile = 'github.com.png';
  assert.equal(validateData(value).groups[0].sites[0].iconFile, 'github.com.png');
  for (const bad of ['../github.png', 'avatars/github.png', 'github.svg', '/github.png', '']) {
    const copy = structuredClone(value); copy.groups[0].sites[0].iconFile = bad;
    assert.throws(() => validateData(copy), 'iconFile should reject: ' + bad);
  }
});
test('drag reorder and cross-group move persist ordered arrays', () => {
  const value = data(); assert.equal(moveSite(value, 's2', 'a', 's1'), true); assert.deepEqual(value.groups[0].sites.map(site => site.id), ['s2', 's1']);
  moveSite(value, 's2', 'b'); assert.deepEqual(value.groups[0].sites.map(site => site.id), ['s1']); assert.equal(value.groups[1].sites[0].id, 's2'); assert.equal(moveSite(value, 'missing', 'b'), false);
});
test('group reorder moves before the target and rejects self/no-op drops', () => {
  const value = data();
  assert.equal(moveGroup(value, 'b', 'a'), true); assert.deepEqual(value.groups.map(group => group.id), ['b', 'a']);
  assert.equal(moveGroup(value, 'a', 'b'), true); assert.deepEqual(value.groups.map(group => group.id), ['a', 'b']);
  assert.equal(moveGroup(value, 'a', 'a'), false); assert.equal(moveGroup(value, 'missing', 'a'), false);
  // Dropping a group on the item that already follows it is a no-op, not a swap.
  assert.equal(moveGroup(value, 'a', 'b'), false); assert.deepEqual(value.groups.map(group => group.id), ['a', 'b']);
});
test('site moves forward correctly and dropping on the next item is a no-op', () => {
  const value = data();
  assert.equal(moveSite(value, 's1', 'a', 's2'), false); assert.deepEqual(value.groups[0].sites.map(site => site.id), ['s1', 's2']);
  assert.equal(moveSite(value, 's2', 'a', 's1'), true); assert.deepEqual(value.groups[0].sites.map(site => site.id), ['s2', 's1']);
  const three = data(); three.groups[0].sites.push({ id: 's3', title: 'Three', url: 'https://three.example/', text: 'T', size: '1x1' });
  assert.equal(moveSite(three, 's1', 'a', 's3'), true);
  assert.deepEqual(three.groups[0].sites.map(site => site.id), ['s2', 's1', 's3']);
  assert.equal(moveSite(three, 's2', 'a', null), true);
  assert.deepEqual(three.groups[0].sites.map(site => site.id), ['s1', 's3', 's2']);
});
test('backup prefs merge defaults and tolerate removed enum values', () => {
  const partial = backup(); partial.prefs = { engine: 'bing' };
  const parsed = parseBackup(partial).prefs;
  assert.equal(parsed.engine, 'bing'); assert.equal(parsed.layout, 'golden');
  assert.equal(parsed.minimal, false); assert.equal(parsed.wallpaper, 'none');
  const stale = backup(); stale.prefs = { ...backup().prefs, wallpaper: 'gone', theme: 'gone' };
  assert.equal(parseBackup(stale).prefs.wallpaper, 'none');
  assert.equal(parseBackup(stale).prefs.theme, 'glass');
});
test('reserved image ids are rejected', () => {
  for (const iconId of ['wallpaper', 'icon-cache:x']) {
    const value = data(); value.groups[0].sites[0].iconId = iconId;
    assert.throws(() => validateData(value), /保留名称/);
  }
});
test('export without assets drops a custom wallpaper preference; unreferenced assets are ignored', async () => {
  const prefs = { ...DEFAULT_PREFS, wallpaper: 'custom' };
  const store = { async get() { return null; } };
  assert.equal((await buildBackup(data(), prefs, store, false)).prefs.wallpaper, 'none');
  assert.equal((await buildBackup(data(), prefs, store, true)).prefs.wallpaper, 'custom');
  const extra = backup(); extra.assets.push({ id: 'icon:orphan', data: 'data:image/png;base64,AAAA' });
  assert.equal(planImport(data(), extra, 'merge').assets.length, 1);
  // A legacy replace backup selecting a custom wallpaper without its blob falls back to none.
  const legacy = backup(); legacy.prefs = { ...DEFAULT_PREFS, wallpaper: 'custom' }; legacy.assets = [];
  assert.equal(planImport(data(), legacy, 'replace').prefs.wallpaper, 'none');
  assert.equal(planImport(data(), { ...legacy, assets: [{ id: 'wallpaper', data: 'data:image/png;base64,AAAA' }] }, 'replace').prefs.wallpaper, 'custom');
});
test('search query is encoded; image input rejects wrong MIME and oversize', () => {
  assert.equal(searchURL('bing', 'a&b 中文'), 'https://www.bing.com/search?q=a%26b%20%E4%B8%AD%E6%96%87');
  assert.throws(() => validateImage(new Blob(['x'], { type: 'text/html' })));
  assert.throws(() => validateImage({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }));
  assert.equal(validateImage({ type: 'image/png', size: 10 }).size, 10);
});
