module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.cjs'],
  // index.cjs is checked in its own Node process (tests/lint.cjs) — Jest can't load the ES-module plugins it requires.
  collectCoverageFrom: ['rules/**/*.cjs'],
  coverageThreshold: {
    global: {
      branches: 99,
      functions: 99,
      lines: 99,
      statements: 99,
    },
  },
};
