// All pages of this extension share this origin-scoped lock. Never fall back to
// a page-local queue: that would silently reintroduce lost updates.
export function withWriteLock(action) {
  if (!globalThis.navigator?.locks) throw new Error('浏览器不支持安全保存，请更新浏览器');
  return navigator.locks.request('auretab:write', action);
}
