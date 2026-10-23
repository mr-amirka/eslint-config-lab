'use strict';
const {
  RuleTester,
} = require('eslint');
const tsParser = require('@typescript-eslint/parser');
const rule = require('../rules/no-repeated-string.cjs');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

tester.run(
  'no-repeated-string', rule, {
    valid: [
      // twice is fine
      "use('url'); use('url');",
      // a constant used three times
      "const URL_PART = 'url'; use(URL_PART); use(URL_PART); use(URL_PART);",
      // module names
      "import a from 'x'; import b from 'x'; export { c } from 'x';",
      "const a = require('x'); const b = require('x'); const c = require('x');",
      "await import('x'); await import('x'); await import('x');",
      "export * from 'x'; export * from 'y'; export * from 'x'; export * from 'x';",
      // keys
      "const o = { 'a': 1 }; const p = { 'a': 2 }; const q = { 'a': 3 };",
      "o['a'] = 1; p['a'] = 2; q['a'] = 3;",
      // the build mode, written out at each check (lab D-023)
      "if (process.env.NODE_ENV !== 'production') a(); if (process.env.NODE_ENV !== 'production') b(); if ('production' !== process.env.NODE_ENV) c();",
      // typeof results
      "if (typeof a === 'string' || typeof b === 'string' || 'string' === typeof c) {}",
      // JSX attributes (classes — coding.md §17.6)
      'const v = <div><a className="dF" /><b className="dF" /><i className="dF" /></div>;',
      // directives, empty strings, tagged templates
      "'use strict'; use(''); use(''); use('');",
      'css`a`; css`a`; css`a`;',
      // a template with expressions is not a constant
      'use(`a${b}`); use(`a${b}`); use(`a${b}`);',
      {
        code: "use('a'); use('a'); use('a');",
        options: [
          {
            threshold: 4,
          },
        ],
      },
    ],
    invalid: [
      {
        code: "use('url'); use('url'); use('url'); use('url');",
        errors: [
          {
            messageId: 'repeated',
            data: {
              value: '"url"',
              count: '4',
            },
            column: 29, // the third one
          },
        ],
      },
      {
        // backticks without expressions are the same string
        code: "use('page'); use(`page`); use('page');",
        errors: [
          {
            messageId: 'repeated',
          },
        ],
      },
      {
        // a member's value (not its key) counts
        code: "const a = { kind: 'page' }; const b = { kind: 'page' }; if (x === 'page') {}",
        errors: [
          {
            messageId: 'repeated',
          },
        ],
      },
      {
        code: "use('a'); use('a');",
        options: [
          {
            threshold: 2,
          },
        ],
        errors: [
          {
            messageId: 'repeated',
          },
        ],
      },
    ],
  },
);

const tsTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
  },
});

tsTester.run(
  'no-repeated-string (TypeScript)', rule, {
    valid: [
      // literal types are types, not values
      "type K = 'page' | 'window'; type L = 'page'; type M = { kind: 'page' };",
      "interface I { 'page': number; } import x = require('page'); type T = import('page').X; declare module 'page' {}",
    ],
    invalid: [],
  },
);
