import test from 'node:test';
import assert from 'node:assert/strict';
import { ICON_BACKGROUNDS, applyIconBackground } from '../js/grid/iconBackground.js';
import { validateData, parseBackup } from '../js/io/schema.js';
import { buildBackup, planImport } from '../js/io/exportImport.js';
import { DEFAULT_PREFS } from '../js/storage/DataStore.js';

const data = () => ({ schemaVersion: 1, revision: 0, settings: { blur: '0', overlay: '15', radius: '16' }, groups: [{ id: 'g', name: 'Sites', icon: 'favorite', sites: [{ id: 's', title: 'Example', url: 'https://example.com/', size: '1x1', text: 'E' }] }] });
const site = value => value.groups[0].sites[0];
function element(mono = true) {
  const properties = new Map();
  const image = { style: {} };
  return { dataset: mono ? { mono: 'true' } : {}, style: {
    setProperty(key, value) { properties.set(key, value); },
    removeProperty(key) { properties.delete(key); },
  }, querySelectorAll() { return [image]; }, image, properties };
}

test('palette is discrete, unique and includes the glass default and monochrome extremes', () => {
  assert.deepEqual(ICON_BACKGROUNDS[0], { value: 'glass', label: '毛玻璃', color: null });
  assert.equal(new Set(ICON_BACKGROUNDS.map(option => option.value)).size, ICON_BACKGROUNDS.length);
  for (const option of ICON_BACKGROUNDS.slice(1)) {
    assert.match(option.color, /^#[0-9a-f]{6}$/);
    assert.equal(option.value, option.color);
  }
});
test('all palette choices survive export, JSON parsing, replace and merge', async () => {
  for (const { value } of ICON_BACKGROUNDS) {
    const original = data(); site(original).iconBackground = value;
    const backup = await buildBackup(original, DEFAULT_PREFS, {}, false);
    const parsed = parseBackup(JSON.parse(JSON.stringify(backup)));
    assert.equal(site(parsed.data).iconBackground, value);
    assert.equal(site(planImport(data(), parsed, 'replace').data).iconBackground, value);
    assert.equal(planImport(data(), parsed, 'merge').data.groups[1].sites[0].iconBackground, value);
    assert.equal(site(original).iconBackground, value);
  }
});
test('legacy omission is preserved and arbitrary CSS or malformed values are rejected', () => {
  assert.equal(Object.hasOwn(site(validateData(data())), 'iconBackground'), false);
  for (const invalid of [null, false, 0, {}, '', 'red', '#fff', '#FFFFFF', '#123456', 'url(https://example.com)', 'var(--icon-bg)', 'glass; color:red']) {
    const value = data(); site(value).iconBackground = invalid;
    assert.throws(() => validateData(value), /图标背景/);
  }
});
test('black and white backgrounds set opposite text and monochrome image colors', () => {
  const icon = element();
  applyIconBackground(icon, '#000000');
  assert.equal(icon.style.backgroundColor, '#000000');
  assert.equal(icon.style.color, '#ffffff');
  assert.equal(icon.image.style.filter, 'brightness(0) invert(1)');
  applyIconBackground(icon, '#ffffff');
  assert.equal(icon.style.color, '#000000');
  assert.equal(icon.image.style.filter, 'brightness(0)');
  assert.equal(icon.dataset.background, '#ffffff');
});
test('glass and unknown runtime values restore theme defaults; colored artwork is unfiltered', () => {
  const icon = element();
  for (const value of [undefined, 'glass', 'invalid']) {
    applyIconBackground(icon, '#000000');
    applyIconBackground(icon, value);
    assert.equal(icon.style.backgroundColor, '');
    assert.equal(icon.style.color, '');
    assert.equal(icon.image.style.filter, '');
    assert.equal(icon.properties.has('--icon-mono-filter'), false);
    assert.equal(icon.dataset.background, 'glass');
  }
  const colored = element(false);
  applyIconBackground(colored, '#000000');
  assert.equal(colored.image.style.filter, '');
});
