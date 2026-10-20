'use strict';

/**
 * The bounds checked — an array's `length`, a Map's / Set's `size` — and what changes each: a loop that does it to its
 * collection re-reads the bound on purpose.
 */
const BOUNDS = {
  length: [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'length',
  ],
  size: [
    'add',
    'set',
    'delete',
    'clear',
  ],
};

/**
 * Whether `node` is a stable reference — a name, `this` or a chain of their properties (`list`, `this.items`,
 * `state.rows`). A call or an assignment (`(batch = await next()).length`) gives a new value on every iteration:
 * there is nothing to read once.
 */
function isReference(node) {
  if (node.type === 'Identifier' || node.type === 'ThisExpression') {
    return true;
  }
  return node.type === 'MemberExpression' && !node.computed && isReference(node.object);
}

/** The source of `node`'s object (`list` for `list.length`, `this.items` for `this.items.length`). */
function objectText(sourceCode, member) {
  return sourceCode.getText(member.object);
}

/** Whether `body` changes `name`: calls a method changing its `bound` on it, assigns it or its `length`. */
function changes(
  sourceCode, body, name, bound,
) {
  const text = sourceCode.getText(body);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mutated = new RegExp(`(^|[^\\w$.])${escaped}\\s*\\.\\s*(${BOUNDS[bound].join('|')})\\b`);
  const assigned = new RegExp(`(^|[^\\w$.])${escaped}\\s*=[^=]`);
  return mutated.test(text) || assigned.test(text);
}

/**
 * coding.md §6.2 / §6.3 (LAB D-013): a loop's bound is read once, before the loop — `.length` / `.size` in a `for` /
 * `while` / `do…while` condition is re-read on every iteration. Allowed when the loop changes that collection (a queue
 * drained with `shift`, a list filled with `push`, a set emptied with `delete`).
 *
 * @example
 * // ❌ for (let i = 0; i < list.length; i++) { … }
 * // ✅ const length = list.length; for (let i = 0; i < length; i++) { … }
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Cache the loop bound before the loop instead of reading `.length` / `.size` in the condition',
    },
    schema: [],
    messages: {
      cache: '`{{name}}.{{bound}}` is read on every iteration — read it once before the loop (coding.md §6.2/§6.3).',
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
        if (node.type === 'MemberExpression' && !node.computed && Object.hasOwn(BOUNDS, node.property.name) && isReference(node.object)) {
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
        const bound = member.property.name;
        if (!changes(
          sourceCode, loop.body, name, bound,
        ) && !(loop.update && changes(
          sourceCode, loop.update, name, bound,
        ))) {
          context.report({
            node: member,
            messageId: 'cache',
            data: {
              name,
              bound,
            },
          });
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
