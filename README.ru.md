# eslint-config-lab

[English version](./README.md)

Правила линтера лаборатории в одном месте (LAB D-013): то из `coding.md`, `subscriptions.md` и `auto-polish.md`, что
может проверить линтер, и два собственных правила лаборатории. Каждый проект берёт их, а не копирует правила.

```js
// eslint.config.mjs
import lab from 'eslint-config-lab';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  ...lab({ files: ['src/**/*.{ts,tsx}'], globals: globals.browser }),
  // только собственные дополнения проекта
];
```

## Что проверяет

| Правило | Конвенция |
|---------|-----------|
| по одному импорту / свойству / аргументу (3+) / параметру (3+) на строке; **массивы из 2+ элементов — по элементу на строке**, деструктуризация тоже | `coding.md` §6.7, LAB D-013, D-014 |
| `if` / `else` / `for` / `while` — всегда с блоком | `coding.md` §6.8 |
| неиспользуемые имена — ошибка (`_name` — намеренно не используется; свойства, отброшенные через rest, — норма) | `auto-polish.md`, LAB D-012 |
| никаких прямых `addEventListener` / `setTimeout` / `setInterval` / `requestAnimationFrame` | `subscriptions.md` §6 |
| `lab/no-length-in-loop-condition` — `.length` в условии цикла (можно, если цикл меняет этот массив) | `coding.md` §6.2 / §6.3 |
| `lab/no-repeated-comparison` — одно и то же сравнение дважды в одной функции (можно, если то, что оно читает, меняется) | `coding.md` §6.3 |
| рекомендованные правила ESLint и typescript-eslint с исключениями лаборатории (`arguments`, `x && y()`, перегрузки TS) | `coding.md` §6.1 |

## Тесты

`pnpm test` — оба правила через `RuleTester` ESLint; конфиг — в отдельном процессе Node (Jest не умеет загружать
ES-модульные плагины, которые он подключает).
