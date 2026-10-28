'use strict';
const {
  execFileSync,
} = require('child_process');
const path = require('path');

/** Lints `code` with the lab config in a separate Node process (see `lint.cjs`); with `fix`, `output` is the fixed code. */
function lint(
  code, options, filename, fix,
) {
  const args = [
    path.join(__dirname, 'lint.cjs'),
    code ?? '',
    options ? JSON.stringify(options) : '',
  ];
  if (filename || fix) {
    args.push(filename || '');
  }
  if (fix) {
    args.push('fix');
  }
  return JSON.parse(execFileSync(
    process.execPath, args, {
      encoding: 'utf8',
    },
  ));
}

const TS = {
  files: ['**/*.ts'],
};

describe('eslint-config-lab', () => {
  it('one entry with the parser, the plugins and the rules; files and globals as given', () => {
    const result = lint(undefined, {
      files: ['src/**/*.ts'],
      globals: {
        window: 'readonly',
      },
    });
    expect(result.files).toEqual(['src/**/*.ts']);
    expect(result.globals).toEqual({
      window: 'readonly',
    });
    expect(result.plugins).toEqual([
      '@stylistic',
      '@typescript-eslint',
      'lab',
    ]);
    expect(result.labRule).toBe('error');
    expect(result.pluginRules).toEqual([
      'declare-before-loop',
      'dev-only-checks',
      'jsx-child-curly-newline',
      'jsx-child-newline',
      'no-length-in-loop-condition',
      'no-repeated-comparison',
      'no-repeated-string',
      'specifier-newline',
    ]);
    expect(result.sameRules).toBe(true);
    // the main entry + the tool configs' exemption + tests + CommonJS
    expect(result.entries).toBe(4);
  });

  it('defaults: TS / JS sources, no globals', () => {
    const result = lint();
    expect(result.files).toEqual(['**/*.{ts,tsx,js,mjs,cjs}']);
    expect(result.globals).toEqual({});
  });

  it('arrays and destructuring of two elements are split; of one element stay on one line (LAB D-013, D-014)', () => {
    expect(lint('const pair = [a, b];\n', TS).ruleIds).toContain('@stylistic/array-element-newline');
    expect(lint('const pair = [\n  a,\n  b,\n];\n', TS).ruleIds).not.toContain('@stylistic/array-bracket-newline');
    expect(lint('const [a, b] = pair;\n', TS).ruleIds).toContain('@stylistic/array-element-newline');
    expect(lint('const [\n  a,\n  b,\n] = pair;\nuse(a, b);\n', TS).ruleIds).toEqual([]);
    expect(lint('const [a] = list;\nuse(a);\n', TS).ruleIds).toEqual([]);
  });

  it('a direct timer is refused (subscriptions.md §6); the lab rules run', () => {
    expect(lint('setTimeout(run, 10);\n', TS).ruleIds).toContain('no-restricted-syntax');
    expect(lint('for (let i = 0; i < list.length; i++) {\n  use(i);\n}\n', TS).ruleIds).toContain('lab/no-length-in-loop-condition');
  });

  it('import names one per line; one statement per line (coding.md §6.7)', () => {
    expect(lint('import {\n  a, b,\n} from \'./x\';\nuse(a, b);\n', TS).ruleIds).toContain('lab/specifier-newline');
    expect(lint('use(1); use(2);\n', TS).ruleIds).toContain('@stylistic/max-statements-per-line');
  });

  it('JSX: every attribute and child on its own line; a multi-line child\'s braces too (coding.md §6.7, LAB D-034)', () => {
    const TSX = {
      files: ['**/*.tsx'],
    };
    const lintTsx = (code) => lint(
      code, TSX, 'a.tsx',
    ).ruleIds;
    // the owner's sketch: one attribute per line, a single one included; the child on its own line
    expect(lintTsx('export const a = (\n  <h1\n    className="f32"\n  >\n    {LEX_APP_TITLE()}\n  </h1>\n);\n')).toEqual([]);
    // an element without attributes keeps its one short child
    expect(lintTsx('export const a = <Local>{LEX_APP_TITLE}</Local>;\n')).toEqual([]);
    // an element with an attribute doesn't keep its child on the tag's line
    expect(lintTsx('export const a = <h1 className="f32">{title}</h1>;\n')).toEqual([
      '@stylistic/jsx-first-prop-new-line',
      'lab/jsx-child-newline',
      'lab/jsx-child-newline',
    ]);
    expect(lintTsx('export const a = (\n  <h1\n    className="f32">{title}</h1>\n);\n')).toEqual([
      '@stylistic/jsx-closing-bracket-location',
      'lab/jsx-child-newline',
      'lab/jsx-child-newline',
    ]);
    expect(lintTsx('export const a = (\n  <A\n    b={1} c={2}\n  />\n);\n')).toContain('@stylistic/jsx-max-props-per-line');
    expect(lintTsx('export const a = (\n  <div>\n    {on\n      ? a\n      : b}\n  </div>\n);\n')).toEqual([
      'lab/jsx-child-curly-newline',
      'lab/jsx-child-curly-newline',
    ]);
    expect(lintTsx('export const a = (\n  <div>\n    {\n      title\n    }\n  </div>\n);\n')).toEqual([
      '@stylistic/jsx-curly-newline',
      '@stylistic/jsx-curly-newline',
    ]);
  });

  it('JSX: a line of text is one child, and `--fix` writes the owner\'s form (LAB D-034 point 4)', () => {
    const TSX = {
      files: ['**/*.tsx'],
    };
    const fix = (code) => lint(
      code, TSX, 'a.tsx', true,
    ).output;
    expect(fix('export const a = (\n  <p className="mt14 f14 c--ink-3">Показано {visible.length} из {items.length}</p>\n);\n')).toBe('export const a = (\n  <p\n    className="mt14 f14 c--ink-3"\n  >\n    Показано {visible.length} из {items.length}\n  </p>\n);\n');
    // children without text between them are lines of their own; an element inside the text stays in its line
    expect(fix('export const a = (\n  <div>\n    <A /><B />\n    Нажмите <b>Далее</b>, чтобы продолжить\n  </div>\n);\n')).toBe('export const a = (\n  <div>\n    <A />\n    <B />\n    Нажмите <b>Далее</b>, чтобы продолжить\n  </div>\n);\n');
    // nothing to fix: `{' '}` is never written
    expect(fix('export const a = <b>Показано {count}</b>;\n')).toBe('export const a = <b>Показано {count}</b>;\n');
  });

  it('named exports only; a tool config may export a default (coding.md §6.7)', () => {
    const code = 'const config = {\n  a: 1,\n};\nexport default config;\n';
    expect(lint(
      code, TS, 'src/page.ts',
    ).ruleIds).toContain('no-restricted-exports');
    expect(lint(
      code, TS, 'vite.config.ts',
    ).ruleIds).toEqual([]);
    expect(lint(
      code, undefined, 'eslint.config.mjs',
    ).ruleIds).toEqual([]);
    expect(lint(
      code, TS, 'src/theme.mn.ts',
    ).ruleIds).toEqual([]);
  });

  it('react: true — the hook rules, as errors', () => {
    const result = lint('function useX(on) {\n  if (on) {\n    useState(0);\n  }\n}\nuse(useX);\n', {
      files: ['**/*.ts'],
      react: true,
    });
    expect(result.plugins).toContain('react-hooks');
    expect(result.reactRule).toBe('error');
    expect(result.ruleIds).toContain('react-hooks/rules-of-hooks');
    expect(lint(undefined, TS).plugins).not.toContain('react-hooks');
  });

  it('hotPaths — a loop\'s variables declared before the loop, only there (coding.md §6.2)', () => {
    const code = 'for (const item of list) {\n  const x = item;\n  use(x);\n}\n';
    const options = {
      files: ['**/*.ts'],
      hotPaths: ['src/parser/**'],
    };
    expect(lint(
      code, options, 'src/parser/scan.ts',
    ).ruleIds).toContain('lab/declare-before-loop');
    expect(lint(
      code, options, 'src/app/page.ts',
    ).ruleIds).toEqual([]);
    expect(lint(undefined, options).entries).toBe(5);
  });

  it('a string value 3+ times in a module: an error in code, not in tests (lab D-017.3)', () => {
    const code = 'use(\'xy\');\nuse(\'xy\');\nuse(\'xy\');\n';
    expect(lint(
      code, TS, 'src/a.ts',
    ).ruleIds).toEqual(['lab/no-repeated-string']);
    expect(lint(
      code, TS, 'tests/a.test.ts',
    ).ruleIds).toEqual([]);
  });

  it('tests may use timers and require', () => {
    const code = 'const x = require(\'x\');\nsetTimeout(x, 1);\n';
    expect(lint(
      code, TS, 'tests/a.test.ts',
    ).ruleIds).toEqual([]);
    expect(lint(
      code, TS, 'src/__tests__/a.ts',
    ).ruleIds).toEqual([]);
    expect(lint(
      code, TS, 'src/a.ts',
    ).ruleIds).toEqual([
      '@typescript-eslint/no-require-imports',
      'no-restricted-syntax',
    ]);
  });

  it('CommonJS may require; an ES module may not', () => {
    const code = 'const x = require(\'x\');\nuse(x);\n';
    const options = {
      files: ['**/*.{ts,cjs}'],
    };
    expect(lint(
      code, options, 'tool.cjs',
    ).ruleIds).toEqual([]);
    expect(lint(
      code, options, 'page.ts',
    ).ruleIds).toContain('@typescript-eslint/no-require-imports');
  });

  it.each([
    [
      {
        hotpath: ['x'],
      },
      'eslint-config-lab: unknown option "hotpath" — did you mean "hotPaths"? Valid options: files, globals, hotPaths, react',
    ],
    [
      {
        file: ['x'],
      },
      'eslint-config-lab: unknown option "file" — did you mean "files"? Valid options: files, globals, hotPaths, react',
    ],
    [
      {
        files: 'src/**',
      },
      'eslint-config-lab: "files" expects an array of glob strings, got string "src/**"',
    ],
    [
      {
        files: [],
      },
      'eslint-config-lab: "files" expects an array of glob strings, got an array',
    ],
    [
      {
        hotPaths: [1],
      },
      'eslint-config-lab: "hotPaths" expects an array of glob strings, got an array',
    ],
    [
      {
        globals: null,
      },
      'eslint-config-lab: "globals" expects an object of globals (e.g. from the `globals` package), got null',
    ],
    [
      {
        globals: ['window'],
      },
      'eslint-config-lab: "globals" expects an object of globals (e.g. from the `globals` package), got an array',
    ],
    [
      {
        react: 'yes',
      },
      'eslint-config-lab: "react" expects a boolean, got string "yes"',
    ],
    [
      ['src'],
      'eslint-config-lab: expects an options object, got an array',
    ],
  ])('options are checked: %j', (options, message) => {
    expect(lint(undefined, options).error).toBe(message);
  });

  it('a non-object options value is refused', () => {
    expect(lint(undefined, 5).error).toBe('eslint-config-lab: expects an options object, got number 5');
  });
});
