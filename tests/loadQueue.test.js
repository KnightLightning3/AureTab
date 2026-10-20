import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadQueue } from '../js/grid/loadQueue.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
test('queue bounds concurrency and skips stale groups without blocking the current group', async () => {
  const queue = createLoadQueue(1), seen = []; let finish, active = true;
  queue.add(() => new Promise(resolve => { finish = resolve; seen.push('first'); }));
  queue.add(() => seen.push('stale'), () => active, () => seen.push('skipped'));
  queue.add(() => seen.push('current'));
  await flush(); assert.deepEqual(seen, ['first']); active = false; finish();
  await flush(); assert.deepEqual(seen, ['first', 'skipped', 'current']);
});
test('failed tasks release their slot', async () => {
  const queue = createLoadQueue(1), seen = [];
  queue.add(() => { throw new Error('network error'); }); queue.add(() => seen.push('next'));
  await flush(); assert.deepEqual(seen, ['next']);
});
