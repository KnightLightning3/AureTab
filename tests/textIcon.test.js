import test from 'node:test';
import assert from 'node:assert/strict';
import { displayIconText } from '../js/grid/textIcon.js';
test('compact sizes display three graphemes while horizontal tiles retain full text', () => {
  for (const size of ['1x1','1x2','2x2']) assert.equal(displayIconText('简约标签页', size), '简约标');
  assert.equal(displayIconText('DeepSeek 长文字', '2x1'), 'DeepSeek 长文字');
  assert.equal(displayIconText('👨‍👩‍👧‍👦🇨🇳é第四'), '👨‍👩‍👧‍👦🇨🇳é');
});
