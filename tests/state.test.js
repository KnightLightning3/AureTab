import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateController } from '../js/app/state.js';
import { createAssetCollector, ASSET_GC_DELAY } from '../js/storage/assetLifecycle.js';
import { importBackupData } from '../js/io/importService.js';
import { parseBackup } from '../js/io/schema.js';
import { DEFAULT_PREFS } from '../js/storage/DataStore.js';

const initial = () => ({ schemaVersion: 1, revision: 0, settings: { blur: '0', overlay: '15', radius: '16' }, groups: [{ id: 'a', name: 'A', sites: [] }] });
const serialLock = () => {
  let queue = Promise.resolve();
  return action => { const result = queue.then(action); queue = result.catch(() => {}); return result; };
};
function fixture() {
  let data = initial(), prefs = { ...DEFAULT_PREFS }, fail = false, failRead = false, writes = 0;
  const records = new Map();
  const assets = {
    get: async key => records.get(key), keys: async () => [...records.keys()],
    put: async (key, value) => records.set(key, value), delete: async key => records.delete(key),
    putMany: async entries => { for (const [key, value] of entries) records.set(key, value); },
  };
  const store = {
    async load() { if (failRead) throw new Error('read failed'); return structuredClone(data); },
    async save(next) { return this.saveSnapshot(next); },
    async saveSnapshot(next, nextPrefs) { if (fail) throw new Error('write failed'); writes++; data = structuredClone(next); if (nextPrefs) prefs = structuredClone(nextPrefs); },
  };
  const lock = serialLock();
  const options = { store, lock, readPrefs: async () => structuredClone(prefs), writePrefs: async next => { prefs = structuredClone(next); } };
  return { store, assets, records, lock, state: createStateController(options), second: createStateController(options),
    prefs: () => prefs, writes: () => writes, fail: () => { fail = true; }, failRead: () => { failRead = true; } };
}
const add = name => draft => { draft.groups.push({ id: name, name, sites: [] }); };

test('two independent controllers preserve concurrent edits and preference changes', async () => {
  const f = fixture();
  await Promise.all([f.state.updateData(add('B')), f.second.updateData(add('C'))]);
  assert.deepEqual((await f.store.load()).groups.map(g => g.id), ['a', 'B', 'C']);
  assert.equal((await f.store.load()).revision, 2);
  await Promise.all([f.state.updatePrefs(p => { p.theme = 'frost'; }), f.second.updatePrefs(p => { p.minimal = true; })]);
  assert.equal(f.prefs().theme, 'frost'); assert.equal(f.prefs().minimal, true);
});
test('failed reads never write a stale snapshot; no-op mutations do not increment revision', async () => {
  const f = fixture();
  await f.state.updateData(() => false); assert.equal(f.writes(), 0);
  f.failRead(); await assert.rejects(f.state.updateData(add('B')), /read failed/);
  assert.equal(f.writes(), 0);
});
test('a failed mutation releases the lock and does not poison later edits', async () => {
  const f = fixture();
  await assert.rejects(f.state.updateData(() => { throw new Error('bad edit'); }), /bad edit/);
  await f.second.updateData(add('B'));
  assert.equal((await f.store.load()).revision, 1);
});
const payload = 'data:image/png;base64,YQ==';
const backup = () => parseBackup({ version: 1, data: { ...initial(), groups: [{ id: 'imported', name: 'Imported', sites: [] }] }, prefs: DEFAULT_PREFS, assets: [{ id: 'wallpaper', data: payload }] });
test('merge re-reads after slow image preparation and preserves edits made during decoding', async () => {
  const f = fixture(); let finish, entered;
  const decoding = new Promise(resolve => { entered = resolve; });
  const imported = importBackupData({ ...f, backup: backup(), mode: 'merge', decode: () => { entered(); return new Promise(resolve => { finish = () => resolve({ close() {} }); }); } });
  await decoding; await f.second.updateData(add('B')); finish(); await imported;
  const data = await f.store.load();
  assert.deepEqual(data.groups.map(g => g.name), ['A', 'B', 'Imported']); assert.equal(data.revision, 2);
});
test('replace rolls back wallpaper and imported icons when metadata persistence fails', async () => {
  const f = fixture(); const old = new Blob(['old']); f.records.set('wallpaper', old);
  const raw = backup();
  raw.data.groups[0].sites.push({ id: 'site', title: 'Site', url: 'https://example.com', text: 'S', size: '1x1', iconId: 'custom' });
  raw.assets.push({ id: 'custom', data: payload });
  f.fail();
  await assert.rejects(importBackupData({ ...f, backup: raw, mode: 'replace', decode: async () => ({ close() {} }) }), /write failed/);
  assert.deepEqual([...f.records.keys()], ['wallpaper']); assert.equal(f.records.get('wallpaper'), old);
  assert.equal((await f.store.load()).revision, 0);
});
test('invalid image decoding performs no persistent writes', async () => {
  const f = fixture();
  await assert.rejects(importBackupData({ ...f, backup: backup(), mode: 'replace', decode: async () => { throw new Error('decode failed'); } }), /decode failed/);
  assert.equal(f.writes(), 0); assert.equal(f.records.size, 0);
});
test('GC preserves live originals and caches, removes both orphan representations', async t => {
  const f = fixture();
  await f.state.updateData(d => { d.groups[0].sites.push({ id: 's', title: 'S', url: 'https://example.com', text: 'S', size: '1x1', iconId: 'icon:live' }); });
  for (const key of ['wallpaper', 'icon:live', 'icon-cache:icon:live', 'icon:dead', 'icon-cache:icon:dead', 'icon-cache:icon:preview:dead']) f.records.set(key, {});
  const gc = createAssetCollector({ ...f, readChangedAt: async () => 0, now: () => ASSET_GC_DELAY + 1 });
  t.after(() => gc.dispose());
  assert.deepEqual(await gc.collect(), ['icon:dead', 'icon-cache:icon:dead', 'icon-cache:icon:preview:dead']);
  assert.deepEqual([...f.records.keys()], ['wallpaper', 'icon:live', 'icon-cache:icon:live']);
});
test('GC waits through the quiet period and cannot delete an upload before its metadata commit', async t => {
  const f = fixture(); let finish, entered;
  const uploading = new Promise(resolve => { entered = resolve; });
  const write = f.state.updateData(async d => {
    await f.assets.put('icon:new', new Blob(['new'])); entered();
    await new Promise(resolve => { finish = resolve; });
    d.groups[0].sites.push({ id: 's', title: 'S', url: 'https://example.com', text: 'S', size: '1x1', iconId: 'icon:new' });
  });
  await uploading;
  const gc = createAssetCollector({ ...f, readChangedAt: async () => 0, now: () => ASSET_GC_DELAY + 1 });
  t.after(() => gc.dispose());
  const collection = gc.collect(); finish(); await write; await collection;
  assert.ok(f.records.has('icon:new'));
  const quiet = createAssetCollector({ ...f, readChangedAt: async () => 100, now: () => 200 });
  t.after(() => quiet.dispose()); f.records.set('icon:orphan', {});
  assert.deepEqual(await quiet.collect(), []); assert.ok(f.records.has('icon:orphan'));
});

test('wallpaper save restores the previous image when preference persistence fails', async () => {
  const { saveWallpaper } = await import('../js/wallpaper/saveWallpaper.js');
  const f = fixture(); const old = new Blob(['old']); f.records.set('wallpaper', old);
  const wallpaper = { getCurrent: () => f.assets.get('wallpaper'), set: file => f.assets.put('wallpaper', file), clear: () => f.assets.delete('wallpaper') };
  await assert.rejects(saveWallpaper({ ...f, wallpaper, file: new Blob(['new'], { type: 'image/png' }),
    readPrefs: async () => ({ ...DEFAULT_PREFS }), write: async () => { throw new Error('quota'); }, decode: async () => ({ close() {} }),
  }), /quota/);
  assert.equal(f.records.get('wallpaper'), old);
});
