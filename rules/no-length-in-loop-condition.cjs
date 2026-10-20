'use strict';

/** Methods that change an array's length — a loop that calls them on its array re-reads `.length` on purpose. */
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'length']);

/** The source of `node`'s object (`list` for `list.length`, `this.items` for `this.items.length`). */
function objectText(sourceCode, member) {
  return sourceCode.getText(member.object);
}

/** Whether `body` changes `name`: calls a length-changing method on it, assigns it or its `length`. */
function changes(sourceCode, body, name) {
  const text = sourceCode.getText(body);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mutated = new RegExp(`(^|[^\\w$.])${escaped}\\s*\\.\\s*(${[...MUTATORS].join('|')})\\b`);
  const assigned = new RegExp(`(^|[^\\w$.])${escaped}\\s*=[^=]`);
  return mutated.test(text) || assigned.test(text);
}

/**
 * coding.md §6.2 / §6.3 (LAB D-013): a loop's bound is read once, before the loop — `.length` in a `for` / `while` /
 * `do…while` condition is re-read on every iteration. Allowed when the loop changes that array (a queue drained with
 * `shift`, a list filled with `push`).
 *
 * @example
 * // ❌ for (let i = 0; i < list.length; i++) { … }
 * // ✅ const length = list.length; for (let i = 0; i < length; i++) { … }
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Cache the loop bound before the loop instead of reading `.length` in the condition',
    },
    schema: [],
    messages: {
      cache: '`{{name}}.length` is read on every iteration — read it once before the loop (coding.md §6.2/§6.3).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function check(loop) {
      if (!loop.test) {
        return;
      }
      const found = [];
      (function walk(node) {
        if (!node || typeof node.type !== 'string') {
          return;
        }
        if (node.type === 'MemberExpression' && !node.computed && node.property.name === 'length') {
          found.push(node);
        }
        for (const key of Object.keys(node)) {
          if (key === 'parent') {
            continue;
          }
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(walk);
          } else if (child && typeof child.type === 'string') {
            walk(child);
          }
        }
      })(loop.test);
      for (const member of found) {
        const name = objectText(sourceCode, member);
        if (!changes(sourceCode, loop.body, name) && !(loop.update && changes(sourceCode, loop.update, name))) {
          context.report({ node: member, messageId: 'cache', data: { name } });
        }
      }
    }

    return {
      ForStatement: check,
      WhileStatement: check,
      DoWhileStatement: check,
    };
  },
};
