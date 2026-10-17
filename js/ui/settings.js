import { $ } from './dialogs.js';
export function applySettings(data, prefs) {
  for (const [key, value] of Object.entries(data.settings)) document.body.dataset[key] = value;
  document.body.dataset.layout = prefs.layout; document.body.classList.toggle('minimal', prefs.minimal);
  $('#minimal-toggle').setAttribute('aria-pressed', String(prefs.minimal));
  if (prefs.minimal) { document.body.classList.remove('drawer-open'); $('#drawer-backdrop').hidden = true; $('#drawer-toggle').setAttribute('aria-expanded', 'false'); }
  document.querySelectorAll('[data-setting]').forEach(select => { select.value = select.dataset.setting === 'layout' ? prefs.layout : data.settings[select.dataset.setting]; });
}
