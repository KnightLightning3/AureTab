import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalDataStore } from '../js/storage/LocalDataStore.js';

function chromeMock(initial = {}) {
  const store = { ...initial };
  let listener;
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) { return key in store ? { [key]: store[key] } : {}; },
        async set(patch) { Object.assign(store, patch); },
      },
      onChanged: { addListener(handler) { listener = handler; }, removeListener() {} },
    },
  };
  return { store, emit: (changes, area = 'local') => listener(changes, area) };
}
const data = { schemaVersion: 1, revision: 0, settings: { blur: '0', overlay: '15', radius: '16' }, groups: [{ id: 'a', name: 'A', icon: 'favorite', sites: [] }] };
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

test('external changes are validated and a deleted document reloads defaults', async t => {
  const original = globalThis.chrome;
  const mock = chromeMock({ appData: data });
  t.after(() => { globalThis.chrome = original; });
  const store = new LocalDataStore();
  const seen = [];
  store.onExternalChange(value => seen.push(value));
  mock.emit({ appData: { newValue: { ...data, revision: 3 } } });
  await flush();
  assert.equal(seen[0].revision, 3);
  delete mock.store.appData;
  mock.emit({ appData: { newValue: undefined } });
  await flush();
  assert.equal(seen[1].groups[0].name, '常用');
  assert.equal(seen[1].revision, 0);
});
test('unrelated storage areas are ignored', async t => {
  const original = globalThis.chrome;
  const mock = chromeMock({ appData: data });
  t.after(() => { globalThis.chrome = original; });
  const store = new LocalDataStore();
  const seen = [];
  store.onExternalChange(value => seen.push(value));
  mock.emit({ appData: { newValue: { ...data, revision: 9 } } }, 'sync');
  await flush();
  assert.deepEqual(seen, []);
});
