# eslint-config-lab

[Русская версия](./README.ru.md)

The lab's lint rules in one place (LAB D-013): the parts of `coding.md`, `subscriptions.md` and `auto-polish.md` that a
linter can check, and two rules of the lab's own. Every project takes them instead of copying rules.

```js
// eslint.config.mjs
import lab from 'eslint-config-lab';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  ...lab({ files: ['src/**/*.{ts,tsx}'], globals: globals.browser }),
  // the project's own additions only
];
```

## What it checks

| Rule | Convention |
|------|------------|
| one import / property / argument (3+) / parameter (3+) per line; **arrays of 2+ elements — one element per line**, destructuring too | `coding.md` §6.7, LAB D-013, D-014 |
| `if` / `else` / `for` / `while` always with a block | `coding.md` §6.8 |
| unused names are errors (`_name` — unused on purpose; props dropped with a rest are fine) | `auto-polish.md`, LAB D-012 |
| no direct `addEventListener` / `setTimeout` / `setInterval` / `requestAnimationFrame` | `subscriptions.md` §6 |
| `lab/no-length-in-loop-condition` — `.length` in a loop's condition (allowed when the loop changes that array) | `coding.md` §6.2 / §6.3 |
| `lab/no-repeated-comparison` — the same comparison twice in one function (allowed when what it reads changes) | `coding.md` §6.3 |
| ESLint's and typescript-eslint's recommended rules, with the lab's exceptions (`arguments`, `x && y()`, TS overloads) | `coding.md` §6.1 |

## Tests

`pnpm test` — the two rules with ESLint's `RuleTester`; the config in a separate Node process (Jest can't load the
ES-module plugins it requires).
