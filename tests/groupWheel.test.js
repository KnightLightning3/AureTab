import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGroupWheel } from '../js/ui/groupNavigation.js';
function setup(t, dimensions = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let listener, group = 'a', allowed = true;
  const moves = [];
  const viewport = {scrollTop: 0, clientHeight: 100, scrollHeight: 100, ...dimensions};
  bindGroupWheel({addEventListener(_, fn) {listener = fn;}}, {
    viewport, enabled: () => allowed, current: () => group,
    move: direction => {moves.push(direction); group = String(moves.length);}
  });
  const wheel = (deltaY = 50, extra = {}) => {
    const event = {deltaY, deltaX: 0, target: {}, preventDefault(){this.prevented = true;}, ...extra};
    listener(event); return event;
  };
  return {viewport, moves, wheel, setGroup: value => {group=value;}, disable: () => {allowed=false;}};
}
test('non-scrolling grid switches after 50ms and momentum only switches once', t => {
  const s=setup(t); assert.ok(s.wheel().prevented);
  t.mock.timers.tick(49); assert.deepEqual(s.moves, []);
  t.mock.timers.tick(1); assert.deepEqual(s.moves, [1]);
  s.wheel(); t.mock.timers.tick(50); assert.deepEqual(s.moves, [1]);
  t.mock.timers.tick(90); s.wheel(); t.mock.timers.tick(50); assert.deepEqual(s.moves,[1,1]);
});
test('native scrolling wins until the boundary; reverse direction scrolls normally', t => {
  const s=setup(t,{scrollHeight:400,scrollTop:100});
  assert.ok(!s.wheel().prevented); t.mock.timers.tick(50); assert.deepEqual(s.moves,[]);
  s.viewport.scrollTop=300; s.wheel(); t.mock.timers.tick(50); assert.deepEqual(s.moves,[1]);
  assert.ok(!s.wheel(-50).prevented); t.mock.timers.tick(50); assert.deepEqual(s.moves,[1]);
});
test('top boundary switches backward, while overlays and horizontal gestures do not', t => {
  const s=setup(t,{scrollHeight:400}); s.wheel(-50);t.mock.timers.tick(50);assert.deepEqual(s.moves,[-1]);
  s.wheel(10,{deltaX:50});t.mock.timers.tick(100);assert.deepEqual(s.moves,[-1]);
  s.disable();s.wheel(-50);t.mock.timers.tick(50);assert.deepEqual(s.moves,[-1]);
});
test('pending navigation cancels when group changes or an overlay opens',t=>{
  const s=setup(t);s.wheel();s.setGroup('other');t.mock.timers.tick(50);assert.deepEqual(s.moves,[]);
  t.mock.timers.tick(90);s.wheel();s.disable();t.mock.timers.tick(50);assert.deepEqual(s.moves,[]);
});
