'use strict';
const {
  RuleTester,
} = require('eslint');
const rule = require('../rules/dev-only-checks.cjs');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const GUARD = "typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'";

tester.run(
  'dev-only-checks', rule, {
    valid: [
      // a check behind the build mode — if, ?:, &&
      `function make(o) { if (${GUARD}) { OPTIONS().parse(o, 'make'); } }`,
      'function make(o) { if (process.env.NODE_ENV !== \'production\') OPTIONS().parse(o, \'make\'); }',
      `function make(o) { ${GUARD} && OPTIONS().parse(o, 'make'); }`,
      `function make(o) { return ${GUARD} ? OPTIONS().parse(o, 'make') : o; }`,
      `function make(o) { if (${GUARD}) { assertKnownOptions(o, KEYS, 'make'); } }`,
      // not a check of options: JSON, a one-argument parse (a parser, zod's parse)
      'const value = JSON.parse(text, reviver);',
      'const rows = format.parse(text);',
      // a schema built on first use; a schema built inside a function
      "import { lazy, object, string } from 'fundamentool/schema'; const OPTIONS = /*#__PURE__*/ lazy(() => object({ name: string() }));",
      "import { object } from '../schema'; function options() { return object({}); }",
      // a call at module load of something that isn't a schema
      "import { other } from './other'; const x = other();",
    ],
    invalid: [
      {
        code: "function make(o) { OPTIONS().parse(o, 'make'); }",
        errors: [
          {
            messageId: 'unguarded',
          },
        ],
      },
      {
        code: "function make(o) { assertKnownOptions(o, KEYS, 'make'); }",
        errors: [
          {
            messageId: 'unguarded',
          },
        ],
      },
      {
        // the else branch runs in production
        code: `function make(o) { if (${GUARD}) { log(); } else { OPTIONS().parse(o, 'make'); } }`,
        errors: [
          {
            messageId: 'unguarded',
          },
        ],
      },
      {
        code: "import { object, string } from 'fundamentool/schema'; const OPTIONS = object({ name: string() });",
        errors: [
          {
            messageId: 'eager',
          },
          {
            messageId: 'eager',
          },
        ],
      },
      {
        // the annotation covers the outer call only: the inner one still runs on load
        code: "import { object, string } from './schema'; const OPTIONS = /*#__PURE__*/ object({ name: string() });",
        errors: [
          {
            messageId: 'eager',
          },
        ],
      },
      {
        code: "import { lazy, object } from '../schema'; const OPTIONS = lazy(() => object({}));",
        errors: [
          {
            messageId: 'eager',
          },
        ],
      },
    ],
  },
);
