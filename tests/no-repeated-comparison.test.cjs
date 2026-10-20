'use strict';
const {
  RuleTester,
} = require('eslint');
const rule = require('../rules/no-repeated-comparison.cjs');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

tester.run(
  'no-repeated-comparison', rule, {
    valid: [
    // computed once
      'function f(entry, value) { const shown = entry === value.page; return [shown ? 1 : 0, shown ? 2 : 3]; }',
      // different comparisons
      'function f(a, b) { return [a === b, a !== b, a < b]; }',
      // the same text in two functions
      'function f(a, b) { return a === b; } function g(a, b) { return a === b; }',
      // something it reads changes in between
      'function f(list) { let i = 0; const before = i < list.length; i++; return before && i < list.length; }',
      'function f(o) { const a = o.x === 1; o.x = 2; return a && o.x === 1; }',
      'function f() { let n = read(); const a = n > 0; n = read(); return a || n > 0; }',
      // changed inside a nested closure
      'function f(state) { const a = state.n === 0; tick(() => { state.n++; }); return a && state.n === 0; }',
      // a `let` declared in a loop body is a new value each time
      'function f(list) { for (const x of list) { let v = x.v; if (v === 1) { use(); } } return list.some((y) => { let v = y.v; return v === 1; }); }',
      // `this` changes in between
      'class A { f() { const a = this.n === 1; this.n = 2; return a && this.n === 1; } }',
      // changed by a destructuring assignment
      'function f(a, b) { const x = a < b; [a, b] = [b, a]; return x && a < b; }',
      // a hole in the pattern
      'function f(a) { const x = a > 1; [, a] = pair(); return x && a > 1; }',
      'function f(o) { const x = o.k === 1; ({ k: o.k, ...o.rest } = next()); return x && o.k === 1; }',
      'function f() { let [k = 0, ...rest] = list(); const x = k === 1; return x && k === 1 && rest; }',
      // a member written through a computed key
      'function f(m, k) { const x = m.size > 0; m[k] = 1; return x && m.size > 0; }',
      // arithmetic isn't a comparison
      'function f(a, b) { return [a + b, a + b]; }',
      // top level, different
      'const a = x === 1; const b = y === 1;',
    ],
    invalid: [
      {
        code: 'function f(entry, value) { return { hidden: entry === value.page ? undefined : true, display: entry === value.page ? 1 : 0 }; }',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 'entry === value.page',
            },
          },
        ],
      },
      {
        code: 'const g = (a, b) => [a < b, a  <  b];',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 'a < b',
            },
          },
        ],
      },
      {
        code: 'if (mode === "x") { one(); } if (mode === "x") { two(); }',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 'mode === "x"',
            },
          },
        ],
      },
      {
      // `this` read twice
        code: 'class A { f() { return [this.n === 1, this.n === 1]; } }',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 'this.n === 1',
            },
          },
        ],
      },
      {
      // something else changes, not what the comparison reads
        code: 'function f(a, b) { let c = 0; const one = a === b; c++; return one && a === b && c; }',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 'a === b',
            },
          },
        ],
      },
    ],
  },
);
