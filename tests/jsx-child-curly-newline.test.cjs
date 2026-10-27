'use strict';
const {
  RuleTester,
} = require('eslint');
const rule = require('../rules/jsx-child-curly-newline.cjs');

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
  'jsx-child-curly-newline', rule, {
    valid: [
      // the sketch's form
      'const a = <div>\n  {\n    on\n      ? <A />\n      : <B />\n  }\n</div>;',
      // a single-line child is jsx-curly-newline's
      'const a = <div>\n  {title}\n</div>;',
      'const a = <>\n  {\n    list.map((x) => (\n      <A />\n    ))\n  }\n</>;',
      // an attribute's value keeps `{() => {` on one line
      'const a = <A\n  onClick={() => {\n    go();\n  }}\n/>;',
      // a comment is no expression
      'const a = <div>\n  {/* a\n     b */}\n</div>;',
      // a comment may share the brace's line; the expression starts on the next one
      'const a = <div>\n  {// why\n    on\n      ? <A />\n      : <B />\n  }\n</div>;',
    ],
    invalid: [
      {
        code: 'const a = <div>\n  {on\n    ? <A />\n    : <B />}\n</div>;',
        output: 'const a = <div>\n  {\non\n    ? <A />\n    : <B />\n}\n</div>;',
        errors: [
          {
            messageId: 'afterOpen',
          },
          {
            messageId: 'beforeClose',
          },
        ],
      },
      {
        // only the end is missing — in a fragment
        code: 'const a = <>\n  {\n    list.map((x) => (\n      <A />\n    ))}\n</>;',
        output: 'const a = <>\n  {\n    list.map((x) => (\n      <A />\n    ))\n}\n</>;',
        errors: [
          {
            messageId: 'beforeClose',
          },
        ],
      },
      {
        // the expression starts on the brace's line after a comment
        code: 'const a = <div>\n  {/* why */ on\n    ? <A />\n    : <B />\n  }\n</div>;',
        output: 'const a = <div>\n  {\n/* why */ on\n    ? <A />\n    : <B />\n  }\n</div>;',
        errors: [
          {
            messageId: 'afterOpen',
          },
        ],
      },
      {
        // only the start is missing
        code: 'const a = <div>\n  {list.map((x) => (\n      <A />\n    ))\n  }\n</div>;',
        output: 'const a = <div>\n  {\nlist.map((x) => (\n      <A />\n    ))\n  }\n</div>;',
        errors: [
          {
            messageId: 'afterOpen',
          },
        ],
      },
    ],
  },
);
