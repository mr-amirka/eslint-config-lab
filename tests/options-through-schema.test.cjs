'use strict';
const {
  RuleTester,
} = require('eslint');
const rule = require('../rules/options-through-schema.cjs');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const BY_HAND = [
  {
    messageId: 'byHand',
  },
];

tester.run(
  'options-through-schema', rule, {
    valid: [
      // through the schema
      "function make(options) { if (process.env.NODE_ENV !== 'production') { OPTIONS().parse(options, WHERE); } }",
      // typeof of a value that isn't an options object: data read at run time
      "function read(value) { if (typeof value.used !== 'number') { throw new TypeError('no use'); } }",
      // typeof of an option that doesn't throw: a branch of the work
      "function run(options) { if (typeof options.url === 'string') { connect(options.url); } }",
      // typeof of the object itself, not a member
      "function make(options) { if (typeof options !== 'object') { return; } }",
      // a computed name that is no options object
      "function make(list) { if (typeof list[0].x !== 'string') { throw new Error('x'); } }",
      // a member of something that isn't a name: a field kept on the instance, a call's result
      "class Client { start() { if (typeof this.options.url !== 'string') { throw new Error('url'); } } }",
      "function make() { if (typeof load().options !== 'object') { throw new Error('load'); } }",
      // another function's call
      'nearestKnown(key, known);',
    ],
    invalid: [
      {
        code: "assertKnownOptions(WHERE, options, ['a']);",
        errors: BY_HAND,
      },
      {
        code: "function make(options) { if (typeof options.url !== 'string') { throw new TypeError('url'); } }",
        errors: BY_HAND,
      },
      {
        // a nested member; a single throw, no block; another name an options object goes by
        code: "function make(config) { if (config.server === null || typeof config.server.on !== 'function') throw new TypeError('server'); }",
        errors: BY_HAND,
      },
      {
        code: "function make(opts) { if (!(typeof opts.waitMs === 'number')) { log(); throw new TypeError('waitMs'); } }",
        errors: BY_HAND,
      },
    ],
  },
);
