'use strict';

/** Whitespace at a JSX text's start and at its end. */
const LEADING_SPACE = /^\s*/;
const TRAILING_SPACE = /\s*$/;
const LINE_BREAK = '\n';

/**
 * The lines a JSX element's children make (lab D-034 point 4), as `[start, end, spaceAtStart, spaceAtEnd]`: source
 * offsets, and whether a space the player sees touches the start or the end.
 *
 * JSX drops whitespace that holds a line break, and keeps a space on one line. So the children split where the source
 * breaks a line between them. A run that holds text (a same-line space counts) is one line: text with the expressions
 * and elements inside it, as `Показано {count} из {total}`. A run without text gives each child a line of its own.
 */
function childLines(children, text) {
  const lines = [];
  /** The current run's pieces, `[start, end]`, and whether it holds text. */
  let run = [];
  let hasText = false;
  let spaceAtStart = false;
  let spaceAtEnd = false;

  function flush() {
    if (run.length === 0) {
      return;
    }
    if (hasText) {
      lines.push([
        run[0][0],
        run[run.length - 1][1],
        spaceAtStart,
        spaceAtEnd,
      ]);
    } else {
      for (const piece of run) {
        lines.push([
          piece[0],
          piece[1],
          false,
          false,
        ]);
      }
    }
    run = [];
    hasText = false;
    spaceAtStart = false;
  }

  for (const child of children) {
    const start = child.range[0];
    const end = child.range[1];
    if (child.type !== 'JSXText') {
      run.push([
        start,
        end,
      ]);
      spaceAtEnd = false;
      continue;
    }
    const raw = text.slice(start, end);
    const leading = LEADING_SPACE.exec(raw)[0];
    if (leading.length === raw.length && raw.includes(LINE_BREAK)) {
      // whitespace with a line break: JSX drops it, the source breaks the line here
      flush();
      continue;
    }
    const breaksBefore = leading.includes(LINE_BREAK);
    const trailing = TRAILING_SPACE.exec(raw)[0];
    const breaksAfter = trailing.includes(LINE_BREAK);
    if (breaksBefore) {
      flush();
    }
    if (run.length === 0) {
      spaceAtStart = !breaksBefore && leading.length > 0;
    }
    run.push([
      breaksBefore ? start + leading.length : start,
      breaksAfter ? end - trailing.length : end,
    ]);
    hasText = true;
    spaceAtEnd = !breaksAfter && trailing.length > 0;
    if (breaksAfter) {
      flush();
    }
  }
  flush();

  return lines;
}

/**
 * coding.md §6.7 (lab D-034 points 2 and 4): every line of JSX children starts on a line of its own, and the last one
 * ends before the closing tag's line. A line of text is one child — the text, the expressions in it and the elements
 * inside it stay together:
 *
 * ```tsx
 * <p
 *   className="mt14 f14 c--ink-3"
 * >
 *   Показано {visible.length} из {items.length}
 * </p>
 * ```
 *
 * An element without attributes, written on one line with one line of children, stays as it is:
 * `<Local>{LEX_APP_TITLE}</Local>`, `<b>Показано {count}</b>`.
 *
 * Fixed automatically by inserting line breaks, which JSX drops, so the page renders the same; `@stylistic/indent` sets
 * the indent on the next `--fix` pass. Never writes `{' '}`. A space the player sees next to a tag (`<p> Hello</p>`)
 * would be dropped by a break, so that line is reported without a fix. Replaces `@stylistic/jsx-one-expression-per-line`,
 * which either splits every child (writing `{' '}` for the spaces) or leaves the text on the tag's line.
 */
module.exports = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Every line of JSX children on its own line; a line of text is one child (coding.md §6.7)',
    },
    schema: [],
    messages: {
      start: 'A child starts on the line after the opening tag or the previous child (coding.md §6.7).',
      end: 'The last child ends on the line before the closing tag (coding.md §6.7).',
      spaceAtStart: 'A child starts on the line after the opening tag (coding.md §6.7). Its text starts with a space, which a line break would drop: remove the space, or write it as {\' \'}.',
      spaceAtEnd: 'The last child ends on the line before the closing tag (coding.md §6.7). Its text ends with a space, which a line break would drop: remove the space, or write it as {\' \'}.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const text = sourceCode.text;

    function lineAt(index) {
      return sourceCode.getLocFromIndex(index).line;
    }

    function check(
      node, opening, closing,
    ) {
      const lines = childLines(node.children, text);
      const count = lines.length;
      if (count === 0) {
        return;
      }
      const bare = opening.type === 'JSXOpeningFragment' || opening.attributes.length === 0;
      if (count === 1 && bare && opening.loc.start.line === closing.loc.end.line) {
        return;
      }
      let previousLine = opening.loc.end.line;
      for (let i = 0; i < count; i++) {
        const line = lines[i];
        const start = line[0];
        if (lineAt(start) === previousLine) {
          if (line[2]) {
            context.report({
              loc: sourceCode.getLocFromIndex(start),
              messageId: 'spaceAtStart',
            });
          } else {
            context.report({
              loc: sourceCode.getLocFromIndex(start),
              messageId: 'start',
              fix: (fixer) => fixer.insertTextBeforeRange([
                start,
                start,
              ], LINE_BREAK),
            });
          }
        }
        previousLine = lineAt(line[1]);
      }
      const last = lines[count - 1];
      const end = last[1];
      if (previousLine === closing.loc.start.line) {
        if (last[3]) {
          context.report({
            loc: sourceCode.getLocFromIndex(end),
            messageId: 'spaceAtEnd',
          });
        } else {
          context.report({
            loc: sourceCode.getLocFromIndex(end),
            messageId: 'end',
            fix: (fixer) => fixer.insertTextAfterRange([
              end,
              end,
            ], LINE_BREAK),
          });
        }
      }
    }

    return {
      JSXElement(node) {
        if (node.closingElement) {
          check(
            node, node.openingElement, node.closingElement,
          );
        }
      },
      JSXFragment(node) {
        check(
          node, node.openingFragment, node.closingFragment,
        );
      },
    };
  },
};
