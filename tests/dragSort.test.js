import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGroupDragSort } from '../js/grid/dragSort.js';

function setup() {
  const handlers = new Map(), docHandlers = new Map();
  const element = { dataset: { group: 'a' }, draggable: false, classList: { add() {}, remove() {} } };
  const container = {
    addEventListener(type, handler) { handlers.set(type, handler); },
    querySelectorAll() { return [element]; },
  };
  const originalDocument = globalThis.document;
  globalThis.document = { addEventListener(type, handler) { docHandlers.set(type, handler); } };
  const drops = [];
  bindGroupDragSort(container, (groupId, before) => drops.push([groupId, before]));
  return { handlers, docHandlers, element, drops, restore() { globalThis.document = originalDocument; } };
}
const withTarget = target => ({ preventDefault() {}, target: { closest: selector => selector === '[data-group]' ? target : null } });

test('group drag is armed only after a long press and reports the drop target', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = setup(); t.after(f.restore);
  f.handlers.get('pointerdown')({ button: 0, clientX: 10, clientY: 10, target: { closest: () => f.element } });
  assert.equal(f.element.draggable, false);
  t.mock.timers.tick(299); assert.equal(f.element.draggable, false);
  t.mock.timers.tick(1); assert.equal(f.element.draggable, true);
  const transfer = { setData(type, value) { assert.equal(type, 'application/x-easy-tab-group'); this.value = value; } };
  f.handlers.get('dragstart')({ target: { closest: () => f.element }, dataTransfer: transfer });
  assert.equal(transfer.value, 'a');
  f.handlers.get('drop')(withTarget({ dataset: { group: 'b' } }));
  assert.deepEqual(f.drops, [['a', 'b']]);
  assert.equal(f.element.draggable, true, 'dragend resets the state later');
  f.docHandlers.get('dragend')();
  assert.equal(f.element.draggable, false);
});
test('moving before the long-press threshold cancels the drag', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = setup(); t.after(f.restore);
  f.handlers.get('pointerdown')({ button: 0, clientX: 0, clientY: 0, target: { closest: () => f.element } });
  f.handlers.get('pointermove')({ clientX: 20, clientY: 0 });
  t.mock.timers.tick(300);
  assert.equal(f.element.draggable, false);
});
