'use strict';
const { RuleTester } = require('eslint');
const rule = require('../rules/no-length-in-loop-condition.cjs');

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

tester.run('no-length-in-loop-condition', rule, {
  valid: [
    // the bound read once, before the loop
    'const length = list.length; for (let i = 0; i < length; i++) { use(list[i]); }',
    // a queue drained in the loop: its length changes on purpose
    'while (queue.length) { handle(queue.shift()); }',
    'while (todo.length > 0) { todo.pop(); }',
    // a list filled in the loop
    'for (let i = 0; i < out.length; i++) { if (more()) { out.push(next()); } }',
    // the array reassigned in the loop
    'let list = first(); for (let i = 0; i < list.length; i++) { list = grow(list); }',
    // its length set in the loop
    'while (items.length > 3) { items.length = 3; }',
    // changed by the update clause
    'for (let i = 0; i < stack.length; stack.pop()) { visit(stack); }',
    // a for without a condition
    'for (;;) { if (done()) { break; } }',
    // a computed `[length]` member isn't the property
    'for (let i = 0; i < map[length]; i++) { use(i); }',
  ],
  invalid: [
    {
      code: 'for (let i = 0; i < list.length; i++) { use(list[i]); }',
      errors: [{ messageId: 'cache', data: { name: 'list' } }],
    },
    {
      code: 'let i = 0; while (i < this.items.length) { use(this.items[i]); i++; }',
      errors: [{ messageId: 'cache', data: { name: 'this.items' } }],
    },
    {
      code: 'let i = 0; do { i++; } while (i < rows.length && i < cols.length);',
      errors: [
        { messageId: 'cache', data: { name: 'rows' } },
        { messageId: 'cache', data: { name: 'cols' } },
      ],
    },
    {
      // pushing to another array doesn't excuse this one
      code: 'for (let i = 0; i < src.length; i++) { dst.push(src[i]); }',
      errors: [{ messageId: 'cache', data: { name: 'src' } }],
    },
  ],
});
