'use strict';
// Runs in its own Node process (Jest can't load the ES-module plugins the config requires): lints the code given in
// argv with the lab config and prints the result as JSON.
const { Linter } = require('eslint');
const lab = require('../index.cjs');

const [code, optionsJson] = process.argv.slice(2);
const options = optionsJson ? JSON.parse(optionsJson) : undefined;
const config = lab(options);
const linter = new Linter({ configType: 'flat' });
const messages = linter.verify(code, config, { filename: 'file.ts' });
const [entry] = config;
process.stdout.write(JSON.stringify({
  ruleIds: messages.map((message) => message.ruleId),
  files: entry.files,
  globals: entry.languageOptions.globals,
  plugins: Object.keys(entry.plugins).sort(),
  labRule: entry.rules['lab/no-length-in-loop-condition'],
  pluginRules: Object.keys(lab.plugin.rules).sort(),
  sameRules: lab.rules === entry.rules,
}));
