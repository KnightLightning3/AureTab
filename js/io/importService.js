import { planImport, dataURLToBlob } from './exportImport.js';
import { validateData } from './schema.js';

/** Decode before taking the lock; only then merge against the latest snapshot. */
export async function importBackupData({ backup, mode, state, store, assets, decode = createImageBitmap }) {
  const blobs = new Map();
  for (const asset of backup.assets) {
    const blob = dataURLToBlob(asset.data);
    const bitmap = await decode(blob); bitmap.close();
    blobs.set(asset.data, blob);
  }
  return state.exclusive(async () => {
    const current = await store.load({ locked: true });
    const plan = planImport(current, backup, mode);
    const data = validateData({ ...plan.data, revision: current.revision + 1 });
    const entries = plan.assets.map(asset => [asset.id, blobs.get(asset.data)]);
    const oldWallpaper = mode === 'replace' ? await assets.get('wallpaper') : undefined;
    await assets.putMany(entries);
    try {
      if (mode === 'replace' && !entries.some(([id]) => id === 'wallpaper')) await assets.delete('wallpaper');
      await store.saveSnapshot(data, mode === 'replace' ? plan.prefs : undefined,
        mode === 'replace' ? { wallpaperRevision: crypto.randomUUID() } : {});
    } catch (error) {
      // The lock prevents rollback from overwriting another tab's upload.
      if (mode === 'replace') {
        if (oldWallpaper) await assets.put('wallpaper', oldWallpaper);
        else await assets.delete('wallpaper');
      }
      await Promise.all(entries.filter(([id]) => id !== 'wallpaper').map(([id]) => assets.delete(id)));
      throw error;
    }
    return { data, prefs: mode === 'replace' ? plan.prefs : null };
  });
}
