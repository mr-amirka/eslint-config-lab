'use strict';
const {
  RuleTester,
} = require('eslint');
const rule = require('../rules/specifier-newline.cjs');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

tester.run(
  'specifier-newline', rule, {
    valid: [
      'import {\n  a,\n  b,\n} from "./x";',
      'import {\n  a,\n} from "./x";',
      // a default and a namespace aren't braced
      'import x from "./x";',
      'import * as x from "./x";',
      'import x, {\n  y,\n} from "./x";',
      // an export of a declaration has no braces
      'export const a = 1;',
      'export {\n  a,\n  b,\n} from "./x";',
      'const a = 1;\nexport {\n  a,\n};',
      // a multi-line name ends where the next one starts on a new line
      'import {\n  a as\n  b,\n  c,\n} from "./x";',
    ],
    invalid: [
      {
        code: 'import { a } from "./x";',
        output: 'import {\na,\n} from "./x";',
        errors: [
          {
            messageId: 'ownLine',
          },
        ],
      },
      {
      // the braces break, the names don't — the case @stylistic misses
        code: 'import {\n  a, b,\n} from "./x";',
        output: 'import {\na,\nb,\n} from "./x";',
        errors: [
          {
            messageId: 'ownLine',
          },
        ],
      },
      {
        code: 'export { a, b } from "./x";',
        output: 'export {\na,\nb,\n} from "./x";',
        errors: [
          {
            messageId: 'ownLine',
          },
        ],
      },
      {
        code: 'import x, { y } from "./x";',
        output: 'import x, {\ny,\n} from "./x";',
        errors: [
          {
            messageId: 'ownLine',
          },
        ],
      },
    ],
  },
);
