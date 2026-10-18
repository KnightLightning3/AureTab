import { $ } from './dialogs.js';
import { updateClock } from './clock.js';
export function applySettings(data, prefs) {
  for (const [key, value] of Object.entries(data.settings)) document.body.dataset[key] = value;
  document.body.dataset.layout = prefs.layout; document.body.classList.toggle('minimal', prefs.minimal);
  document.body.dataset.theme = prefs.theme;
  document.body.classList.toggle('hide-labels', !prefs.showLabels);
  $('#minimal-toggle').setAttribute('aria-pressed', String(prefs.minimal));
  if (prefs.minimal) { document.body.classList.remove('drawer-open'); $('#drawer-backdrop').hidden = true; $('#drawer-toggle').setAttribute('aria-expanded', 'false'); }
  document.querySelectorAll('[data-setting]').forEach(select => { select.value = select.dataset.setting === 'layout' ? prefs.layout : data.settings[select.dataset.setting]; });
  document.querySelectorAll('[data-pref]').forEach(input => { const key = input.dataset.pref; if (input.type === 'checkbox') input.checked = Boolean(prefs[key]); else input.value = prefs[key]; });
  document.querySelectorAll('[data-theme-choice]').forEach(button => { const active = button.dataset.themeChoice === prefs.theme; button.classList.toggle('active', active); button.setAttribute('aria-checked', String(active)); button.tabIndex = active ? 0 : -1; });
  document.querySelectorAll('[data-wallpaper]').forEach(button => { const active = button.dataset.wallpaper === prefs.wallpaper; button.classList.toggle('active', active); button.setAttribute('aria-checked', String(active)); });
  const dateFormat = document.querySelector('[data-pref="dateFormat"]'); if (dateFormat) dateFormat.disabled = !prefs.showDate;
  updateClock(prefs);
}
