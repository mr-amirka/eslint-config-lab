'use strict';
const {
  inBuildModeBranch,
  isTypeofProcessCheck,
  readsNodeEnv,
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

/** A name that holds the caller's place in a message: `WHERE`, `where`, `MN_WHERE`, `WHERE_LOCALE`. */
const WHERE_NAME = /where/i;

/**
 * Whether an argument is a "where" — the text a schema's `parse(value, where)` puts before its message: a string, a
 * template, a `+` of them, or a name (or a property) holding `where`. A parser's own second argument (`parse(source,
 * file)`) is none of these, so `kind.parse(source, file)` is not read as a check of options.
 */
function isWhere(node) {
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string';
    case 'TemplateLiteral':
      return true;
    case 'BinaryExpression':
      return node.operator === '+' && (isWhere(node.left) || isWhere(node.right));
    case IDENTIFIER:
      return WHERE_NAME.test(node.name);
    case 'MemberExpression':
      return !node.computed && WHERE_NAME.test(node.property.name);
    default:
      return false;
  }
}

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
 * disable comment and the reason. The guard reads `process.env.NODE_ENV` alone (lab D-051): `typeof process` stays in a
 * development build, and in a browser it is false, so the check never ran there.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Checks of options run only in development; schemas are built on first use (lab D-023)',
    },
    fixable: 'code',
    schema: [],
    messages: {
      unguarded: 'A check of options runs only in development: put it behind `process.env.NODE_ENV !== \'production\'` '
        + '(lab D-023). A check of data that arrives at run time stays — say so: '
        + '`// eslint-disable-next-line lab/dev-only-checks -- <the data it checks>`.',
      eager: 'A schema built when the module loads stays in a production build: build it on first use — '
        + '`/*#__PURE__*/ lazy(() => …)` (lab D-023).',
      typeofGuard: 'Read `process.env.NODE_ENV` alone: a bundler leaves `typeof process` in, and in a browser it is false, '
        + 'so the check never runs there, not even in development (lab D-051).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    /** The local names imported from a schema module. */
    const schemaNames = new Set();

    return {
      // `typeof process !== 'undefined' && process.env.NODE_ENV …` → `process.env.NODE_ENV …`
      LogicalExpression(node) {
        if (node.operator === '&&' && isTypeofProcessCheck(node.left) && readsNodeEnv(node.right)) {
          context.report({
            node: node.left,
            messageId: 'typeofGuard',
            fix: (fixer) => fixer.replaceText(node, sourceCode.getText(node.right)),
          });
        }
      },
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
        // `schema.parse(value, where)` (not JSON.parse; its second argument a "where")
        const isCheck = (callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'parse'
          && node.arguments.length === 2 && isWhere(node.arguments[1])
          && !(callee.object.type === IDENTIFIER && callee.object.name === 'JSON'));
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
