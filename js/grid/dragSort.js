export function moveSite(data, siteId, targetGroupId, beforeSiteId) {
  const source = data.groups.find(group => group.sites.some(site => site.id === siteId));
  const target = data.groups.find(group => group.id === targetGroupId);
  if (!source || !target || siteId === beforeSiteId) return false;
  const index = source.sites.findIndex(site => site.id === siteId); const [site] = source.sites.splice(index, 1);
  const before = target.sites.findIndex(item => item.id === beforeSiteId);
  target.sites.splice(before < 0 ? target.sites.length : before, 0, site); return true;
}
export function bindDragSort(grid, groups, getData, getActive, save) {
  let dragged;
  grid.addEventListener('dragstart', event => { const site = event.target.closest('[data-site]'); if (!site) return; dragged = site.dataset.site; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-easy-tab-site', dragged); });
  const clear = () => document.querySelectorAll('.drag-target').forEach(element => element.classList.remove('drag-target'));
  document.addEventListener('dragend', () => { dragged = null; clear(); });
  for (const container of [grid, groups]) {
    container.addEventListener('dragover', event => { if (!dragged) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; clear(); event.target.closest('[data-site],[data-group]')?.classList.add('drag-target'); });
    container.addEventListener('drop', event => { if (!dragged) return; event.preventDefault(); const groupId = event.target.closest('[data-group]')?.dataset.group ?? getActive(); const before = event.target.closest('[data-site]')?.dataset.site; const changed = moveSite(getData(), dragged, groupId, before); dragged = null; clear(); if (changed) save(); });
  }
}

export function moveGroup(data, groupId, beforeGroupId) {
  const index = data.groups.findIndex(group => group.id === groupId);
  if (index < 0 || groupId === beforeGroupId) return false;
  const [group] = data.groups.splice(index, 1);
  const before = data.groups.findIndex(item => item.id === beforeGroupId);
  data.groups.splice(before < 0 ? data.groups.length : before, 0, group);
  return true;
}

/** Long-press style drag: reorder sidebar group labels with the native DnD contract. */
export function bindGroupDragSort(container, getData, save) {
  let dragged;
  container.addEventListener('dragstart', event => {
    const group = event.target.closest('[data-group]');
    if (!group) return;
    dragged = group.dataset.group;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-easy-tab-group', dragged);
  });
  const clear = () => container.querySelectorAll('.drag-target').forEach(element => element.classList.remove('drag-target'));
  document.addEventListener('dragend', () => { dragged = null; clear(); });
  container.addEventListener('dragover', event => {
    if (!dragged) return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'move'; clear();
    const target = event.target.closest('[data-group]');
    if (target && target.dataset.group !== dragged) target.classList.add('drag-target');
  });
  container.addEventListener('drop', event => {
    if (!dragged) return;
    event.preventDefault();
    const before = event.target.closest('[data-group]')?.dataset.group;
    const changed = moveGroup(getData(), dragged, before);
    dragged = null; clear();
    if (changed) save();
  });
}
