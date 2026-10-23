'use strict';
const {
  isNodeEnv,
} = require('./build-mode.cjs');

/** How many times a string may appear in a module before it must be a constant (coding.md §1; lab D-017). */
const DEFAULT_THRESHOLD = 3;

/** The parent node types whose string is a name, not a value: module names, keys, types, JSX attributes. */
const NOT_VALUES = new Set([
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportAllDeclaration',
  'ImportExpression',
  'TSLiteralType',
  'TSExternalModuleReference',
  'TSImportType',
  'TSModuleDeclaration',
  'JSXAttribute',
]);

/** Whether a string literal is a value of the code — not a name the language or a tool reads. */
function isValue(node) {
  const parent = node.parent;
  if (!parent || NOT_VALUES.has(parent.type) || parent.type === 'ExpressionStatement' && parent.directive) {
    return false;
  }
  // `{ 'key': value }`, `obj['key']` — a name of a property
  if ((parent.type === 'Property' || parent.type === 'PropertyDefinition' || parent.type === 'TSPropertySignature') && parent.key === node) {
    return false;
  }
  if (parent.type === 'MemberExpression' && parent.property === node) {
    return false;
  }
  // `require('x')`
  if (parent.type === 'CallExpression' && parent.callee.type === 'Identifier' && parent.callee.name === 'require') {
    return false;
  }
  // `typeof x === 'string'` — the language's names of types
  if (parent.type === 'BinaryExpression') {
    const other = parent.left === node ? parent.right : parent.left;
    if (other.type === 'UnaryExpression' && other.operator === 'typeof') {
      return false;
    }
    // `process.env.NODE_ENV !== 'production'` — a build mode, written out at each check (lab D-023)
    if (isNodeEnv(other)) {
      return false;
    }
  }
  return true;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'A string value repeated in a module is a constant (coding.md §1, §18.4; lab D-017)',
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: {
            type: 'integer',
            minimum: 2,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      repeated: 'The string {{value}} appears {{count}} times in this module — make it a constant (coding.md §1).',
    },
  },
  create(context) {
    const threshold = (context.options[0] && context.options[0].threshold) || DEFAULT_THRESHOLD;
    /** Every string value → the literals that hold it, in source order. */
    const seen = new Map();

    function note(node, value) {
      if (value === '' || !isValue(node)) {
        return;
      }
      const list = seen.get(value);
      if (list) {
        list.push(node);
      } else {
        seen.set(value, [node]);
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          note(node, node.value);
        }
      },
      TemplateLiteral(node) {
        // A template without expressions is a plain string written with backticks.
        if (node.expressions.length === 0 && node.parent.type !== 'TaggedTemplateExpression') {
          note(node, node.quasis[0].value.cooked);
        }
      },
      'Program:exit'() {
        for (const [
          value,
          nodes,
        ] of seen) {
          if (nodes.length >= threshold) {
            // Reported once, where the threshold is reached.
            context.report({
              node: nodes[threshold - 1],
              messageId: 'repeated',
              data: {
                value: JSON.stringify(value),
                count: String(nodes.length),
              },
            });
          }
        }
      },
    };
  },
};
