import { engines } from '../search/engines.js';
import { ICON_BACKGROUNDS } from '../grid/iconBackground.js';
import { DEFAULT_PREFS } from '../storage/DataStore.js';
import { isLocalIconFile } from '../grid/siteIcon.js';
import { GROUP_ICON_IDS, DEFAULT_GROUP_ICON } from '../ui/groupIcon.js';
import { WALLPAPER_CHOICES } from '../wallpaper/builtin.js';
const fail = message => { throw new Error(`数据校验失败：${message}`); };
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const string = (x, length, label) => { if (typeof x !== 'string' || !x.trim() || x.length > length) fail(label); return x; };
const choice = (x, choices, label) => { if (!choices.includes(x)) fail(label); return x; };
// Preferences are device-local and must never brick the new-tab page: unknown or
// missing enum values fall back instead of failing the whole load.
const pick = (x, choices, fallback) => (x !== undefined && choices.includes(x) ? x : fallback);
const VALIDATED = Symbol('validated');
export function safeURL(value) { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol)) fail('站点仅支持 HTTP(S) 地址'); return url.href; }
export function validatePrefs(value) {
  if (!object(value)) fail('设备设置');
  if (typeof value.minimal !== 'boolean') fail('极简模式');
  const flag = (flagValue, fallback, label) => { if (flagValue === undefined) return fallback; if (typeof flagValue !== 'boolean') fail(label); return flagValue; };
  const legacyTheme = { taupe: 'glass', midnight: 'aurora' };
  const theme = value.theme === undefined ? 'glass' : (legacyTheme[value.theme] ?? value.theme);
  return {
    engine: pick(value.engine, Object.keys(engines), 'google'), minimal: value.minimal, layout: pick(value.layout, ['golden', 'center'], 'golden'),
    clock24: flag(value.clock24, true, '时间制式'), showDate: flag(value.showDate, true, '显示日期'), showLabels: flag(value.showLabels, true, '显示图标名称'),
    dateFormat: pick(value.dateFormat, ['yyyy-mm-dd', 'mm-dd'], 'yyyy-mm-dd'),
    theme: pick(theme, ['aurora', 'glass', 'frost', 'cyber', 'espresso'], 'glass'),
    wallpaper: pick(value.wallpaper, WALLPAPER_CHOICES, 'none'),
  };
}
export function validateData(value) {
  if (!object(value) || value.schemaVersion !== 1) fail('不支持的 schemaVersion');
  if (!Array.isArray(value.groups) || value.groups.length > 200) fail('分组数量须在 0 至 200 之间');
  if (!object(value.settings)) fail('外观设置');
  const settings = {
    blur: choice(value.settings.blur, ['0', '4', '8', '16'], '模糊预设'),
    overlay: choice(value.settings.overlay, ['0', '15', '30', '45'], '遮罩预设'),
    radius: choice(value.settings.radius, ['0', '8', '16', '50'], '圆角预设'),
  };
  const groupIds = new Set(); const siteIds = new Set(); let siteCount = 0;
  const groups = value.groups.map(group => {
    if (!object(group)) fail('分组'); const id = string(group.id, 100, '分组 ID');
    if (groupIds.has(id)) fail('分组 ID 重复'); groupIds.add(id);
    if (!Array.isArray(group.sites) || (siteCount += group.sites.length) > 10000) fail('站点总数超过 10000');
    const sites = group.sites.map(site => {
      if (!object(site)) fail('站点'); const siteId = string(site.id, 100, '站点 ID');
      if (siteIds.has(siteId)) fail('站点 ID 重复'); siteIds.add(siteId);
      const text = string(site.text, Infinity, '文字图标');
      const item = { id: siteId, title: string(site.title, 120, '站点标题'), url: safeURL(string(site.url, 4096, '站点地址')), size: choice(site.size, ['1x1', '2x1', '1x2', '2x2'], '站点尺寸'), text };
      if (site.iconId !== undefined) {
        const iconId = string(site.iconId, 100, '图片 ID');
        if (iconId === 'wallpaper' || iconId.startsWith('icon-cache:')) fail('图片 ID 使用了保留名称');
        item.iconId = iconId;
      }
      if (site.iconFile !== undefined) { if (!isLocalIconFile(site.iconFile)) fail('本地图标文件名'); item.iconFile = site.iconFile; }
      if (site.iconWide !== undefined) { if (!isLocalIconFile(site.iconWide)) fail('本地图标文件名'); item.iconWide = site.iconWide; }
      if (site.iconBackground !== undefined) item.iconBackground = choice(site.iconBackground, ICON_BACKGROUNDS.map(option => option.value), '图标背景');
      if (site.iconStyle !== undefined) item.iconStyle = choice(site.iconStyle, ['color', 'glyph'], '图标样式');
      if (site.useText !== undefined) { if (typeof site.useText !== 'boolean') fail('文字图标开关'); item.useText = site.useText; }
      return item;
    });
    return { id, name: string(group.name, 40, '分组名称'), icon: pick(group.icon, GROUP_ICON_IDS, DEFAULT_GROUP_ICON), sites };
  });
  const revision = Number.isSafeInteger(value.revision) && value.revision >= 0 ? value.revision : 0;
  return { schemaVersion: 1, revision, groups, settings };
}
export function parseBackup(value) {
  if (!object(value) || value.version !== 1) fail('不支持的备份 version');
  const data = validateData(value.data); const prefs = validatePrefs({ ...DEFAULT_PREFS, ...(value.prefs ?? {}) });
  const assets = value.assets ?? []; if (!Array.isArray(assets) || assets.length > 10001) fail('图片列表');
  const ids = new Set(); let bytes = 0;
  const cleanAssets = assets.map(asset => {
    if (!object(asset)) fail('图片'); const id = string(asset.id, 100, '图片 ID');
    if (ids.has(id)) fail('图片 ID 重复'); ids.add(id);
    // Avoid trim()/slice() copies on multi-megabyte base64 payloads.
    const encoded = asset.data;
    if (typeof encoded !== 'string' || encoded.length > 60 * 1024 * 1024 || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail('图片格式或备份图片总量无效');
    bytes += Math.floor(encoded.length * 3 / 4);
    if (bytes > 100 * 1024 * 1024) fail('图片格式或备份图片总量无效');
    return { id, data: encoded };
  });
  const result = { version: 1, data, prefs, assets: cleanAssets };
  // Mark the result so planImport does not re-scan every base64 payload.
  Object.defineProperty(result, VALIDATED, { value: true });
  return result;
}
export function isParsedBackup(value) { return Boolean(value?.[VALIDATED]); }
