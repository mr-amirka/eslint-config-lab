'use strict';
// The build mode as code reads it (lab D-023): `process.env.NODE_ENV`, which an app's bundler writes in as a literal,
// and `typeof process`, the guard for a page with no bundler. A comparison of them is a fact of the build, not a value:
// it can't be put into a variable (the bundler would no longer see it) and its strings are names, not data.

/** `process.env.NODE_ENV`. */
function isNodeEnv(node) {
  return !!node && node.type === 'MemberExpression' && !node.computed && node.property.name === 'NODE_ENV'
    && node.object.type === 'MemberExpression' && !node.object.computed && node.object.property.name === 'env'
    && node.object.object.type === 'Identifier' && node.object.object.name === 'process';
}

/** `typeof process`. */
function isTypeofProcess(node) {
  return !!node && node.type === 'UnaryExpression' && node.operator === 'typeof'
    && node.argument.type === 'Identifier' && node.argument.name === 'process';
}

/** A comparison of the build mode: `process.env.NODE_ENV !== 'production'`, `typeof process !== 'undefined'`. */
function isBuildModeComparison(node) {
  return node.type === 'BinaryExpression'
    && (isNodeEnv(node.left) || isNodeEnv(node.right) || isTypeofProcess(node.left) || isTypeofProcess(node.right));
}

/** Whether an expression reads `process.env.NODE_ENV` anywhere in it. */
function readsNodeEnv(node) {
  if (!node || typeof node.type !== 'string') {
    return false;
  }
  if (isNodeEnv(node)) {
    return true;
  }
  if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
    return readsNodeEnv(node.left) || readsNodeEnv(node.right);
  }
  if (node.type === 'UnaryExpression') {
    return readsNodeEnv(node.argument);
  }
  return false;
}

/** Whether `node` runs only in a branch whose condition reads the build mode (`if` / `?:` / `&&`). */
function inBuildModeBranch(node) {
  let child = node;
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'IfStatement' && parent.consequent === child && readsNodeEnv(parent.test)) {
      return true;
    }
    if (parent.type === 'ConditionalExpression' && parent.consequent === child && readsNodeEnv(parent.test)) {
      return true;
    }
    if (parent.type === 'LogicalExpression' && parent.operator === '&&' && parent.right === child
      && readsNodeEnv(parent.left)) {
      return true;
    }
    child = parent;
    parent = parent.parent;
  }
  return false;
}

module.exports = {
  isNodeEnv,
  isBuildModeComparison,
  inBuildModeBranch,
};
