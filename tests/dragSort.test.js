import test from 'node:test';
import assert from 'node:assert/strict';
import { bindGroupDragSort } from '../js/grid/dragSort.js';

function setup() {
  const handlers = new Map(), docHandlers = new Map();
  const classes = new Set();
  const element = { dataset: { group: 'a' }, draggable: true, classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); }, contains(value) { return classes.has(value); } } };
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

test('group drag starts immediately and stays available after dropping', t => {
  const f = setup(); t.after(f.restore);
  const transfer = { setData(type, value) { assert.equal(type, 'application/x-easy-tab-group'); this.value = value; } };
  f.handlers.get('dragstart')({ target: { closest: () => f.element }, dataTransfer: transfer });
  assert.equal(transfer.value, 'a');
  assert.equal(transfer.effectAllowed, 'move');
  assert.equal(f.element.classList.contains('dragging'), true);
  f.handlers.get('drop')(withTarget({ dataset: { group: 'b' } }));
  assert.deepEqual(f.drops, [['a', 'b']]);
  f.docHandlers.get('dragend')();
  assert.equal(f.element.draggable, true);
  assert.equal(f.element.classList.contains('dragging'), false);
  f.handlers.get('dragstart')({ target: { closest: () => f.element }, dataTransfer: transfer });
  f.handlers.get('drop')(withTarget(null));
  assert.deepEqual(f.drops, [['a', 'b'], ['a', null]]);
});
test('unrelated drops and drops after dragend do not reorder groups', t => {
  const f = setup(); t.after(f.restore);
  f.handlers.get('drop')(withTarget({ dataset: { group: 'b' } }));
  assert.deepEqual(f.drops, []);
  f.handlers.get('dragstart')({ target: { closest: () => f.element }, dataTransfer: { setData() {} } });
  f.docHandlers.get('dragend')();
  f.handlers.get('drop')(withTarget({ dataset: { group: 'b' } }));
  assert.deepEqual(f.drops, []);
});
