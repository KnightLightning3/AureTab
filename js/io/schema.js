import { DEFAULT_PREFS } from '../storage/DataStore.js';
const fail = message => { throw new Error(`数据校验失败：${message}`); };
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const string = (x, length, label) => { if (typeof x !== 'string' || !x.trim() || x.length > length) fail(label); return x; };
const choice = (x, choices, label) => { if (!choices.includes(x)) fail(label); return x; };
export function safeURL(value) { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol)) fail('站点仅支持 HTTP(S) 地址'); return url.href; }
export function validatePrefs(value) {
  if (!object(value)) fail('设备设置');
  if (typeof value.minimal !== 'boolean') fail('极简模式');
  const flag = (flagValue, fallback, label) => { if (flagValue === undefined) return fallback; if (typeof flagValue !== 'boolean') fail(label); return flagValue; };
  const legacyTheme = { taupe: 'glass', midnight: 'aurora' };
  const theme = value.theme === undefined ? 'glass' : (legacyTheme[value.theme] ?? value.theme);
  return {
    engine: choice(value.engine, ['google', 'bing', 'sogou'], '搜索引擎'), minimal: value.minimal, layout: choice(value.layout, ['golden', 'center'], '版心'),
    clock24: flag(value.clock24, true, '时间制式'), showDate: flag(value.showDate, true, '显示日期'), showLabels: flag(value.showLabels, true, '显示图标名称'),
    dateFormat: value.dateFormat === undefined ? 'yyyy-mm-dd' : choice(value.dateFormat, ['yyyy-mm-dd', 'mm-dd'], '日期格式'),
    theme: choice(theme, ['aurora', 'glass', 'frost', 'cyber', 'espresso'], '色彩主题'),
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
      const text = string(site.text, 12, '文字图标'); if (Array.from(text).length > 3) fail('文字图标应为 1 至 3 个字符');
      const item = { id: siteId, title: string(site.title, 120, '站点标题'), url: safeURL(string(site.url, 4096, '站点地址')), size: choice(site.size, ['1x1', '2x1', '1x2', '2x2'], '站点尺寸'), text };
      if (site.iconId !== undefined) item.iconId = string(site.iconId, 100, '图片 ID');
      if (site.iconStyle !== undefined) item.iconStyle = choice(site.iconStyle, ['color', 'glyph'], '图标样式');
      if (site.useText !== undefined) { if (typeof site.useText !== 'boolean') fail('文字图标开关'); item.useText = site.useText; }
      return item;
    });
    return { id, name: string(group.name, 40, '分组名称'), sites };
  });
  return { schemaVersion: 1, groups, settings };
}
export function parseBackup(value) {
  if (!object(value) || value.version !== 1) fail('不支持的备份 version');
  const data = validateData(value.data); const prefs = validatePrefs(value.prefs ?? { ...DEFAULT_PREFS });
  const assets = value.assets ?? []; if (!Array.isArray(assets) || assets.length > 10001) fail('图片列表');
  const ids = new Set(); let bytes = 0;
  const cleanAssets = assets.map(asset => {
    if (!object(asset)) fail('图片'); const id = string(asset.id, 100, '图片 ID');
    if (ids.has(id)) fail('图片 ID 重复'); ids.add(id);
    const encoded = string(asset.data, 60 * 1024 * 1024, '图片数据'); bytes += encoded.length;
    if (bytes > 100 * 1024 * 1024 || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail('图片格式或备份图片总量无效');
    return { id, data: encoded };
  });
  return { version: 1, data, prefs, assets: cleanAssets };
}
