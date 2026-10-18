import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { searchSites } from '../js/search/siteIndex.js';

const file = new URL('../data/sites.json', import.meta.url);
const iconDir = new URL('../assets/site-icons/', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));

test('site index is local, categorized, valid, and small enough', () => {
  assert.equal(data.schemaVersion, 1);
  assert.ok(Array.isArray(data.categories));
  assert.ok(data.categories.length >= 8 && data.categories.length <= 10);
  const categoryIds = new Set(data.categories.map(category => category.id));
  assert.equal(categoryIds.size, data.categories.length);
  assert.ok(data.sites.length <= 200);
  assert.ok(statSync(file).size <= 30 * 1024);
  const domains = new Set();
  const counts = Object.fromEntries([...categoryIds].map(id => [id, 0]));
  for (const site of data.sites) {
    assert.ok(site.name && site.cat && Array.isArray(site.aliases));
    assert.ok(categoryIds.has(site.cat));
    assert.match(site.domain, /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/);
    assert.equal(domains.has(site.domain), false);
    domains.add(site.domain);
    counts[site.cat] += 1;
  }
  for (const id of categoryIds) assert.ok(counts[id] >= 12 && counts[id] <= 20, id);
});

test('every local site icon exists, is an image, and no bundled icon is orphaned', () => {
  const referenced = new Set();
  for (const site of data.sites) {
    if (!site.icon) continue;
    assert.match(site.icon, /^[a-z0-9][a-z0-9.-]*\.(?:png|jpe?g|webp|ico)$/i, site.domain);
    assert.equal(referenced.has(site.icon), false, 'duplicate icon reference: ' + site.icon);
    referenced.add(site.icon);
    const iconFile = new URL(site.icon, iconDir);
    assert.ok(existsSync(iconFile), 'missing icon: ' + site.icon);
    const bytes = readFileSync(iconFile);
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const ico = bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]));
    const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    assert.ok(png || jpeg || ico || webp, 'invalid image: ' + site.icon);
  }
  for (const icon of readdirSync(iconDir)) {
    if (!/^[a-z0-9][a-z0-9.-]*\.(?:png|jpe?g|webp|ico)$/i.test(icon)) continue; // ignore .DS_Store etc.
    assert.ok(referenced.has(icon), 'orphaned icon: ' + icon);
  }
});

test('search matches Chinese aliases, pinyin, and English names case-insensitively', () => {
  for (const query of ['b站', 'bili', 'bilibili']) assert.equal(searchSites(data.sites, query)[0].domain, 'bilibili.com');
  for (const query of ['github', 'git', 'GITHUB']) assert.equal(searchSites(data.sites, query)[0].domain, 'github.com');
});

test('prefix matches rank first and results default to a maximum of 24', () => {
  assert.deepEqual(searchSites(data.sites, 'git').slice(0, 3).map(site => site.domain), ['github.com', 'gitlab.com', 'gitee.com']);
  const fake = Array.from({ length: 30 }, (_, index) => ({ name: 'Site ' + index, domain: 'site' + index + '.com', aliases: [], cat: 'common' }));
  assert.equal(searchSites(fake, 'site').length, 24);
  assert.equal(searchSites(data.sites, '   ').length, 0);
  assert.equal(searchSites(data.sites, 'definitely-no-match').length, 0);
});
