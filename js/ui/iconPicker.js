import { faviconSources } from '../grid/favicon.js';
import { showClassifiedIcon } from '../grid/iconKind.js';
import { localIconURL, isMonoIconFile } from '../grid/siteIcon.js';
import { assetStore } from '../storage/idb.js';
import { report } from './dialogs.js';

const LABELS = { auto: '自动', color: '实心铺满', glyph: '镂空', text: '文字', custom: '保留自定义' };

export function mountIconPicker(container, form, site, options = {}) {
  const field = document.createElement('div'); field.className = 'icon-picker-field';
  const head = document.createElement('div'); head.className = 'icon-picker-head';
  const title = document.createElement('strong'); title.textContent = '图标';
  const actions = document.createElement('div'); actions.className = 'icon-picker-actions';
  const browse = document.createElement('button'); browse.type = 'button'; browse.className = 'icon-browse'; browse.textContent = '从常用站点选择';
  const request = document.createElement('button'); request.type = 'button'; request.className = 'icon-request'; request.textContent = '请求图标';
  if (options.browse !== false) actions.append(browse);
  actions.append(request); head.append(title, actions);
  const grid = document.createElement('div'); grid.className = 'icon-choices'; grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-label', '图标样式');
  const status = document.createElement('p'); status.className = 'icon-picker-status'; status.textContent = '点击“请求图标”，预览并选择带背景、镂空或文字图标。';
  const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'iconChoice';
  const localFile = document.createElement('input'); localFile.type = 'hidden'; localFile.name = 'iconLocal';
  const localDomain = document.createElement('input'); localDomain.type = 'hidden'; localDomain.name = 'iconLocalDomain';
  const localWide = document.createElement('input'); localWide.type = 'hidden'; localWide.name = 'iconWide';
  field.append(head, grid, status, hidden, localFile, localDomain, localWide); container.append(field);

  let selected = site?.useText ? 'text' : site?.iconId ? 'custom' : site?.iconStyle || 'auto';
  let localIcon = options.iconFile ?? site?.iconFile ?? '';
  let localHost = options.domain ?? '';
  let localIconWide = options.iconWide ?? site?.iconWide ?? '';
  hidden.value = selected;
  localFile.value = localIcon; localDomain.value = localHost; localWide.value = localIconWide;
  const sampleText = () => Array.from(form.elements.text?.value.trim() || form.elements.title?.value.trim() || 'A').slice(0, 2).join('');
  const setChoice = choice => {
    selected = choice; hidden.value = choice;
    grid.querySelectorAll('.icon-choice').forEach(button => {
      const active = button.dataset.choice === choice;
      button.classList.toggle('selected', active); button.setAttribute('aria-checked', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  };
  const loadPreview = (preview, sources) => {
    let index = 0;
    const tryNext = () => {
      if (!preview.isConnected) return;
      if (index >= sources.length) { preview.textContent = sampleText(); return; }
      showClassifiedIcon(preview, sources[index++], { manual: preview.dataset.manual }).then(shown => { if (!shown) tryNext(); }).catch(tryNext);
    };
    tryNext();
  };
  const openLocalPreview = (preview, file) => {
    const url = localIconURL(file); if (!url) return false;
    if (isMonoIconFile(file)) preview.dataset.mono = 'true'; else delete preview.dataset.mono;
    showClassifiedIcon(preview, url, { manual: preview.dataset.manual }).catch(() => {}); return true;
  };
  const build = previews => {
    grid.replaceChildren();
    const choices = site?.iconId ? ['custom', 'auto', 'color', 'glyph', 'text'] : ['auto', 'color', 'glyph', 'text'];
    // One IDB read per rebuild, not one per preview style.
    const customBlob = site?.iconId && !localIcon ? assetStore.get(site.iconId) : null;
    for (const choice of choices) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-choice'; button.dataset.choice = choice; button.setAttribute('role', 'radio');
      const preview = document.createElement('span'); preview.className = `choice-preview ${choice === 'text' ? 'text' : choice === 'glyph' ? 'glyph' : 'color'}`;
      preview.textContent = sampleText();
      if (choice === 'color' || choice === 'glyph') preview.dataset.manual = choice;
      if (choice !== 'text') {
        if (customBlob) {
          preview.textContent = '自';
          customBlob.then(blob => blob && showClassifiedIcon(preview, site.iconId, { blob, manual: choice === 'custom' ? site.iconStyle : preview.dataset.manual })).catch(() => {});
        }
        else if (['auto', 'color', 'glyph'].includes(choice) && localIcon && openLocalPreview(preview, localIcon)) {}
        else { const sources = previews?.[choice]; if (sources?.length) loadPreview(preview, sources); else preview.textContent = '?'; }
      }
      const label = document.createElement('span'); label.className = 'choice-label'; label.textContent = LABELS[choice];
      button.append(preview, label); button.onclick = () => setChoice(choice); grid.append(button);
    }
    setChoice(selected);
  };
  grid.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const buttons = [...grid.querySelectorAll('.icon-choice')]; if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement); if (index < 0) return;
    event.preventDefault();
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const next = buttons[(index + (forward ? 1 : -1) + buttons.length) % buttons.length];
    next.focus(); next.click();
  });
  const setLocal = (file, domain = localHost, wide = '') => {
    localIcon = file || ''; localHost = localIcon ? domain : '';
    localIconWide = localIcon ? (wide || '') : '';
    localFile.value = localIcon; localDomain.value = localHost; localWide.value = localIconWide;
    if (localIcon) { selected = 'auto'; build(); status.textContent = '已使用本地图标；需要其他样式时可点“请求图标”。'; }
    else build();
  };
  request.onclick = () => {
    let url;
    try {
      let raw = form.elements.url.value.trim();
      if (raw && !/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
      const parsed = new URL(raw); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); url = parsed.href;
    }
    catch { status.textContent = '请先填写有效的 HTTP(S) 网址。'; return; }
    status.textContent = '正在请求图标…';
    localIcon = ''; localHost = ''; localIconWide = ''; localFile.value = ''; localDomain.value = ''; localWide.value = '';
    build({ auto: faviconSources(url), color: faviconSources(url, 'color'), glyph: faviconSources(url, 'glyph') });
    status.textContent = '选择一种样式，保存后生效。';
  };
  let selectorOpening = false;
  browse.onclick = () => {
    if (selectorOpening) return; selectorOpening = true;
    import('./siteSelector.js').then(({ openSiteSelector }) => openSiteSelector({
      onSelect: site => {
        form.elements.title.value = site.name; form.elements.url.value = `https://${site.domain}/`;
        if (site.icon) setLocal(site.icon, site.domain, site.iconWide);
        else { setLocal(''); status.textContent = '该站点暂无本地图标；可点“请求图标”或使用文字图标。'; }
      },
      onCustom: () => { const input = form.elements.icon; if (input) { input.closest('label')?.scrollIntoView({ block: 'nearest' }); input.focus(); input.click(); } }
    })).catch(report).finally(() => { selectorOpening = false; });
  };
  build();
  return { request: () => request.click(), setLocal };
}
