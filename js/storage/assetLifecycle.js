import { withWriteLock } from './writeLock.js';
export const ASSET_GC_DELAY = 10 * 60 * 1000;

/** Metadata and original uploads are protected by the same lock. Classifier
 * caches are disposable; a concurrent cache fill can be collected next time. */
export function createAssetCollector({ store, assets, readChangedAt, lock = withWriteLock, now = Date.now }) {
  let timer;
  const collect = () => lock(async () => {
    const changedAt = await readChangedAt();
    const remaining = ASSET_GC_DELAY - (now() - changedAt);
    if (remaining > 0) { schedule(remaining); return []; }
    const data = await store.load({ locked: true });
    const live = new Set(data.groups.flatMap(group => group.sites.map(site => site.iconId).filter(Boolean)));
    const keys = await assets.keys();
    const removed = [];
    const version = globalThis.chrome?.runtime?.getManifest?.().version;
    for (const key of keys) {
      if (typeof key !== 'string') continue;
      const original = key.startsWith('icon:') ? key : key.startsWith('icon-cache:icon:') ? key.slice('icon-cache:'.length) : null;
      const oldBundle = version && key.startsWith('icon-cache:') && key.includes('chrome-extension://') && !key.startsWith(`icon-cache:${version}:`);
      if ((original && !live.has(original)) || oldBundle) {
        await assets.delete(key); removed.push(key);
      }
    }
    return removed;
  });
  function schedule(delay = ASSET_GC_DELAY) {
    clearTimeout(timer);
    timer = setTimeout(() => { collect().catch(console.error); }, delay);
  }
  return { collect, schedule, dispose() { clearTimeout(timer); } };
}
