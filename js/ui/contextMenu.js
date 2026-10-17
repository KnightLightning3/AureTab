export function bindContextMenu(actions) {
  const menu = document.querySelector('#context-menu'); const close = () => { menu.hidden = true; };
  document.addEventListener('contextmenu', event => {
    if (event.target.closest('input,textarea,[contenteditable="true"]')) { close(); return; }
    event.preventDefault(); close();
    const site = event.target.closest('[data-site]'); const group = event.target.closest('[data-group]');
    const options = site ? [['编辑', () => actions.editSite(site.dataset.site)], ['删除', () => actions.deleteSite(site.dataset.site), true], ['切换尺寸 1×1 / 2×2', () => actions.resizeSite(site.dataset.site)]]
      : group ? [['重命名', () => actions.renameGroup(group.dataset.group)], ['删除分组', () => actions.deleteGroup(group.dataset.group), true]]
      : event.target.closest('#grid,.sites-panel') ? [['添加图标', actions.addSite], ['添加分组', actions.addGroup]]
      : [['更换壁纸', actions.wallpaper], ['导入 / 导出数据', actions.settings]];
    menu.replaceChildren();
    for (const [label, action, danger] of options) { const button = document.createElement('button'); button.textContent = label; button.role = 'menuitem'; if (danger) button.className = 'danger'; button.onclick = () => { close(); Promise.resolve().then(action).catch(actions.error); }; menu.append(button); }
    menu.hidden = false; const rect = menu.getBoundingClientRect(); menu.style.left = `${Math.max(6, Math.min(event.clientX, innerWidth - rect.width - 6))}px`; menu.style.top = `${Math.max(6, Math.min(event.clientY, innerHeight - rect.height - 6))}px`; menu.firstElementChild?.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', event => { if (!menu.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (!menu.hidden && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); const buttons = [...menu.querySelectorAll('button')]; const offset = event.key === 'ArrowDown' ? 1 : -1; buttons[(buttons.indexOf(document.activeElement) + offset + buttons.length) % buttons.length].focus(); }
  });
  document.addEventListener('scroll', close, true); window.addEventListener('resize', close);
}

