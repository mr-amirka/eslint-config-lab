'use strict';
const {
  RuleTester,
} = require('eslint');
const rule = require('../rules/jsx-child-newline.cjs');

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

const START = {
  messageId: 'start',
};
const END = {
  messageId: 'end',
};

tester.run(
  'jsx-child-newline', rule, {
    valid: [
      // the owner's form (lab D-034 point 4): a line of text is one child
      'const a = <p\n  className="x"\n>\n  Показано {visible.length} из {items.length}\n</p>;',
      // without attributes, on one line, one line of children
      'const a = <Local>{LEX_APP_TITLE}</Local>;',
      'const a = <b>Показано {count}</b>;',
      'const a = <>{count} {unit}</>;',
      // every child on its own line
      'const a = <div>\n  <A />\n  {b}\n  text\n</div>;',
      // text wrapped over lines, an element inside the text, expressions joined by a space
      'const a = <p>\n  Some long text that\n  wraps {x}\n</p>;',
      'const a = <p>\n  Нажмите <b>Далее</b>, чтобы продолжить\n</p>;',
      'const a = <p>\n  {count} {unit}\n</p>;',
      // an element and the text after it on separate lines
      'const a = <div>\n  <h1>Title</h1>\n  Some text {x}\n</div>;',
      // a multi-line expression on its own lines
      'const a = <div>\n  {\n    on\n      ? <A />\n      : <B />\n  }\n</div>;',
      // no children
      'const a = <div></div>;',
      'const a = <div />;',
      'const a = <div>\n</div>;',
    ],
    invalid: [
      {
        // the owner's example with its tag already broken: the text line moves off both tags
        code: 'const a = <p\n  className="x"\n>Показано {a} из {b}</p>;',
        output: 'const a = <p\n  className="x"\n>\nПоказано {a} из {b}\n</p>;',
        errors: [
          START,
          END,
        ],
      },
      {
        // an element with an attribute doesn't keep its child on the tag's line
        code: 'const a = <h1 className="f32">{title}</h1>;',
        output: 'const a = <h1 className="f32">\n{title}\n</h1>;',
        errors: [
          START,
          END,
        ],
      },
      {
        // two children without text between them are two lines — in an element and in a fragment
        code: 'const a = <div><A /><B /></div>;',
        output: 'const a = <div>\n<A />\n<B />\n</div>;',
        errors: [
          START,
          START,
          END,
        ],
      },
      {
        code: 'const a = <>\n  {a}{b}\n</>;',
        output: 'const a = <>\n  {a}\n{b}\n</>;',
        errors: [START],
      },
      {
        // a multi-line child of an element without attributes
        code: 'const a = <b>{list.map((x) => (\n  <i />\n))}</b>;',
        output: 'const a = <b>\n{list.map((x) => (\n  <i />\n))}\n</b>;',
        errors: [
          START,
          END,
        ],
      },
      {
        code: 'const a = <div>\n  text</div>;',
        output: 'const a = <div>\n  text\n</div>;',
        errors: [END],
      },
      {
        // a space next to a tag would be dropped by a line break: reported, not fixed
        code: 'const a = <p\n  className="x"\n> Hello</p>;',
        output: 'const a = <p\n  className="x"\n> Hello\n</p>;',
        errors: [
          {
            messageId: 'spaceAtStart',
          },
          END,
        ],
      },
      {
        code: 'const a = <p\n  className="x"\n>\n  Hello </p>;',
        output: null,
        errors: [
          {
            messageId: 'spaceAtEnd',
          },
        ],
      },
      {
        // a lone space as the only child
        code: 'const a = <i\n  className="x"\n> </i>;',
        output: null,
        errors: [
          {
            messageId: 'spaceAtStart',
          },
          {
            messageId: 'spaceAtEnd',
          },
        ],
      },
    ],
  },
);
