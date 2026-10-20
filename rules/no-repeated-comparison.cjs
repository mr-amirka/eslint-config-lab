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
    // A computed key is read too: `source[i + 1]` depends on `i`.
    return node.computed ? roots(node.property, roots(node.object, out)) : roots(node.object, out);
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
 * coding.md §6.3 (LAB D-013): the same comparison computed twice in one run of a function (`entry === value.page` for
 * two attributes) is computed once, into a variable. Not reported when something it reads is reassigned in the
 * function — then the two may differ — nor when one run can't reach both: branches that exclude each other (`if` /
 * `else`, a branch that returns) compute it once, and hoisting it would add work on a hot path.
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
    /** The code path segments being walked, per code path (functions nest). */
    const segmentStack = [];
    /** The loops' way back: segment → the segment at a loop's start it returns to (one per segment). */
    const loopsBack = new WeakMap();
    /** The segments each comparison runs in. */
    const segmentsOf = new WeakMap();

    function segmentStarted(segment) {
      segmentStack[segmentStack.length - 1].add(segment);
    }

    function segmentEnded(segment) {
      segmentStack[segmentStack.length - 1].delete(segment);
    }

    function loopBack(from, to) {
      loopsBack.set(from, to);
    }

    /**
     * Whether one run can compute `second` after `first`: they share a segment, or a segment of `second` follows one of
     * `first` going forward (a loop's way back to its start isn't followed — each iteration computes it anew).
     */
    function bothRun(first, second) {
      const targets = new Set(segmentsOf.get(second));
      const queue = [...segmentsOf.get(first)];
      const visited = new Set(queue);
      while (queue.length) {
        const segment = queue.shift();
        if (targets.has(segment)) {
          return true;
        }
        const back = loopsBack.get(segment);
        for (const next of segment.nextSegments) {
          if (!visited.has(next) && next !== back) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
      return false;
    }

    /** A number per variable: two `const result` in two blocks are two variables with one name. */
    const variableIds = new WeakMap();
    let nextVariableId = 0;

    /** What `name` means at `node`: its variable, or the global it names. */
    function meaning(node, name) {
      if (name === 'this') {
        return name;
      }
      for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(name);
        if (variable) {
          if (!variableIds.has(variable)) {
            variableIds.set(variable, ++nextVariableId);
          }
          return `#${variableIds.get(variable)}`;
        }
      }
      return `global:${name}`;
    }

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
        if ([...names].some((name) => scope.changed.has(name)) || !bothRun(first, node)) {
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
      onCodePathStart() {
        segmentStack.push(new Set());
      },
      onCodePathEnd() {
        segmentStack.pop();
      },
      onCodePathSegmentStart: segmentStarted,
      onCodePathSegmentEnd: segmentEnded,
      onUnreachableCodePathSegmentStart: segmentStarted,
      onUnreachableCodePathSegmentEnd: segmentEnded,
      onCodePathSegmentLoop: loopBack,
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
        segmentsOf.set(node, [...segmentStack[segmentStack.length - 1]]);
        // The same text over the same variables — not just the same spelling.
        const names = [...roots(node, new Set())].map((name) => meaning(node, name));
        const text = `${sourceCode.getText(node).replace(/\s+/g, ' ')} ${names.join(',')}`;
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
