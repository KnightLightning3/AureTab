/** Validate outside the lock; roll back the shared wallpaper if preferences fail. */
export async function saveWallpaper({ file, state, wallpaper, assets, readPrefs, write, decode = createImageBitmap }) {
  if (!file.type.startsWith('image/')) throw new Error('仅支持图片');
  const bitmap = await decode(file); bitmap.close();
  return state.exclusive(async () => {
    const previous = await wallpaper.getCurrent();
    const next = await readPrefs(); next.wallpaper = 'custom';
    await wallpaper.set(file);
    try { await write({ devicePrefs: next, wallpaperRevision: crypto.randomUUID() }); }
    catch (error) {
      if (previous) await assets.put('wallpaper', previous); else await wallpaper.clear();
      throw error;
    }
    return next;
  });
}
