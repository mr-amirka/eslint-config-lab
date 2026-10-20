'use strict';

/** The comparisons a function shouldn't write twice. */
const OPERATORS = new Set([
  '===',
  '!==',
  '==',
  '!=',
  '<',
  '>',
  '<=',
  '>=',
]);

/** The names a comparison reads — the roots of its identifiers and member chains (`value.page` → `value`). */
function roots(node, out) {
  if (!node || typeof node.type !== 'string') {
    return out;
  }
  if (node.type === 'Identifier') {
    out.add(node.name);
    return out;
  }
  if (node.type === 'MemberExpression') {
    return roots(node.object, out);
  }
  if (node.type === 'ThisExpression') {
    out.add('this');
    return out;
  }
  for (const key of Object.keys(node)) {
    if (key === 'parent') {
      continue;
    }
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((item) => roots(item, out));
    } else if (child && typeof child.type === 'string') {
      roots(child, out);
    }
  }
  return out;
}

/**
 * The names an assignment / update changes: `a.b = …` → `a`, `this.n = …` → `this`, `i++` → `i`, `[a, { b }] = …` →
 * `a`, `b`.
 */
function changedNames(node, out) {
  if (!node) {
    return out;
  }
  switch (node.type) {
    case 'Identifier':
      out.push(node.name);
      break;
    case 'ThisExpression':
      out.push('this');
      break;
    case 'MemberExpression':
      changedNames(node.object, out);
      break;
    case 'ArrayPattern':
      node.elements.forEach((element) => changedNames(element, out));
      break;
    case 'ObjectPattern':
      node.properties.forEach((property) => changedNames(property.type === 'RestElement' ? property.argument : property.value, out));
      break;
    case 'AssignmentPattern':
      changedNames(node.left, out);
      break;
    case 'RestElement':
      changedNames(node.argument, out);
      break;
  }
  return out;
}

/**
 * coding.md §6.3 (LAB D-013): the same comparison written twice in one function (`entry === value.page` for two
 * attributes) is computed once, into a variable. Not reported when something it reads is reassigned in the function —
 * then the two may differ.
 *
 * @example
 * // ❌ { hidden: entry === value.page ? … , display: entry === value.page ? … }
 * // ✅ const shown = entry === value.page;
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Compute a comparison used twice in one function once, into a variable',
    },
    schema: [],
    messages: {
      repeated: '`{{text}}` is already computed above in this function — put it into a variable (coding.md §6.3).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    /** Per function being walked: the comparisons seen and the names it changes. */
    const stack = [];

    function enter() {
      stack.push({
        seen: new Map(),
        repeats: [],
        changed: new Set(),
      });
    }

    function leave() {
      const scope = stack.pop();
      for (const [
        node,
        first,
      ] of scope.repeats) {
        const names = roots(node, new Set());
        if ([...names].some((name) => scope.changed.has(name))) {
          continue;
        }
        context.report({
          node,
          messageId: 'repeated',
          data: {
            text: sourceCode.getText(first),
          },
        });
      }
    }

    function changed(node) {
      // A change counts for the function it's in and every function around it (a closure may change the outer name).
      for (const name of changedNames(node, [])) {
        stack.forEach((scope) => scope.changed.add(name));
      }
    }

    return {
      'Program': enter,
      'Program:exit': leave,
      'FunctionDeclaration': enter,
      'FunctionDeclaration:exit': leave,
      'FunctionExpression': enter,
      'FunctionExpression:exit': leave,
      'ArrowFunctionExpression': enter,
      'ArrowFunctionExpression:exit': leave,
      BinaryExpression(node) {
        if (!OPERATORS.has(node.operator) || !stack.length) {
          return;
        }
        const scope = stack[stack.length - 1];
        const text = sourceCode.getText(node).replace(/\s+/g, ' ');
        const first = scope.seen.get(text);
        if (first) {
          scope.repeats.push([
            node,
            first,
          ]);
        } else {
          scope.seen.set(text, node);
        }
      },
      AssignmentExpression(node) {
        changed(node.left);
      },
      UpdateExpression(node) {
        changed(node.argument);
      },
      VariableDeclarator(node) {
        // `let x = …` inside a loop body re-creates `x` on every iteration.
        if (node.parent.kind !== 'const') {
          changed(node.id);
        }
      },
    };
  },
};
