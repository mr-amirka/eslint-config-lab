'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

/** Lints `code` with the lab config in a separate Node process (see `lint.cjs`). */
function lint(code, options) {
  const args = [path.join(__dirname, 'lint.cjs'), code ?? ''];
  if (options) {
    args.push(JSON.stringify(options));
  }
  return JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8' }));
}

const TS = { files: ['**/*.ts'] };

describe('eslint-config-lab', () => {
  it('one flat config entry: the parser, the plugins and the rules; files and globals as given', () => {
    const result = lint(undefined, { files: ['src/**/*.ts'], globals: { window: 'readonly' } });
    expect(result.files).toEqual(['src/**/*.ts']);
    expect(result.globals).toEqual({ window: 'readonly' });
    expect(result.plugins).toEqual(['@stylistic', '@typescript-eslint', 'lab']);
    expect(result.labRule).toBe('error');
    expect(result.pluginRules).toEqual(['no-length-in-loop-condition', 'no-repeated-comparison']);
    expect(result.sameRules).toBe(true);
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
});
