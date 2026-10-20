'use strict';
// The lab's lint rules (LAB D-013): the parts of coding.md, subscriptions.md and auto-polish.md a linter can check,
// one copy for every project. A project spreads `lab()` into its flat config and adds only what is its own.
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const stylistic = require('@stylistic/eslint-plugin');
const js = require('@eslint/js');
const declareBeforeLoop = require('./rules/declare-before-loop.cjs');
const noLengthInLoopCondition = require('./rules/no-length-in-loop-condition.cjs');
const noRepeatedComparison = require('./rules/no-repeated-comparison.cjs');
const specifierNewline = require('./rules/specifier-newline.cjs');

const WHERE = 'eslint-config-lab';

/** The lab's own rules, as an ESLint plugin (`lab/…`). */
const plugin = {
  meta: {
    name: 'eslint-plugin-lab',
  },
  rules: {
    'declare-before-loop': declareBeforeLoop,
    'no-length-in-loop-condition': noLengthInLoopCondition,
    'no-repeated-comparison': noRepeatedComparison,
    'specifier-newline': specifierNewline,
  },
};

/** subscriptions.md §6: listeners and timers only through fundamentool's helpers. */
const SUBSCRIPTIONS = [
  'error',
  {
    selector: "CallExpression[callee.property.name='addEventListener']",
    message: 'Use attachEvent from fundamentool (subscriptions.md §1).',
  },
  {
    selector: 'CallExpression[callee.name=/^(setTimeout|setInterval|requestAnimationFrame)$/]',
    message: 'Use createTimeout / createInterval / createAnimationFrame / nextFrame from fundamentool (subscriptions.md §2).',
  },
];

/** Files a tool requires a default export from (coding.md §6.7: the exception for tool configs). */
const CONFIG_FILES = [
  '**/*.config.{js,cjs,mjs,ts,cts,mts}',
  '**/.*rc.{js,cjs,mjs}',
];

/** CommonJS modules. */
const COMMONJS_FILES = ['**/*.{cjs,cts}'];

/**
 * The rules, by convention. ESLint's recommended set is `@eslint/js` 10's — the lab runs ESLint 10 everywhere
 * (`peerDependencies`): an older ESLint doesn't know some of its rules, and an unknown rule fails the whole config.
 */
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
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],

  // subscriptions.md §6.
  'no-restricted-syntax': SUBSCRIPTIONS,

  // coding.md §6.7: named exports only — `export default` lets one module be imported under any name. Tool configs
  // (`CONFIG_FILES`) are exempt.
  'no-restricted-exports': [
    'error',
    {
      restrictDefaultExports: {
        direct: true,
        named: true,
        defaultFrom: true,
        namedFrom: true,
        namespaceFrom: true,
      },
    },
  ],

  // coding.md §6.7: every element on its own line; one statement per line.
  '@stylistic/indent': [
    'error',
    2,
    {
      SwitchCase: 1,
    },
  ],
  '@stylistic/semi': [
    'error',
    'always',
  ],
  '@stylistic/quotes': [
    'error',
    'single',
    {
      avoidEscape: true,
    },
  ],
  '@stylistic/object-curly-newline': [
    'error',
    {
      ObjectExpression: {
        minProperties: 1,
      },
      ObjectPattern: {
        minProperties: 1,
      },
      ImportDeclaration: {
        minProperties: 1,
      },
      ExportDeclaration: {
        minProperties: 1,
      },
    },
  ],
  '@stylistic/object-property-newline': [
    'error',
    {
      allowAllPropertiesOnSameLine: false,
    },
  ],
  'lab/specifier-newline': 'error',
  '@stylistic/function-paren-newline': [
    'error',
    {
      minItems: 3,
    },
  ],
  // LAB D-013: arrays of two or more elements — each element on its own line, destructuring too (LAB D-014); the
  // brackets break when the elements do.
  '@stylistic/array-bracket-newline': [
    'error',
    {
      multiline: true,
    },
  ],
  '@stylistic/array-element-newline': [
    'error',
    {
      minItems: 2,
    },
  ],
  '@stylistic/comma-dangle': [
    'error',
    'always-multiline',
  ],
  '@stylistic/no-trailing-spaces': 'error',
  '@stylistic/max-statements-per-line': [
    'error',
    {
      max: 1,
    },
  ],

  // coding.md §6.8: if / else / for / while — always with a block.
  curly: [
    'error',
    'all',
  ],
  '@stylistic/brace-style': [
    'error',
    '1tbs',
    {
      allowSingleLine: false,
    },
  ],

  // coding.md §6.2 / §6.3 (LAB D-013).
  'lab/no-length-in-loop-condition': 'error',
  'lab/no-repeated-comparison': 'error',
};

/** React's hook rules (`react: true`): a class of mistakes neither tsc nor a build catches. Errors, not warnings (LAB D-012). */
const REACT_RULES = {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
};

/** What `lab()` accepts and what each option must be. */
const OPTIONS = {
  files: 'an array of glob strings',
  globals: 'an object of globals (e.g. from the `globals` package)',
  hotPaths: 'an array of glob strings',
  react: 'a boolean',
};
const OPTION_KEYS = Object.keys(OPTIONS);

/** Edit distance between two words, case aside — for "did you mean". */
function distance(a, b) {
  const aLength = a.length;
  const bLength = b.length;
  let previous = Array.from({
    length: bLength + 1,
  }, (_, j) => j);
  let current;
  for (let i = 1; i <= aLength; i++) {
    current = [i];
    for (let j = 1; j <= bLength; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[bLength];
}

/** What a wrong value looks like in an error. */
function describe(value) {
  if (Array.isArray(value)) {
    return 'an array';
  }
  return value === null ? 'null' : `${typeof value} ${JSON.stringify(value)}`;
}

const isGlobs = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string');

/** Checks `lab()`'s options (api-input-validation.md): an unknown key or a wrong value is an error. */
function assertOptions(options) {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError(`${WHERE}: expects an options object, got ${describe(options)}`);
  }
  for (const key of Object.keys(options)) {
    if (!Object.hasOwn(OPTIONS, key)) {
      const nearest = OPTION_KEYS.reduce((best, valid) => (distance(key, valid) < distance(key, best) ? valid : best));
      throw new TypeError(`${WHERE}: unknown option "${key}" — did you mean "${nearest}"? Valid options: ${OPTION_KEYS.join(', ')}`);
    }
  }
  const {
    files,
    globals,
    hotPaths,
    react,
  } = options;
  const wrong = (key, value) => new TypeError(`${WHERE}: "${key}" expects ${OPTIONS[key]}, got ${describe(value)}`);
  if (files !== undefined && !isGlobs(files)) {
    throw wrong('files', files);
  }
  if (hotPaths !== undefined && !isGlobs(hotPaths)) {
    throw wrong('hotPaths', hotPaths);
  }
  if (globals !== undefined && (typeof globals !== 'object' || globals === null || Array.isArray(globals))) {
    throw wrong('globals', globals);
  }
  if (react !== undefined && typeof react !== 'boolean') {
    throw wrong('react', react);
  }
}

/**
 * The lab's config for a project's sources, ready to spread into a flat config.
 *
 * @param options.files - the files it applies to (default: TS / JS sources).
 * @param options.globals - the globals of the environment (browser, node, jest…).
 * @param options.hotPaths - files where coding.md §6.2 holds strictly: a loop's variables declared before the loop.
 * @param options.react - React's hook rules (the plugin comes with this package).
 * @returns flat config entries.
 * @example
 * // eslint.config.mjs
 * import lab from 'eslint-config-lab';
 * export default [{ ignores: ['dist/**'] }, ...lab({ files: ['src/**\/*.ts'], hotPaths: ['src/parser/**'] })];
 */
function lab(options = {}) {
  assertOptions(options);
  const files = options.files || ['**/*.{ts,tsx,js,mjs,cjs}'];
  const plugins = {
    '@typescript-eslint': tseslint,
    '@stylistic': stylistic,
    lab: plugin,
  };
  let entryRules = rules;
  if (options.react) {
    plugins['react-hooks'] = require('eslint-plugin-react-hooks');
    entryRules = {
      ...rules,
      ...REACT_RULES,
    };
  }
  const config = [
    {
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
      plugins,
      rules: entryRules,
    },
    {
      files: CONFIG_FILES,
      rules: {
        'no-restricted-exports': 'off',
      },
    },
    {
      // CommonJS: `require` is how a module imports there.
      files: COMMONJS_FILES,
      plugins: {
        '@typescript-eslint': tseslint,
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ];
  if (options.hotPaths) {
    config.push({
      files: options.hotPaths,
      plugins: {
        lab: plugin,
      },
      rules: {
        'lab/declare-before-loop': 'error',
      },
    });
  }
  return config;
}

lab.rules = rules;
lab.plugin = plugin;
module.exports = lab;
