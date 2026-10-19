import { isLocalIconFile, resolveLocalIconFile } from '../grid/siteIcon.js';
import { ICON_BACKGROUNDS } from '../grid/iconBackground.js';

/** Resolve source independently from display style, including when an upload remains in the form. */
export function resolveIconSelection(values, site, url) {
  const choice = values.get('iconChoice') || (site?.useText ? 'text' : site?.iconId ? 'custom' : 'auto');
  const result = {};
  const style = values.get('iconStyle');
  if (style === 'color' || style === 'glyph') result.iconStyle = style;
  const background = values.get('iconBackground');
  if (background && background !== 'glass' && ICON_BACKGROUNDS.some(item => item.value === background)) result.iconBackground = background;
  const host = new URL(url).hostname;
  const file = values.get('iconLocal') || '';
  const domain = values.get('iconLocalDomain') || '';
  const local = choice !== 'text' && choice !== 'remote' && choice !== 'custom' && isLocalIconFile(file) && domain && (host === domain || host.endsWith(`.${domain}`));
  if (choice === 'text') result.useText = true;
  else if (local) {
    const resolved = resolveLocalIconFile(file);
    if (resolved) result.iconFile = resolved;
    const wide = values.get('iconWide');
    const resolvedWide = resolveLocalIconFile(wide);
    if (resolvedWide && resolvedWide !== result.iconFile) result.iconWide = resolvedWide;
  } else if (choice === 'custom' && site?.iconId && values.get('removeIcon') !== 'remove') result.iconId = site.iconId;
  const upload = values.get('icon');
  const useUpload = choice === 'custom' && upload?.size > 0;
  if (useUpload) delete result.iconId;
  return { properties: result, upload: useUpload ? upload : null };
}
