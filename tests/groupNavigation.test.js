import test from 'node:test';
import assert from 'node:assert/strict';
import { createWheelState, stepGridWheel, WHEEL_RULES, bindGroupWheel } from '../js/ui/groupNavigation.js';

function gesture(defaults = {}) {
  let state = createWheelState();
  return (time, delta, overrides = {}) => {
    const result = stepGridWheel(state, { time, delta, rawDelta: delta, deltaMode: 0,
      top: true, bottom: true, index: 1, count: 3, ...defaults, ...overrides });
    state = result.state; return result;
  };
}
test('trackpad gesture starting at edge switches after 120 accumulated pixels', () => {
  const step = gesture();
  for (const time of [0, 40, 80]) {
    const r = step(time, 30); assert.equal(r.switchDirection, 0);
    assert.ok(r.pull > 0 && r.pull <= 24); assert.equal(r.hintDirection, 1);
  }
  assert.equal(step(120, 30).switchDirection, 1);
});
test('a gesture reaching an edge midway never counts the remaining inertia', () => {
  const step = gesture({ top: false, bottom: false });
  assert.equal(step(0, 30).pull, 0);
  for (let time = 40; time <= 400; time += 40) {
    const r = step(time, 30, { bottom: true });
    assert.equal(r.switchDirection, 0); assert.equal(r.pull, 0);
  }
  for (const time of [560, 600, 640]) assert.equal(step(time, 30, { bottom: true }).switchDirection, 0);
  assert.equal(step(680, 30, { bottom: true }).switchDirection, 1);
});
test('one mouse detent does not switch, two within 400ms do, even across gesture gaps', () => {
  const step = gesture();
  assert.equal(step(0, 100).switchDirection, 0);
  assert.equal(step(300, 100).switchDirection, 1);
  const expired = gesture();
  assert.equal(expired(0, 100).switchDirection, 0);
  assert.equal(expired(401, 100).switchDirection, 0);
  assert.equal(expired(600, 100).switchDirection, 1);
});
test('line-mode wheel detents use the same two-step threshold', () => {
  const step = gesture();
  assert.equal(step(0, 16, { rawDelta: 1, deltaMode: 1 }).switchDirection, 0);
  assert.equal(step(100, 16, { rawDelta: 1, deltaMode: 1 }).switchDirection, 1);
});
test('events during 500ms cooldown are ignored, then re-arm without a further idle gap', () => {
  const step = gesture(); step(0, 100); assert.equal(step(50, 100).switchDirection, 1);
  for (let time = 100; time <= 500; time += 100) {
    const r = step(time, 100); assert.equal(r.switchDirection, 0); assert.equal(r.pull, 0);
  }
  assert.equal(step(600, 100).switchDirection, 0);
  assert.equal(step(700, 100).switchDirection, 1);
});
test('first group upwards and last group downwards bounce without hint or wrapping', () => {
  for (const [index, delta] of [[0, -30], [2, 30]]) {
    const step = gesture({ index });
    for (const time of [0, 30, 60, 90, 120, 150]) {
      const r = step(time, delta);
      assert.equal(r.switchDirection, 0); assert.equal(r.hintDirection, 0); assert.ok(Math.abs(r.pull) <= 24);
    }
  }
});
test('scrolling backwards requires the edge for that direction at gesture origin', () => {
  const step = gesture({ top: false, bottom: true });
  step(0, 30);
  for (const time of [30, 60, 90, 120]) assert.equal(step(time, -30, { top: true }).switchDirection, 0);
  const up = gesture({ top: true, bottom: false });
  for (const time of [0, 30, 60]) up(time, -30);
  assert.equal(up(90, -30).switchDirection, -1);
});
test('the new-gesture gap is strictly greater than 150ms', () => {
  const step = gesture({ bottom: false }); step(0, 30);
  assert.equal(step(150, 30, { bottom: true }).pull, 0);
  assert.ok(step(301, 30, { bottom: true }).pull > 0);
  assert.equal(WHEEL_RULES.trackpadThreshold, 120);
});

// Exercise the DOM adapter without a browser: native scrolling, exceptions and feedback.
function adapter(t, reducedMotion = false) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originals = new Map();
  const setGlobal = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };
  t.after(() => { for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  } });
  let listener, now = 0, active = 'b';
  const switches = [], hints = [], scrolls = [];
  const hint = { hidden: true, dataset: {} };
  const grid = { style: {}, classList: { remove() {}, toggle() {} } };
  const viewport = {
    style: {}, scrollTop: 0, scrollHeight: 1000, clientHeight: 300,
    getBoundingClientRect: () => ({ top: 300, bottom: 600 }),
    parentElement: { append(value) { hints.push(value); } },
    contains: target => target.area === 'grid',
    scrollBy: value => scrolls.push(value)
  };
  const sidebar = { style: {}, contains: target => target.area === 'sidebar' };
  const doc = { addEventListener(type, callback, options) {
    assert.equal(type, 'wheel'); assert.equal(options.passive, false); listener = callback;
  }, createElement: () => hint, querySelector: () => ({}) };
  const container = {
    ownerDocument: doc, getClientRects: () => [{}],
    getBoundingClientRect: () => ({ left: 0, right: 800, top: 300 }),
    querySelector: selector => ({ '.grid-viewport': viewport, '#grid': grid, '#sidebar': sidebar })[selector]
  };
  setGlobal('document', doc); setGlobal('window', { addEventListener() {} });
  setGlobal('innerHeight', 900); setGlobal('getComputedStyle', () => ({ gridAutoRows: '90px', rowGap: '6px' }));
  setGlobal('matchMedia', () => ({ matches: reducedMotion }));
  setGlobal('ResizeObserver', class { observe() {} });
  setGlobal('MutationObserver', class { observe() {} });
  t.mock.method(performance, 'now', () => now);
  const groups = [{ id: 'a', name: '甲' }, { id: 'b', name: '乙' }, { id: 'c', name: '丙' }];
  bindGroupWheel(container, () => groups, () => active, (id, direction) => { active = id; switches.push([id, direction]); });
  return { viewport, grid, hint, switches, scrolls, wheel(time, deltaY, options = {}) {
    now = time; let prevented = false;
    const area = options.area ?? 'grid';
    listener({ deltaY, deltaX: 0, deltaMode: 0, clientX: 400, clientY: 500,
      target: { area, closest: () => Boolean(options.blocked) },
      preventDefault() { prevented = true; }, ...options });
    return prevented;
  } };
}
test('DOM adapter preserves native grid scroll and ignores inertia reaching the bottom', t => {
  const f = adapter(t);
  assert.equal(f.wheel(0, 100), false);
  f.viewport.scrollTop = 700;
  assert.equal(f.wheel(50, 100), true);
  assert.equal(f.wheel(100, 100), true);
  assert.deepEqual(f.switches, []);
  f.wheel(300, 100); assert.equal(f.hint.textContent, '继续滚动切换到「丙」');
  f.wheel(350, 100); assert.deepEqual(f.switches, [['c', 1]]);
});
test('DOM adapter routes blank-space scrolling into the grid and exempts overlays/zoom', t => {
  const f = adapter(t);
  assert.equal(f.wheel(0, 30, { area: 'blank' }), true);
  assert.equal(f.scrolls[0].top, 30);
  assert.equal(f.wheel(40, 30, { ctrlKey: true }), false);
  assert.equal(f.wheel(80, 30, { blocked: true }), false);
});
test('sidebar, horizontal and Shift shortcuts use 150ms throttle without wrapping', t => {
  const f = adapter(t);
  f.wheel(0, 1, { area: 'sidebar' });
  f.wheel(50, -1, { area: 'sidebar' });
  assert.deepEqual(f.switches, [['c', 1]]);
  f.wheel(150, 0, { deltaX: -10 });
  f.wheel(300, -10, { shiftKey: true });
  f.wheel(450, -10, { area: 'sidebar' });
  assert.deepEqual(f.switches, [['c', 1], ['b', -1], ['a', -1]]);
});
test('uncommitted edge feedback rebounds after gesture idle', t => {
  const f = adapter(t); f.viewport.scrollTop = 700;
  f.wheel(0, 30);
  assert.equal(f.hint.hidden, false); assert.match(f.grid.style.transform, /translateY/);
  t.mock.timers.tick(151);
  assert.equal(f.hint.hidden, true); assert.equal(f.grid.style.transform, '');
});

test('a single mouse detent plus its small inertial tail cannot satisfy trackpad threshold', () => {
  const step = gesture(); assert.equal(step(0, 100).switchDirection, 0);
  for (let time = 20; time <= 300; time += 20) assert.equal(step(time, 20).switchDirection, 0);
  assert.equal(step(350, 100).switchDirection, 1);
});

test('reduced motion keeps the edge hint but disables rubber-band displacement', t => {
  const f = adapter(t, true); f.viewport.scrollTop = 700;
  f.wheel(0, 30);
  assert.equal(f.hint.hidden, false); assert.equal(f.grid.style.transform, '');
});
