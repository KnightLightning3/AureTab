/** Keep the grid viewport and sidebar within the space left by the search area.
 * Group switching itself is click / arrow-key driven; there is no wheel handling. */
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
