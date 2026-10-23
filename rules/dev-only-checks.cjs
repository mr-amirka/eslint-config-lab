'use strict';
const {
  inBuildModeBranch,
} = require('./build-mode.cjs');

/** A module of option schemas: fundamentool's (`fundamentool/schema`, `../schema`) or a project's own `…/schema`. */
const SCHEMA_MODULE = /(^|\/)schema(\/index)?(\.[cm]?[jt]s)?$/;
/** A pure annotation: a call a bundler may drop when its result isn't used. */
const PURE = /[#@]__PURE__/;
const IDENTIFIER = 'Identifier';
const FUNCTIONS = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

/** Whether `node` runs when the module loads — not inside a function. */
function atModuleLoad(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (FUNCTIONS.has(parent.type)) {
      return false;
    }
  }
  return true;
}

/**
 * lab D-023 (research 13): a check of what a developer writes in code — an entry point's options, a call's arguments —
 * runs only in development; a production build drops it, its schema and the schema library. Two mistakes undo that:
 * a check outside a `NODE_ENV` branch (it runs, and keeps the schema), and a schema built when the module loads (it
 * stays even when no check uses it). A check of data that arrives at run time is meant to stay — it says so with a
 * disable comment and the reason.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Checks of options run only in development; schemas are built on first use (lab D-023)',
    },
    schema: [],
    messages: {
      unguarded: 'A check of options runs only in development: put it behind `typeof process !== \'undefined\' && '
        + 'process.env.NODE_ENV !== \'production\'` (lab D-023). A check of data that arrives at run time stays — say so: '
        + '`// eslint-disable-next-line lab/dev-only-checks -- <the data it checks>`.',
      eager: 'A schema built when the module loads stays in a production build: build it on first use — '
        + '`/*#__PURE__*/ lazy(() => …)` (lab D-023).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    /** The local names imported from a schema module. */
    const schemaNames = new Set();

    return {
      ImportDeclaration(node) {
        if (!SCHEMA_MODULE.test(node.source.value)) {
          return;
        }
        for (const specifier of node.specifiers) {
          schemaNames.add(specifier.local.name);
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        const named = callee.type === IDENTIFIER;
        // `schema.parse(value, where)` (not JSON.parse) and `assertKnownOptions(…)`: checks of options
        const isCheck = (callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'parse'
          && node.arguments.length === 2 && !(callee.object.type === IDENTIFIER && callee.object.name === 'JSON'))
          || (named && callee.name === 'assertKnownOptions');
        if (isCheck && !inBuildModeBranch(node)) {
          context.report({
            node,
            messageId: 'unguarded',
          });
          return;
        }
        // A schema built when the module loads, with no pure annotation
        if (named && schemaNames.has(callee.name) && atModuleLoad(node)) {
          const before = sourceCode.getCommentsBefore(node);
          const annotated = before.length && PURE.test(before[before.length - 1].value);
          if (!annotated) {
            context.report({
              node,
              messageId: 'eager',
            });
          }
        }
      },
    };
  },
};
