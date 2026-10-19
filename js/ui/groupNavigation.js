/** Keep the grid viewport and sidebar within the space left by the search area.
 * Wheel navigation is bound separately below. */
export function bindGridLayout(container) {
  const viewport = container.querySelector('.grid-viewport');
  const sidebar = container.querySelector('#sidebar');
  const grid = container.querySelector('#grid');
  if (!viewport || !sidebar || !grid) return;
  let measureFrame = 0;
  const applyMeasure = () => {
    measureFrame = 0;
    const available = Math.max(0, Math.min(426, innerHeight - viewport.getBoundingClientRect().top - 24));
    const style = getComputedStyle(grid);
    const row = parseFloat(style.gridAutoRows) + parseFloat(style.rowGap);
    const height = row > 0 && available >= row * 1.5
      ? Math.floor((available - row / 2) / row) * row + row / 2 : available;
    const value = `${height}px`;
    if (viewport.style.maxHeight === value) return;
    viewport.style.maxHeight = value; viewport.style.height = value; sidebar.style.maxHeight = value;
  };
  // Coalesce resize/observer bursts into one layout read+write per frame.
  const schedule = typeof globalThis.requestAnimationFrame === 'function'
    ? callback => globalThis.requestAnimationFrame(callback)
    : callback => setTimeout(callback, 0);
  const measure = () => { if (!measureFrame) measureFrame = schedule(applyMeasure) || 1; };
  window.addEventListener('resize', measure);
  const observer = new ResizeObserver(measure);
  observer.observe(container); observer.observe(document.querySelector('.search-section'));
  measure();
  const layoutChanges = new MutationObserver(measure);
  layoutChanges.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-layout'] });
}

/** Delay boundary navigation by 50ms; a momentum burst switches at most once.
 * Native scrolling takes priority whenever the grid can scroll in that direction. */
export function bindGroupWheel(target, { viewport, enabled, current, move, delay = 50 }) {
  let pending, idle, direction = 0, consumed = false;
  const cancel = () => { clearTimeout(pending); pending = undefined; };
  const reset = () => { cancel(); consumed = false; direction = 0; };
  target.addEventListener('wheel', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || !enabled(event.target) || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) { reset(); return; }
    const nextDirection = Math.sign(event.deltaY);
    if (!nextDirection) return;
    clearTimeout(idle);
    idle = setTimeout(reset, 90);
    if (direction && direction !== nextDirection) { cancel(); consumed = false; }
    direction = nextDirection;
    const canScroll = direction < 0 ? viewport.scrollTop > 1
      : viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1;
    if (canScroll) { cancel(); return; }
    event.preventDefault();
    if (consumed || pending !== undefined) return;
    const origin = current();
    const requestedDirection = direction;
    pending = setTimeout(() => {
      pending = undefined;
      if (!enabled(event.target) || current() !== origin) return;
      const stillAtEdge = requestedDirection < 0 ? viewport.scrollTop <= 1
        : viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1;
      if (!stillAtEdge) return;
      consumed = true;
      move(requestedDirection);
    }, delay);
  }, { passive: false });
}
