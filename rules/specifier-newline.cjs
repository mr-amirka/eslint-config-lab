'use strict';

/** The braced names of an import / export: not `default`, not `* as`. */
function bracedSpecifiers(node) {
  return node.specifiers.filter((specifier) => specifier.type === 'ImportSpecifier' || specifier.type === 'ExportSpecifier');
}

/**
 * coding.md §6.7: every name in the braces of an `import` / `export … from` on its own line, a single one included.
 * `@stylistic` has no rule for it — `object-curly-newline` breaks after `{` and before `}` only, and
 * `object-property-newline` checks object literals, not import names. Fixed automatically: the braces are rewritten
 * one name per line; `@stylistic/indent` sets the indent on the next `--fix` pass. From affiliate's `eslint-rules/`
 * (found by the owner 2026-10-04), moved to the lab (LAB D-013).
 *
 * @example
 * // ❌ import {\n  A, B,\n} from './x';
 * // ✅ import {\n  A,\n  B,\n} from './x';
 */
module.exports = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Every name in the braces of an import / export on its own line (coding.md §6.7)',
    },
    schema: [],
    messages: {
      ownLine: 'Every name in the braces of an import / export goes on its own line (coding.md §6.7).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function check(node) {
      const specifiers = bracedSpecifiers(node);
      const count = specifiers.length;
      if (!count) {
        return;
      }
      const open = sourceCode.getTokenBefore(specifiers[0], (token) => token.value === '{');
      const close = sourceCode.getTokenAfter(specifiers[count - 1], (token) => token.value === '}');
      let previousLine = open.loc.end.line;
      let bad = null;
      for (let i = 0; i < count; i++) {
        const location = specifiers[i].loc;
        if (location.start.line === previousLine) {
          bad = specifiers[i];
          break;
        }
        previousLine = location.end.line;
      }
      if (!bad) {
        return;
      }
      context.report({
        node: bad,
        messageId: 'ownLine',
        fix(fixer) {
          const body = specifiers.map((specifier) => sourceCode.getText(specifier)).join(',\n');
          return fixer.replaceTextRange([
            open.range[1],
            close.range[0],
          ], `\n${body},\n`);
        },
      });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
    };
  },
};
