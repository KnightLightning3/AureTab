export function moveSite(data, siteId, targetGroupId, beforeSiteId) {
  const source = data.groups.find(group => group.sites.some(site => site.id === siteId));
  const target = data.groups.find(group => group.id === targetGroupId);
  if (!source || !target || siteId === beforeSiteId) return false;
  const index = source.sites.findIndex(site => site.id === siteId);
  let before = target.sites.findIndex(item => item.id === beforeSiteId);
  if (before < 0) before = target.sites.length;
  else if (source === target && before > index) before -= 1; // The dragged item is removed first.
  if (source === target && before === index) return false;
  const [site] = source.sites.splice(index, 1);
  target.sites.splice(before, 0, site);
  return true;
}

/** Drag-and-drop reports the drop target; the caller applies it inside its own
 * serialized save so a concurrent edit cannot be reverted by a stale snapshot. */
export function bindDragSort(grid, groups, onDrop) {
  let dragged;
  grid.addEventListener('dragstart', event => { const site = event.target.closest('[data-site]'); if (!site) return; dragged = site.dataset.site; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-easy-tab-site', dragged); });
  const clear = () => document.querySelectorAll('.drag-target').forEach(element => element.classList.remove('drag-target'));
  document.addEventListener('dragend', () => { dragged = null; clear(); });
  for (const container of [grid, groups]) {
    container.addEventListener('dragover', event => { if (!dragged) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; clear(); event.target.closest('[data-site],[data-group]')?.classList.add('drag-target'); });
    container.addEventListener('drop', event => {
      if (!dragged) return;
      event.preventDefault();
      const groupId = event.target.closest('[data-group]')?.dataset.group ?? null;
      const before = event.target.closest('[data-site]')?.dataset.site ?? null;
      const siteId = dragged; dragged = null; clear();
      onDrop(siteId, groupId, before);
    });
  }
}

export function moveGroup(data, groupId, beforeGroupId) {
  const index = data.groups.findIndex(group => group.id === groupId);
  if (index < 0 || groupId === beforeGroupId) return false;
  let before = data.groups.findIndex(item => item.id === beforeGroupId);
  if (before < 0) before = data.groups.length;
  else if (before > index) before -= 1;
  if (before === index) return false;
  const [group] = data.groups.splice(index, 1);
  data.groups.splice(before, 0, group);
  return true;
}

/** Long-press then drag: reorder sidebar group labels without hijacking a tap. */
export function bindGroupDragSort(container, onDrop) {
  const LONG_PRESS = 300, MOVE_TOLERANCE = 6;
  let dragged, press = null, dragging = false;
  const cancelPress = () => {
    if (!press) return;
    clearTimeout(press.timer);
    if (!dragging) { press.element.draggable = false; press.element.classList.remove('long-press'); }
    press = null;
  };
  container.addEventListener('pointerdown', event => {
    if (event.button > 0) return;
    const element = event.target.closest('[data-group]');
    if (!element) return;
    cancelPress();
    const state = { element, x: event.clientX, y: event.clientY, timer: 0 };
    state.timer = setTimeout(() => { element.draggable = true; element.classList.add('long-press'); }, LONG_PRESS);
    press = state;
  });
  container.addEventListener('pointermove', event => {
    if (!press || press.element.draggable) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > MOVE_TOLERANCE) cancelPress();
  });
  container.addEventListener('pointerup', cancelPress);
  container.addEventListener('pointercancel', cancelPress);
  container.addEventListener('pointerleave', cancelPress);
  container.addEventListener('dragstart', event => {
    const group = event.target.closest('[data-group]');
    if (!group) return;
    dragging = true;
    if (press) { clearTimeout(press.timer); press.element.classList.remove('long-press'); press = null; }
    dragged = group.dataset.group;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-easy-tab-group', dragged);
  });
  const clear = () => container.querySelectorAll('.drag-target').forEach(element => element.classList.remove('drag-target'));
  document.addEventListener('dragend', () => {
    dragged = null; clear(); dragging = false;
    container.querySelectorAll('[data-group]').forEach(button => { button.draggable = false; button.classList.remove('long-press'); });
  });
  container.addEventListener('dragover', event => {
    if (!dragged) return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'move'; clear();
    const target = event.target.closest('[data-group]');
    if (target && target.dataset.group !== dragged) target.classList.add('drag-target');
  });
  container.addEventListener('drop', event => {
    if (!dragged) return;
    event.preventDefault();
    const before = event.target.closest('[data-group]')?.dataset.group ?? null;
    const groupId = dragged; dragged = null; clear();
    onDrop(groupId, before);
  });
}
