'use strict';

/** The loops whose body is checked. */
const LOOPS = new Set([
  'ForStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForOfStatement',
  'ForInStatement',
]);

/**
 * coding.md §6.2, on hot paths only (`lab({ hotPaths })`): a variable assigned on every iteration is declared once,
 * before the loop — not re-created in the loop's body. A callback's body (`list.forEach((item) => { const x … })`) is
 * a function, not a loop body, and isn't checked. From minotation's config (`no-restricted-syntax`), moved to the lab
 * (LAB D-013).
 *
 * @example
 * // ❌ for (let i = 0; i < length; i++) { const item = list[i]; use(item); }
 * // ✅ let item; for (let i = 0; i < length; i++) { item = list[i]; use(item); }
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'On hot paths, declare a loop\'s variables once before the loop (coding.md §6.2)',
    },
    schema: [],
    messages: {
      before: 'A variable assigned on every iteration is declared once, before the loop (coding.md §6.2).',
    },
  },
  create(context) {
    return {
      VariableDeclaration(node) {
        const block = node.parent;
        if (block.type === 'BlockStatement' && LOOPS.has(block.parent.type) && block.parent.body === block) {
          context.report({
            node,
            messageId: 'before',
          });
        }
      },
    };
  },
};
