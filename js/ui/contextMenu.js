export function bindContextMenu(actions) {
  const menu = document.querySelector('#context-menu'); const close = () => { menu.hidden = true; };
  document.addEventListener('contextmenu', event => {
    if (event.target.closest('input,textarea,[contenteditable="true"]')) { close(); return; }
    event.preventDefault(); close();
    const site = event.target.closest('[data-site]'); const group = event.target.closest('[data-group]');
    const sizes = [['1x1', '1 × 1'], ['2x1', '2 × 1 横向'], ['1x2', '1 × 2 纵向'], ['2x2', '2 × 2']];
    const options = site ? [
      ['编辑', () => actions.editSite(site.dataset.site)],
      { separator: true },
      ...sizes.map(([size, label]) => [`${site.dataset.size === size ? '✓ ' : ''}${label}`, () => actions.resizeSite(site.dataset.site, size), false, site.dataset.size === size]),
      { separator: true },
      ['删除', () => actions.deleteSite(site.dataset.site), true],
    ]
      : group ? [['重命名', () => actions.renameGroup(group.dataset.group)], ['删除分组', () => actions.deleteGroup(group.dataset.group), true]]
      : event.target.closest('#grid,.sites-panel') ? [['添加图标', actions.addSite], ['添加分组', actions.addGroup]]
      : [['更换壁纸', actions.wallpaper], ['导入 / 导出数据', actions.settings]];
    menu.replaceChildren();
    for (const option of options) {
      if (option.separator) { const separator = document.createElement('div'); separator.className = 'menu-separator'; separator.setAttribute('role', 'separator'); menu.append(separator); continue; }
      const [label, action, danger, checked] = option; const button = document.createElement('button'); button.textContent = label;
      if (checked !== undefined) { button.setAttribute('role', 'menuitemradio'); button.setAttribute('aria-checked', String(checked)); } else button.setAttribute('role', 'menuitem');
      if (danger) button.className = 'danger'; button.onclick = () => { close(); Promise.resolve().then(action).catch(actions.error); }; menu.append(button);
    }
    menu.hidden = false; const rect = menu.getBoundingClientRect(); menu.style.left = `${Math.max(6, Math.min(event.clientX, innerWidth - rect.width - 6))}px`; menu.style.top = `${Math.max(6, Math.min(event.clientY, innerHeight - rect.height - 6))}px`; menu.firstElementChild?.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => { if (!menu.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (!menu.hidden && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); const buttons = [...menu.querySelectorAll('button')]; const offset = event.key === 'ArrowDown' ? 1 : -1; buttons[(buttons.indexOf(document.activeElement) + offset + buttons.length) % buttons.length].focus(); }
  });
  document.addEventListener('scroll', close, true); window.addEventListener('resize', close);
}

