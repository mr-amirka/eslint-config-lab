'use strict';
// Runs in its own Node process (Jest can't load the ES-module plugins the config requires): lints the code given in
// argv with the lab config and prints the result as JSON. argv: code, options (JSON), filename.
const {
  Linter,
} = require('eslint');
const lab = require('../index.cjs');

const [
  code,
  optionsJson,
  filename,
] = process.argv.slice(2);
const options = optionsJson ? JSON.parse(optionsJson) : undefined;
let config;
try {
  config = lab(options);
} catch (error) {
  process.stdout.write(JSON.stringify({
    error: error.message,
  }));
  process.exit(0);
}
const linter = new Linter({
  configType: 'flat',
});
const messages = linter.verify(
  code, config, {
    filename: filename || 'file.ts',
  },
);
const [entry] = config;
process.stdout.write(JSON.stringify({
  ruleIds: messages.map((message) => message.ruleId),
  messages: messages.map((message) => message.message),
  entries: config.length,
  files: entry.files,
  globals: entry.languageOptions.globals,
  plugins: Object.keys(entry.plugins).sort(),
  labRule: entry.rules['lab/no-length-in-loop-condition'],
  reactRule: entry.rules['react-hooks/rules-of-hooks'],
  pluginRules: Object.keys(lab.plugin.rules).sort(),
  sameRules: lab.rules === entry.rules,
}));
