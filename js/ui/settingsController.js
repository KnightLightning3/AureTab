import { $, report } from './dialogs.js';

export function bindSettingsControls({ on, closeSettings, changePrefs, change, uploadWallpaper, selectWallpaper }) {
  on('#settings-close', 'click', closeSettings); on('#settings-backdrop', 'click', closeSettings);
  $('#settings-panel').addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...$('#settings-panel').querySelectorAll('button, select, input')].filter(item => !item.disabled && item.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.querySelectorAll('[data-setting]').forEach(select => select.addEventListener('change', () => {
    // Capture the value now; the queued save may run after the control was reset.
    const key = select.dataset.setting, value = select.value;
    (key === 'layout' ? changePrefs(next => { next.layout = value; }) : change(draft => { draft.settings[key] = value; })).catch(report);
  }));
  document.querySelectorAll('[data-pref]').forEach(input => input.addEventListener('change', () => {
    const key = input.dataset.pref, value = input.type === 'checkbox' ? input.checked : input.value;
    changePrefs(next => { next[key] = value; }).catch(report);
  }));
  const themeChoices = [...document.querySelectorAll('[data-theme-choice]')];
  themeChoices.forEach((button, index) => {
    button.addEventListener('click', () => changePrefs(next => { next.theme = button.dataset.themeChoice; }).catch(report));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = themeChoices[(index + direction + themeChoices.length) % themeChoices.length];
      next.focus(); next.click();
    });
  });
  on('#wallpaper-input', 'change', uploadWallpaper);
  const wallpaperChoices = [...document.querySelectorAll('[data-wallpaper]')];
  wallpaperChoices.forEach((button, index) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.wallpaper;
      if (choice === 'custom') { $('#wallpaper-input').click(); return; }
      selectWallpaper(choice).catch(report);
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = wallpaperChoices[(index + direction + wallpaperChoices.length) % wallpaperChoices.length];
      next.focus(); next.click();
    });
  });
}
