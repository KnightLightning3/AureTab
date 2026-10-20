import { displayIconText } from '../grid/textIcon.js';
import { faviconSources } from '../grid/favicon.js';
import { showClassifiedIcon, releaseIconTree } from '../grid/iconKind.js';
import { localIconURL, isMonoIconFile, resolveLocalIconFile } from '../grid/siteIcon.js';
import { findLocalIconVariants } from '../grid/localIconVariants.js';
import { ICON_BACKGROUNDS, applyIconBackground } from '../grid/iconBackground.js';
import { report } from './dialogs.js';

export function mountIconPicker(container, form, site, options = {}) {
  const make = (tag, className, text) => {
    const node = document.createElement(tag); node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const field = make('div', 'icon-picker-field');
  const head = make('div', 'icon-picker-head');
  const actions = make('div', 'icon-picker-actions');
  const browse = make('button', 'icon-browse', '从常用站点选择');
  const request = make('button', 'icon-request', '请求远程图标');
  browse.type = request.type = 'button';
  if (options.browse !== false) actions.append(browse);
  actions.append(request); head.append(make('strong', '', '图标'), actions);
  const group = (label, className) => {
    const node = make('div', className); node.setAttribute('role', 'radiogroup'); node.setAttribute('aria-label', label);
    node.addEventListener('keydown', event => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      const buttons = [...node.querySelectorAll('[role=radio]')];
      const index = buttons.indexOf(document.activeElement); if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus(); buttons[next].click();
    });
    return node;
  };
  const sources = group('图标来源', 'icon-choices icon-source-grid');
  const styles = group('显示样式', 'icon-style-controls');
  const backgrounds = group('图标背景', 'icon-background-controls');
  const status = make('p', 'icon-picker-status', '本地图标可直接选择；仅点击“请求远程图标”时加载远程预览。');
  status.setAttribute('role', 'status');
  const hidden = {};
  for (const name of ['iconChoice', 'iconLocal', 'iconLocalDomain', 'iconWide', 'iconStyle', 'iconBackground']) {
    hidden[name] = document.createElement('input'); hidden[name].type = 'hidden'; hidden[name].name = name;
  }
  let selected = site?.useText ? 'text' : site?.iconId ? 'custom' : 'auto';
  let local = resolveLocalIconFile(options.iconFile ?? site?.iconFile) || '';
  let domain = options.domain ?? '';
  let wide = resolveLocalIconFile(options.iconWide ?? site?.iconWide) || '';
  if (wide === local) wide = '';
  if (site?.iconFile && !local && !site?.iconId) selected = 'text';
  let style = ['color', 'glyph'].includes(site?.iconStyle) ? site.iconStyle : '';
  let background = site?.iconBackground || 'glass';
  let variants = local ? [{ file: local, label: '当前本地图标' }] : [];
  let disposed = false;
  let remoteURL = '', discovery = 0, upload = null, uploadKey = '';
  const sampleText = () => displayIconText(form.elements.text?.value.trim() || form.elements.title?.value.trim() || 'A', form.elements.size?.value);
  const parsedURL = () => {
    let raw = form.elements.url?.value.trim() || '';
    if (raw && !/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
    try { const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) ? url : null; } catch { return null; }
  };
  const sync = () => {
    Object.entries({ iconChoice: selected, iconLocal: local, iconLocalDomain: domain, iconWide: wide, iconStyle: style, iconBackground: background })
      .forEach(([name, value]) => { hidden[name].value = value; });
  };
  const radio = (parent, label, active, onSelect, className = 'icon-control') => {
    const button = make('button', className); button.type = 'button'; button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(active)); button.classList.toggle('selected', active);
    button.tabIndex = active ? 0 : -1; button.setAttribute('aria-label', label);
    button.onclick = () => {
      const focused = document.activeElement === button;
      onSelect();
      if (focused) [...parent.querySelectorAll('[role=radio]')].find(item => item.getAttribute('aria-label') === label)?.focus();
    };
    parent.append(button); return button;
  };
  const ensureTabStop = node => { if (!node.querySelector('[tabindex="0"]')) node.querySelector('[role=radio]')?.setAttribute('tabindex', '0'); };
  const render = () => {
    if (disposed) return;
    sync(); releaseIconTree(sources); sources.replaceChildren(); styles.replaceChildren(); backgrounds.replaceChildren();
    const card = (label, active, select, file, blob, remote, mono) => {
      const button = radio(sources, label, active, select, 'icon-choice');
      const preview = make('span', 'choice-preview', sampleText());
      if (mono || isMonoIconFile(file)) preview.dataset.mono = 'true';
      applyIconBackground(preview, background);
      button.append(preview, make('span', 'choice-label', label));
      if (!file && !remote) { preview.classList.add('text'); return; }
      const urls = remote ? faviconSources(remote, style || undefined) : [blob ? file : localIconURL(file) || file];
      (async () => {
        for (const url of urls) {
          if (disposed || !preview.isConnected) return;
          try { if (await showClassifiedIcon(preview, url, { manual: style || undefined, ...(blob ? { blob } : {}) })) { applyIconBackground(preview, background); return; } } catch { /* Try next remote source. */ }
        }
      })();
    };
    for (const variant of variants) card(variant.label || variant.file, selected === 'auto' && local === variant.file, () => {
      selected = 'auto'; local = variant.file; domain = parsedURL()?.hostname || domain;
      wide = ''; // An explicit variant must not be replaced by an automatic wordmark.
      render();
    }, variant.file, null, null, variant.mono);
    if (site?.iconId || upload) card(upload ? '新上传图标' : '自定义图标', selected === 'custom', () => { selected = 'custom'; render(); }, upload ? uploadKey : site.iconId, upload);
    card('文字', selected === 'text', () => { selected = 'text'; render(); });
    card(remoteURL ? '远程图标' : '自动获取（保存后）', selected === 'remote' || (selected === 'auto' && !local), () => {
      selected = remoteURL ? 'remote' : 'auto'; if (!remoteURL) { local = ''; domain = ''; wide = ''; } render();
    }, null, null, remoteURL);
    for (const [value, label] of [['', '自动'], ['color', '实心铺满'], ['glyph', '镂空']]) {
      radio(styles, label, style === value, () => { style = value; render(); }).textContent = label;
    }
    for (const item of ICON_BACKGROUNDS) {
      const button = radio(backgrounds, item.label, background === item.value, () => { background = item.value; render(); }, 'icon-background-swatch');
      button.title = item.label;
      const swatch = make('span', 'icon-swatch-color'); applyIconBackground(swatch, item.value);
      button.append(swatch, make('span', '', item.label));
    }
    [sources, styles, backgrounds].forEach(ensureTabStop);
  };
  const discover = async () => {
    const version = ++discovery, url = parsedURL();
    try {
      const found = url ? await findLocalIconVariants(url.href, { iconFile: local, iconWide: wide }) : [];
      if (version !== discovery) return;
      variants = [...new Map([...(local ? [{ file: local, label: '当前本地图标' }] : []), ...found].map(item => [item.file, item])).values()];
      render();
    } catch { if (version === discovery) status.textContent = '本地图标读取失败，仍可上传或请求远程图标。'; }
  };
  const setLocal = (file, host = domain, iconWide = '') => {
    selected = resolveLocalIconFile(file) ? 'auto' : 'text'; remoteURL = '';
    local = resolveLocalIconFile(file) || ''; domain = local ? host : ''; wide = local ? resolveLocalIconFile(iconWide) || '' : '';
    if (wide === local) wide = '';
    variants = local ? [{ file: local, label: '当前本地图标' }] : [];
    render(); void discover();
  };
  request.onclick = () => {
    const url = parsedURL();
    if (!url) { status.textContent = '请先填写有效的 HTTP(S) 网址。'; return; }
    remoteURL = url.href; selected = 'remote'; render();
    status.textContent = '已请求远程预览；本地图标仍可选择。';
  };
  let selectorOpening = false;
  browse.onclick = () => {
    if (selectorOpening) return; selectorOpening = true;
    import('./siteSelector.js').then(({ openSiteSelector }) => openSiteSelector({
      onSelect: item => {
        form.elements.title.value = item.name; form.elements.url.value = `https://${item.domain}/`;
        selected = 'auto'; setLocal(item.icon, item.domain, item.iconWide);
      },
      onCustom: () => { const input = form.elements.icon; input?.closest('label')?.scrollIntoView({ block: 'nearest' }); input?.click(); }
    })).catch(report).finally(() => { selectorOpening = false; });
  };
  form.elements.url?.addEventListener('input', () => {
    const host = parsedURL()?.hostname || '';
    if (domain && host !== domain && !host.endsWith(`.${domain}`)) { local = ''; domain = ''; wide = ''; variants = []; }
    if (remoteURL && parsedURL()?.href !== remoteURL) { remoteURL = ''; if (selected === 'remote') selected = 'auto'; }
    render(); void discover();
  });
  form.elements.icon?.addEventListener('change', event => {
    upload = event.target.files?.[0] || null;
    if (upload) { uploadKey = `icon:preview:${crypto.randomUUID()}`; selected = 'custom'; }
    render();
  });
  form.elements.size?.addEventListener('change', render);
  for (const name of ['title', 'text']) form.elements[name]?.addEventListener('input', () => {
    sources.querySelectorAll('.choice-preview.text').forEach(preview => { preview.textContent = sampleText(); });
  });
  field.append(head, make('div', 'icon-picker-section-title', '图标来源'), sources,
    make('div', 'icon-picker-section-title', '显示样式（可选）'), styles,
    make('div', 'icon-picker-section-title', '图标背景'), backgrounds, status, ...Object.values(hidden));
  container.append(field); render(); void discover();
  return { request: () => request.click(), setLocal, dispose() { disposed = true; discovery++; releaseIconTree(field); } };
}
