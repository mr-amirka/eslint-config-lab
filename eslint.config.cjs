// The package checks itself with its own rules.
const lab = require('./index.cjs');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
    ],
  },
  ...lab({
    files: ['**/*.cjs'],
  }),
];
