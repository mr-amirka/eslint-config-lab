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
      // the build mode is written out at each check — a variable would hide it from the bundler (lab D-023)
      "function f() { if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') a(); if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') b(); }",
      // two variables with one name, each in its own block
      'function f(kind) { switch (kind) { case 1: { const result = a(); exit(result.errors > 0); break; } case 2: { const result = b(); exit(result.errors > 0); break; } } }',
      // a parameter shadowing the outer name in a nested block of the same function
      'function f(x) { use(x > 1); { const x = other(); use(x > 1); } }',
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
      // the computed key changes in between
      'function f(s) { let i = 0; if (s[i + 1] === "/") { i += 2; } return s[i + 1] === "/"; }',
      // a member written through a computed key
      'function f(m, k) { const x = m.size > 0; m[k] = 1; return x && m.size > 0; }',
      // arithmetic isn't a comparison
      'function f(a, b) { return [a + b, a + b]; }',
      // top level, different
      'const a = x === 1; const b = y === 1;',
      // branches that exclude each other: one run computes it once
      'function f(a, b) { if (go()) { use(a < b); } else { use(a < b); } }',
      'function f(a, b) { return go() ? a < b : !(a < b); }',
      'function f(p, s) { if (up()) { if (p <= s) { return 1; } return 2; } if (down()) { if (p <= s) { return 3; } return 4; } }',
      'function f(k, x) { switch (k) { case 1: return x > 0; case 2: return x > 0 && k; default: return 0; } }',
      // once per iteration of a loop
      'function f(list, x) { for (const item of list) { if (item.on) { use(x > item.v); } } }',
    ],
    invalid: [
      {
        // the computed key doesn't change: the same read
        code: 'function f(s, i) { use(s[i + 1] === "/"); return s[i + 1] === "/"; }',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 's[i + 1] === "/"',
            },
          },
        ],
      },
      {
        // after an `if` that doesn't return, the second one runs too
        code: 'function f(p, s) { if (up()) { use(p <= s); } return p <= s; }',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 'p <= s',
            },
          },
        ],
      },
      {
        // two in one loop iteration
        code: 'function f(list, x) { for (const item of list) { use(x > 1); log(x > 1); } }',
        errors: [
          {
            messageId: 'repeated',
            data: {
              text: 'x > 1',
            },
          },
        ],
      },
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
