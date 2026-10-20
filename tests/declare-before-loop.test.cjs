'use strict';
const {
  RuleTester,
} = require('eslint');
const rule = require('../rules/declare-before-loop.cjs');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

tester.run(
  'declare-before-loop', rule, {
    valid: [
      'let item; for (let i = 0; i < length; i++) { item = list[i]; use(item); }',
      // the loop's own head isn't its body
      'for (const item of list) { use(item); }',
      'for (let i = 0; i < length; i++) { use(i); }',
      // a callback's body is a function, not a loop body
      'for (const list of lists) { list.forEach((item) => { const x = item * 2; use(x); }); }',
      // a nested block inside the body isn't the body itself
      'while (more()) { if (ready()) { const x = next(); use(x); } }',
      // outside loops
      'function f() { const x = 1; return x; }',
    ],
    invalid: [
      {
        code: 'for (let i = 0; i < length; i++) { const item = list[i]; use(item); }',
        errors: [
          {
            messageId: 'before',
          },
        ],
      },
      {
        code: 'while (more()) { let x = next(); use(x); }',
        errors: [
          {
            messageId: 'before',
          },
        ],
      },
      {
        code: 'do { var x = next(); use(x); } while (x);',
        errors: [
          {
            messageId: 'before',
          },
        ],
      },
      {
        code: 'for (const key in map) { const value = map[key]; use(value); }',
        errors: [
          {
            messageId: 'before',
          },
        ],
      },
      {
        code: 'for (const item of list) { const a = item.a; const b = item.b; use(a, b); }',
        errors: [
          {
            messageId: 'before',
          },
          {
            messageId: 'before',
          },
        ],
      },
    ],
  },
);
