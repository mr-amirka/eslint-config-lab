# eslint-config-lab

[Русская версия](./README.ru.md)

The lab's lint rules in one place (LAB D-013): the parts of `coding.md`, `subscriptions.md` and `auto-polish.md` that a
linter can check, and the lab's own rules for what no ready-made plugin checks. Every project takes them instead of
copying rules.

## Install

From GitHub, at a fixed commit (LAB D-014) — the same inside the lab and in a project's CI. Needs ESLint 10 (the
lab's one version: an older ESLint doesn't know some recommended rules, and an unknown rule fails the whole config).

```json
"devDependencies": {
  "eslint-config-lab": "github:mr-amirka/eslint-config-lab#<commit>"
}
```

## Use

```js
// eslint.config.mjs
import lab from 'eslint-config-lab';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  ...lab({
    files: ['src/**/*.{ts,tsx}'],
    globals: globals.browser,
    react: true,
    hotPaths: ['src/parser/**'],
  }),
  // the project's own additions only
];
```

| Option | Default | What it does |
|--------|---------|--------------|
| `files` | `['**/*.{ts,tsx,js,mjs,cjs}']` | the files the rules apply to |
| `globals` | `{}` | the environment's globals (`globals.browser`, `globals.node`, `globals.jest`…) |
| `react` | `false` | React's hook rules, as errors |
| `hotPaths` | — | files where `coding.md` §6.2 holds strictly: a loop's variables are declared before the loop |

Tests (`tests/`, `__tests__/`, `*.test.*`, `*.spec.*`) may use timers directly and `require()` (Jest's fresh module
instance); CommonJS files may `require()`.

An unknown option or a wrong value is an error at once, with the nearest valid name ("did you mean") and the list of
valid ones (`api-input-validation.md`).

## What it checks

| Rule | Convention |
|------|------------|
| one property / argument (3+) / parameter (3+) per line; **arrays of 2+ elements — one element per line**, destructuring too | `coding.md` §6.7, LAB D-013, D-014 |
| `lab/specifier-newline` — every name in an `import` / `export … from` `{}` on its own line, a single one included (auto-fixed) | `coding.md` §6.7 |
| one statement per line | `coding.md` §6.7 |
| named exports only — no `export default`; tool configs (`*.config.*`, `.*rc.*`) are exempt | `coding.md` §6.7 |
| `if` / `else` / `for` / `while` always with a block | `coding.md` §6.8 |
| unused names are errors (`_name` — unused on purpose; props dropped with a rest are fine) | `auto-polish.md`, LAB D-012 |
| no direct `addEventListener` / `setTimeout` / `setInterval` / `requestAnimationFrame` | `subscriptions.md` §6 |
| `lab/no-length-in-loop-condition` — `.length` / `.size` in a loop's condition (allowed when the loop changes that collection) | `coding.md` §6.2 / §6.3 |
| `lab/no-repeated-comparison` — the same comparison twice in one function (allowed when what it reads changes) | `coding.md` §6.3 |
| `lab/declare-before-loop` — in `hotPaths`: a variable declared inside a loop's body | `coding.md` §6.2 |
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` — with `react: true` | — |
| ESLint's and typescript-eslint's recommended rules, with the lab's exceptions (`arguments`, `x && y()`, TS overloads, `require` in CommonJS) | `coding.md` §6.1 |

Where the rules came from: the lab's projects each had a copy; `lab/specifier-newline` and the named-exports check come
from affiliate, one statement per line and the loop declarations from minotation and trading.

## Tests

`pnpm test` — the rules with ESLint's `RuleTester`; the config in a separate Node process (Jest can't load the
ES-module plugins it requires). `pnpm lint` — the package checks itself with its own rules.
