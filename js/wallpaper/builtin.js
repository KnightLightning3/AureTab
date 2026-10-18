/** Bundled default wallpapers selectable from the settings panel. */
export const BUILTIN_WALLPAPERS = Object.freeze([
  { id: 'default-1', label: '山间晨雾', file: 'default-1.svg' },
  { id: 'default-2', label: '黄昏暖阳', file: 'default-2.svg' },
]);
export const WALLPAPER_CHOICES = ['none', 'custom', ...BUILTIN_WALLPAPERS.map(item => item.id)];
export function builtinWallpaperURL(id) {
  const item = BUILTIN_WALLPAPERS.find(entry => entry.id === id);
  if (!item) return null;
  try { return chrome.runtime.getURL(`assets/wallpapers/${item.file}`); } catch { return null; }
}
