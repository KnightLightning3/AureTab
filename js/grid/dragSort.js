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
