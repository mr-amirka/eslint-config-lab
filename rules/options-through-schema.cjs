'use strict';

/** A name an options object goes by: `options`, `opts`, `config`, `settings`. */
const OPTIONS_NAME = /^(options|opts|config|settings)$/i;
const IDENTIFIER = 'Identifier';
const MEMBER = 'MemberExpression';

/** The name a member chain starts from — `options` of `options.server.on`; `undefined` — none. */
function rootName(node) {
  let at = node;
  while (at.type === MEMBER) {
    at = at.object;
  }
  return at.type === IDENTIFIER ? at.name : undefined;
}

/** Whether an expression asks `typeof` of an options object's member (`typeof options.url !== 'string'`). */
function asksTypeofOfOptions(node) {
  if (!node || typeof node.type !== 'string') {
    return false;
  }
  if (node.type === 'UnaryExpression' && node.operator === 'typeof') {
    return node.argument.type === MEMBER && OPTIONS_NAME.test(rootName(node.argument) || '');
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child) ? child.some(asksTypeofOfOptions) : child && typeof child.type === 'string'
      && asksTypeofOfOptions(child)) {
      return true;
    }
  }
  return false;
}

/** Whether a statement throws: a `throw`, or a block holding one. */
function throws(statement) {
  return statement.type === 'ThrowStatement'
    || (statement.type === 'BlockStatement' && statement.body.some((inner) => inner.type === 'ThrowStatement'));
}

/**
 * lab D-073 (`api-input-validation.md`): an options object is checked through `fundamentool/schema` — the check, the
 * type and the key list from one description. Reported: a call of `assertKnownOptions` (a key list beside the type,
 * removed from fundamentool), and an `if` that asks `typeof` of an options object's member and throws — the two shapes
 * every hand-written check took (research 38). A check written under other names is the convention's to catch.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Options are checked through fundamentool/schema, never by hand (lab D-073)',
    },
    schema: [],
    messages: {
      byHand: 'Check options through fundamentool/schema — `object({ … }).parse(options, where)`: the check, the type and '
        + 'the key list from one description (api-input-validation.md, lab D-073).',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type === IDENTIFIER && node.callee.name === 'assertKnownOptions') {
          context.report({
            node,
            messageId: 'byHand',
          });
        }
      },
      IfStatement(node) {
        if (throws(node.consequent) && asksTypeofOfOptions(node.test)) {
          context.report({
            node: node.test,
            messageId: 'byHand',
          });
        }
      },
    };
  },
};
