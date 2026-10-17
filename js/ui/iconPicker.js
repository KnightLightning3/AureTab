import { faviconSources } from '../grid/favicon.js';

const LABELS = { color: '带背景', glyph: '镂空', text: '文字', custom: '保留自定义' };

export function mountIconPicker(container, form, site) {
  const field = document.createElement('div'); field.className = 'icon-picker-field';
  const head = document.createElement('div'); head.className = 'icon-picker-head';
  const title = document.createElement('strong'); title.textContent = '图标';
  const request = document.createElement('button'); request.type = 'button'; request.className = 'icon-request'; request.textContent = '请求图标';
  head.append(title, request);
  const grid = document.createElement('div'); grid.className = 'icon-choices'; grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-label', '图标样式');
  const status = document.createElement('p'); status.className = 'icon-picker-status'; status.textContent = '点击“请求图标”，预览并选择带背景、镂空或文字图标。';
  const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'iconChoice';
  field.append(head, grid, status, hidden); container.append(field);

  let selected = site?.useText ? 'text' : site?.iconId ? 'custom' : site?.iconStyle === 'glyph' ? 'glyph' : 'color';
  hidden.value = selected;
  const sampleText = () => Array.from(form.elements.text?.value.trim() || form.elements.title?.value.trim() || 'A').slice(0, 2).join('');
  const setChoice = choice => {
    selected = choice; hidden.value = choice;
    grid.querySelectorAll('.icon-choice').forEach(button => { const active = button.dataset.choice === choice; button.classList.toggle('selected', active); button.setAttribute('aria-checked', String(active)); });
  };
  const loadPreview = (preview, sources) => {
    let index = 0;
    const tryNext = () => {
      if (index >= sources.length) { preview.textContent = '?'; return; }
      const image = document.createElement('img'); image.alt = '';
      image.onload = () => { if (image.naturalWidth >= 32 && image.naturalHeight >= 32) preview.replaceChildren(image); else tryNext(); };
      image.onerror = tryNext; image.src = sources[index++];
    };
    tryNext();
  };
  const build = previews => {
    grid.replaceChildren();
    const choices = site?.iconId ? ['custom', 'color', 'glyph', 'text'] : ['color', 'glyph', 'text'];
    for (const choice of choices) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-choice'; button.dataset.choice = choice; button.setAttribute('role', 'radio');
      const preview = document.createElement('span'); preview.className = `choice-preview ${choice === 'text' ? 'text' : choice === 'glyph' ? 'glyph' : 'color'}`;
      if (choice === 'text') preview.textContent = sampleText();
      else if (choice === 'custom') preview.textContent = '自';
      else { const sources = previews?.[choice]; if (sources?.length) loadPreview(preview, sources); else preview.textContent = '?'; }
      const label = document.createElement('span'); label.className = 'choice-label'; label.textContent = LABELS[choice];
      button.append(preview, label); button.onclick = () => setChoice(choice); grid.append(button);
    }
    setChoice(selected);
  };
  request.onclick = () => {
    let url;
    try { const parsed = new URL(form.elements.url.value.trim()); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); url = parsed.href; }
    catch { status.textContent = '请先填写有效的 HTTP(S) 网址。'; return; }
    status.textContent = '正在请求图标…';
    build({ color: faviconSources(url, 'color'), glyph: faviconSources(url, 'glyph') });
    status.textContent = '选择一种样式，保存后生效。';
  };
  build();
}
