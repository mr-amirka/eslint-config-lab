'use strict';

/** The parents whose `{ … }` is a child, not an attribute's value. */
const CHILD_OF = new Set([
  'JSXElement',
  'JSXFragment',
]);

/**
 * coding.md §6.7 (LAB D-034): a multi-line expression among JSX children opens and closes its braces on their own
 * lines. `@stylistic/jsx-curly-newline` can't say it — its `multiline: 'require'` holds for attributes too, where
 * `onClick={() => {` stays on one line. Fixed automatically: a line break goes after `{` and before `}`;
 * `@stylistic/indent` sets the indent on the next `--fix` pass. A comment may share the brace's line; the expression
 * itself may not. A single-line child is `@stylistic/jsx-curly-newline`'s (`singleline: 'forbid'`).
 *
 * @example
 * // ❌ {onRetry\n  ? <PartFailed … />\n  : <ProgressBar … />}
 * // ✅ {\n  onRetry\n    ? <PartFailed … />\n    : <ProgressBar … />\n}
 */
module.exports = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'A multi-line JSX child expression has its braces on their own lines (coding.md §6.7)',
    },
    schema: [],
    messages: {
      afterOpen: 'A multi-line child expression starts on the line after `{` (coding.md §6.7).',
      beforeClose: 'A multi-line child expression ends on the line before `}` (coding.md §6.7).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      JSXExpressionContainer(node) {
        const expression = node.expression;
        if (!CHILD_OF.has(node.parent.type) || expression.type === 'JSXEmptyExpression') {
          return;
        }
        if (expression.loc.start.line === expression.loc.end.line) {
          return;
        }
        const open = sourceCode.getFirstToken(node);
        const close = sourceCode.getLastToken(node);
        if (sourceCode.getTokenAfter(open).loc.start.line === open.loc.end.line) {
          context.report({
            node: open,
            messageId: 'afterOpen',
            fix: (fixer) => fixer.insertTextAfter(open, '\n'),
          });
        }
        if (sourceCode.getTokenBefore(close).loc.end.line === close.loc.start.line) {
          context.report({
            node: close,
            messageId: 'beforeClose',
            fix: (fixer) => fixer.insertTextBefore(close, '\n'),
          });
        }
      },
    };
  },
};
