# eslint-config-lab

[English version](./README.md)

Правила линтера лаборатории в одном месте (LAB D-013): то из `coding.md`, `subscriptions.md` и `auto-polish.md`, что
может проверить линтер, и собственные правила лаборатории для того, что не проверяет ни один готовый плагин. Каждый
проект берёт их, а не копирует правила.

## Установка

С GitHub, на зафиксированном коммите (LAB D-014) — одинаково внутри лаборатории и в CI проекта. Нужен ESLint 10
(одна версия на всю лабораторию: старый ESLint не знает части рекомендованных правил, а неизвестное правило роняет
весь конфиг).

```json
"devDependencies": {
  "eslint-config-lab": "github:mr-amirka/eslint-config-lab#<commit>"
}
```

## Использование

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
  // только собственные дополнения проекта
];
```

| Опция | По умолчанию | Что делает |
|-------|--------------|------------|
| `files` | `['**/*.{ts,tsx,js,mjs,cjs}']` | файлы, к которым применяются правила |
| `globals` | `{}` | глобальные имена окружения (`globals.browser`, `globals.node`, `globals.jest`…) |
| `react` | `false` | правила хуков React — как ошибки |
| `hotPaths` | — | файлы, где `coding.md` §6.2 действует строго: переменные цикла объявляются до цикла |

Неизвестная опция или неверное значение — сразу ошибка, с ближайшим верным именем («did you mean») и списком верных
(`api-input-validation.md`).

## Что проверяет

| Правило | Конвенция |
|---------|-----------|
| по одному свойству / аргументу (3+) / параметру (3+) на строке; **массивы из 2+ элементов — по элементу на строке**, деструктуризация тоже | `coding.md` §6.7, LAB D-013, D-014 |
| `lab/specifier-newline` — каждое имя в `{}` у `import` / `export … from` на своей строке, даже одно (исправляется автоматически) | `coding.md` §6.7 |
| одна инструкция на строке | `coding.md` §6.7 |
| только именованный экспорт — без `export default`; конфиги инструментов (`*.config.*`, `.*rc.*`) — исключение | `coding.md` §6.7 |
| `if` / `else` / `for` / `while` — всегда с блоком | `coding.md` §6.8 |
| неиспользуемые имена — ошибка (`_name` — намеренно не используется; свойства, отброшенные через rest, — норма) | `auto-polish.md`, LAB D-012 |
| никаких прямых `addEventListener` / `setTimeout` / `setInterval` / `requestAnimationFrame` | `subscriptions.md` §6 |
| `lab/no-length-in-loop-condition` — `.length` / `.size` в условии цикла (можно, если цикл меняет эту коллекцию) | `coding.md` §6.2 / §6.3 |
| `lab/no-repeated-comparison` — одно и то же сравнение дважды в одной функции (можно, если то, что оно читает, меняется) | `coding.md` §6.3 |
| `lab/declare-before-loop` — в `hotPaths`: переменная, объявленная внутри тела цикла | `coding.md` §6.2 |
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` — при `react: true` | — |
| рекомендованные правила ESLint и typescript-eslint с исключениями лаборатории (`arguments`, `x && y()`, перегрузки TS, `require` в CommonJS) | `coding.md` §6.1 |

Откуда правила: у каждого проекта лаборатории была своя копия; `lab/specifier-newline` и проверка именованного экспорта —
из affiliate, одна инструкция на строке и объявления в цикле — из minotation и trading.

## Тесты

`pnpm test` — правила через `RuleTester` ESLint; конфиг — в отдельном процессе Node (Jest не умеет загружать
ES-модульные плагины, которые он подключает). `pnpm lint` — пакет проверяет себя собственными правилами.
