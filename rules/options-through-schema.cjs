'use strict';

/** A name an options object goes by: `options`, `opts`, `config`, `settings`. */
const OPTIONS_NAME = /^(options|opts|config|settings)$/i;
/** A helper that throws by its name: `fail(…)`, `throwBad(…)`, `raise(…)`. */
const FAILING = /^(fail|throw|raise)/i;
const IDENTIFIER = 'Identifier';
const MEMBER = 'MemberExpression';
const CHAIN = 'ChainExpression';

/** The name a member chain starts from — `options` of `options.server.on` or `options?.parse`; `undefined` — none. */
function rootName(node) {
  let at = node.type === CHAIN ? node.expression : node;
  while (at.type === MEMBER) {
    at = at.object;
  }
  return at.type === IDENTIFIER ? at.name : undefined;
}

/** Whether a node is a member of an options object: `options.url`, `opts?.parse`. */
function isOptionsMember(node) {
  return (node.type === MEMBER || (node.type === CHAIN && node.expression.type === MEMBER))
    && OPTIONS_NAME.test(rootName(node) || '');
}

/** Whether a call is `Array.isArray(…)`. */
function isArrayCheck(node) {
  return node.type === 'CallExpression' && node.callee.type === MEMBER && node.callee.object.type === IDENTIFIER
    && node.callee.object.name === 'Array' && node.callee.property.type === IDENTIFIER
    && node.callee.property.name === 'isArray';
}

/**
 * Whether an expression asks the kind of an options object's member: `typeof options.url !== 'string'`,
 * `!Array.isArray(options.ignore)`.
 */
function asksKindOfOptions(node) {
  if (!node || typeof node.type !== 'string') {
    return false;
  }
  if (node.type === 'UnaryExpression' && node.operator === 'typeof') {
    return isOptionsMember(node.argument);
  }
  if (isArrayCheck(node) && node.arguments.length === 1 && isOptionsMember(node.arguments[0])) {
    return true;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child) ? child.some(asksKindOfOptions) : child && typeof child.type === 'string'
      && asksKindOfOptions(child)) {
      return true;
    }
  }
  return false;
}

/** Whether a statement fails: a `throw`, or a call of a helper named for failing (`fail(…)`). */
function fails(statement) {
  if (statement.type === 'ThrowStatement') {
    return true;
  }
  const call = statement.type === 'ExpressionStatement' ? statement.expression : undefined;
  return call !== undefined && call.type === 'CallExpression' && call.callee.type === IDENTIFIER
    && FAILING.test(call.callee.name);
}

/** Whether a branch fails: a failing statement, or a block holding one. */
function throws(statement) {
  return fails(statement) || (statement.type === 'BlockStatement' && statement.body.some(fails));
}

/**
 * lab D-073 (`api-input-validation.md`): an options object is checked through `fundamentool/schema` — the check, the
 * type and the key list from one description. Reported: a call of `assertKnownOptions` (a key list beside the type,
 * removed from fundamentool), and an `if` that asks the kind of an options object's member (`typeof`, `?.`,
 * `Array.isArray`) and throws or calls a helper named for failing (`fail(…)`) — the shapes the hand-written checks took
 * (research 38, 39). A check of a value taken out of the options first, or under other names, is the convention's to
 * catch.
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
        if (throws(node.consequent) && asksKindOfOptions(node.test)) {
          context.report({
            node: node.test,
            messageId: 'byHand',
          });
        }
      },
    };
  },
};
