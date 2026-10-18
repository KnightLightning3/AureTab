export const WHEEL_RULES = Object.freeze({
  gestureGap: 150, trackpadThreshold: 120, mouseDelta: 50, mouseSteps: 2,
  mouseWindow: 400, cooldown: 500, sidebarThrottle: 150, maxPull: 24,
  edgeTolerance: 1, linePixels: 16, pagePixels: 600
});

export function createWheelState() {
  return { lastTime: -Infinity, cooldownUntil: -Infinity, origin: null, direction: 0, amount: 0, mouse: null, mode: null };
}

/** Pure gesture reducer: the start edge is latched until a wheel gap >150ms. */
export function stepGridWheel(previous, input) {
  const state = { ...previous };
  const gap = input.time - state.lastTime;
  state.lastTime = input.time;
  const result = { state, switchDirection: 0, pull: 0, hintDirection: 0 };
  if (input.time < state.cooldownUntil) return result;
  const discrete = input.deltaMode === 1 || Math.abs(input.rawDelta ?? input.delta) >= WHEEL_RULES.mouseDelta;
  if (gap > WHEEL_RULES.gestureGap || !state.origin) {
    state.origin = { top: input.top, bottom: input.bottom };
    state.amount = 0; state.mode = discrete ? 'mouse' : 'trackpad';
  }
  const direction = Math.sign(input.delta);
  if (!direction) return result;
  if (direction !== state.direction) { state.amount = 0; state.mouse = null; }
  state.direction = direction;
  const startedAtEdge = direction > 0 ? state.origin.bottom : state.origin.top;
  const atEdge = direction > 0 ? input.bottom : input.top;
  if (!startedAtEdge || !atEdge) { state.mouse = null; state.amount = 0; return result; }
  let ready = false;
  if (state.mode === 'mouse' && discrete) {
    const pair = state.mouse;
    state.mouse = pair && pair.direction === direction && input.time - pair.time <= WHEEL_RULES.mouseWindow
      ? { ...pair, count: pair.count + 1 } : { direction, time: input.time, count: 1 };
    state.amount = state.mouse.count / WHEEL_RULES.mouseSteps * WHEEL_RULES.trackpadThreshold;
    ready = state.mouse.count >= WHEEL_RULES.mouseSteps;
  } else if (state.mode === 'trackpad') {
    state.mouse = null; state.amount += Math.abs(input.delta);
    ready = state.amount >= WHEEL_RULES.trackpadThreshold;
  }
  const hasNeighbor = input.index + direction >= 0 && input.index + direction < input.count;
  result.pull = direction * WHEEL_RULES.maxPull * (1 - Math.exp(-state.amount / WHEEL_RULES.trackpadThreshold));
  result.hintDirection = hasNeighbor ? direction : 0;
  if (ready && hasNeighbor) {
    result.switchDirection = direction; result.pull = 0; result.hintDirection = 0;
    state.cooldownUntil = input.time + WHEEL_RULES.cooldown;
    state.origin = null; state.mouse = null; state.amount = 0;
  }
  return result;
}

export function bindGroupWheel(container, getGroups, getActive, select) {
  const surface = container.ownerDocument ?? container;
  const viewport = container.querySelector('.grid-viewport');
  const grid = container.querySelector('#grid');
  const sidebar = container.querySelector('#sidebar');
  const hint = document.createElement('div'); hint.className = 'group-wheel-hint'; hint.hidden = true;
  viewport.parentElement.append(hint);
  let state = createWheelState(), idle, sidebarAt = -Infinity;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resetFeedback = () => {
    grid.style.transform = ''; grid.classList.remove('wheel-pulling'); hint.hidden = true;
  };
  const measure = () => {
    const available = Math.max(0, Math.min(426, innerHeight - viewport.getBoundingClientRect().top - 24));
    const style = getComputedStyle(grid);
    const row = parseFloat(style.gridAutoRows) + parseFloat(style.rowGap);
    const height = row > 0 && available >= row * 1.5
      ? Math.floor((available - row / 2) / row) * row + row / 2 : available;
    viewport.style.maxHeight = `${height}px`;
    viewport.style.height = `${height}px`;
    sidebar.style.maxHeight = `${height}px`;
  };
  window.addEventListener('resize', measure);
  const observer = new ResizeObserver(measure);
  observer.observe(container); observer.observe(document.querySelector('.search-section'));
  measure();
  const directSwitch = (direction, time) => {
    if (time - sidebarAt < WHEEL_RULES.sidebarThrottle) return;
    sidebarAt = time; resetFeedback(); state = createWheelState();
    const groups = getGroups(), index = groups.findIndex(group => group.id === getActive());
    const next = groups[index + direction];
    if (next) select(next.id, direction);
  };
  surface.addEventListener('wheel', event => {
    if (event.ctrlKey || !container.getClientRects().length) return;
    if (event.target.closest?.('input,textarea,select,[contenteditable=true],dialog,#settings-panel,#settings-backdrop,#context-menu,#engine-menu')) return;
    const inSidebar = sidebar.contains(event.target);
    const rect = container.getBoundingClientRect();
    if (!inSidebar && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < Math.max(0, rect.top) || event.clientY > viewport.getBoundingClientRect().bottom)) return;
    const time = performance.now();
    if (inSidebar || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const delta = event.shiftKey ? event.deltaY || event.deltaX : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta) { event.preventDefault(); directSwitch(Math.sign(delta), time); }
      return;
    }
    if (!event.deltaY) return;
    const groups = getGroups(), index = groups.findIndex(group => group.id === getActive());
    const top = viewport.scrollTop <= WHEEL_RULES.edgeTolerance;
    const bottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= WHEEL_RULES.edgeTolerance;
    const atEdge = event.deltaY > 0 ? bottom : top;
    // Native scrolling has priority. Only edge overscroll is intercepted.
    if (atEdge) event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? WHEEL_RULES.linePixels : event.deltaMode === 2 ? viewport.clientHeight || WHEEL_RULES.pagePixels : 1);
    // Blank space around the grid has no native scroll target; route it into the viewport.
    if (!atEdge && !viewport.contains(event.target)) {
      event.preventDefault(); viewport.scrollBy({ top: delta, behavior: 'instant' });
    }
    const result = stepGridWheel(state, { time, delta, rawDelta: event.deltaY, deltaMode: event.deltaMode, top, bottom, index, count: groups.length });
    state = result.state;
    clearTimeout(idle); idle = setTimeout(resetFeedback, WHEEL_RULES.gestureGap + 1);
    if (result.switchDirection) {
      resetFeedback(); select(groups[index + result.switchDirection].id, result.switchDirection); return;
    }
    grid.classList.toggle('wheel-pulling', Boolean(result.pull));
    grid.style.transform = result.pull && !reducedMotion() ? `translateY(${result.pull}px)` : '';
    const next = groups[index + result.hintDirection];
    hint.hidden = !result.hintDirection || !next;
    if (!hint.hidden) {
      hint.dataset.edge = result.hintDirection > 0 ? 'bottom' : 'top';
      hint.textContent = `继续滚动切换到「${next.name}」`;
    }
  }, { passive: false, capture: true });
  // Clicks, import and group edits can also replace the active view.
  const changes = new MutationObserver(() => { resetFeedback(); state = { ...state, origin: null }; measure(); });
  changes.observe(grid, { attributes: true, attributeFilter: ['data-group'] });
  const layoutChanges = new MutationObserver(measure);
  layoutChanges.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-layout'] });
}
