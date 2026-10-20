'use strict';
// The lab's lint rules (LAB D-013): the parts of coding.md, subscriptions.md and auto-polish.md a linter can check,
// one copy for every project. A project spreads `lab()` into its flat config and adds only what is its own.
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const stylistic = require('@stylistic/eslint-plugin');
const js = require('@eslint/js');
const noLengthInLoopCondition = require('./rules/no-length-in-loop-condition.cjs');
const noRepeatedComparison = require('./rules/no-repeated-comparison.cjs');

/** The lab's own rules, as an ESLint plugin (`lab/…`). */
const plugin = {
  meta: {
    name: 'eslint-plugin-lab',
  },
  rules: {
    'no-length-in-loop-condition': noLengthInLoopCondition,
    'no-repeated-comparison': noRepeatedComparison,
  },
};

/** subscriptions.md §6: listeners and timers only through fundamentool's helpers. */
const SUBSCRIPTIONS = ['error',
  {
    selector: "CallExpression[callee.property.name='addEventListener']",
    message: 'Use attachEvent from fundamentool (subscriptions.md §1).',
  },
  {
    selector: "CallExpression[callee.name=/^(setTimeout|setInterval|requestAnimationFrame)$/]",
    message: 'Use createTimeout / createInterval / createAnimationFrame / nextFrame from fundamentool (subscriptions.md §2).',
  },
];

/** The rules, by convention. */
const rules = {
  ...js.configs.recommended.rules,
  ...tseslint.configs.recommended.rules,

  // TypeScript checks undefined names itself; the base rule misreads TS syntax (typescript-eslint's advice).
  'no-undef': 'off',
  // TS overloads are not redeclarations.
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'error',
  // coding.md §6.2: a placeholder value before a loop is overwritten on purpose (a stable hidden class).
  'no-useless-assignment': 'off',
  // coding.md: `x && y()` — the lab's terse conditional call.
  '@typescript-eslint/no-unused-expressions': 'off',
  // coding.md §6.1: `arguments` instead of rest parameters on hot paths.
  'prefer-rest-params': 'off',
  'prefer-spread': 'off',

  // auto-polish.md (LAB D-012): unused names fail; `_name` — unused on purpose; props dropped with a rest are fine.
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
    ignoreRestSiblings: true,
  }],

  // subscriptions.md §6.
  'no-restricted-syntax': SUBSCRIPTIONS,

  // coding.md §6.7: every element on its own line.
  '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
  '@stylistic/semi': ['error', 'always'],
  '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
  '@stylistic/object-curly-newline': ['error', {
    ObjectExpression: { minProperties: 1 },
    ObjectPattern: { minProperties: 1 },
    ImportDeclaration: { minProperties: 1 },
    ExportDeclaration: { minProperties: 1 },
  }],
  '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
  '@stylistic/function-paren-newline': ['error', { minItems: 3 }],
  // LAB D-013: arrays of two or more elements — each element on its own line, destructuring too (LAB D-014); the
  // brackets break when the elements do.
  '@stylistic/array-bracket-newline': ['error', { multiline: true }],
  '@stylistic/array-element-newline': ['error', { minItems: 2 }],
  '@stylistic/comma-dangle': ['error', 'always-multiline'],
  '@stylistic/no-trailing-spaces': 'error',

  // coding.md §6.8: if / else / for / while — always with a block.
  curly: ['error', 'all'],
  '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],

  // coding.md §6.2 / §6.3 (LAB D-013).
  'lab/no-length-in-loop-condition': 'error',
  'lab/no-repeated-comparison': 'error',
};

/**
 * The lab's config for a project's sources, ready to spread into a flat config.
 *
 * @param options.files - the files it applies to (default: TS / JS sources).
 * @param options.globals - the globals of the environment (browser, node, jest…).
 * @returns flat config entries.
 * @example
 * // eslint.config.mjs
 * import lab from 'eslint-config-lab';
 * export default [{ ignores: ['dist/**'] }, ...lab({ files: ['src/**\/*.ts'] })];
 */
function lab(options = {}) {
  const files = options.files || ['**/*.{ts,tsx,js,mjs,cjs}'];
  return [{
    files,
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: options.globals || {},
    },
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@stylistic': stylistic,
      lab: plugin,
    },
    rules,
  }];
}

lab.rules = rules;
lab.plugin = plugin;
module.exports = lab;
