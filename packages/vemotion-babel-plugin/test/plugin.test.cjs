'use strict';
// Babel is not a workspace dependency: the plugin's own test suite (130 tests)
// runs in scripts/emotion-conformance. These cover its helpers and options.
const test = require('node:test'), assert = require('node:assert/strict');

test('inline source maps: one mapping, in source-map\'s JSON shape', () => {
  const {getSourceMap} = require('../src/source-map.cjs');
  const state = {file: {opts: {sourceFileName: 'Button.js'}, code: 'const a = css`color:red;`'}};
  const comment = getSourceMap({line: 12, column: 4}, state);
  const [, base64] = /^\/\*# sourceMappingURL=data:application\/json;charset=utf-8;base64,(\S+) \*\/$/.exec(comment);
  assert.deepEqual(JSON.parse(Buffer.from(base64, 'base64').toString()), {version: 3, sources: ['Button.js'], names: [], mappings: 'AAWI', file: 'Button.js', sourcesContent: [state.file.code]});
  assert.equal(getSourceMap({line: 1, column: 0}, {file: {opts: {sourceFileName: 'unknown'}}}), '');
});

test('target class names: package name and path from the package root, then position', () => {
  const {getTargetClassName} = require('../src/target-class-name.cjs');
  const state = {file: {opts: {filename: __filename}, code: ''}};
  const first = getTargetClassName(state), second = getTargetClassName(state);
  assert.match(first, /^e[0-9a-z]+0$/);
  assert.equal(second, first.slice(0, -1) + '1');
  // Without a file, the code is hashed.
  assert.notEqual(getTargetClassName({file: {opts: {}, code: 'a'}}), getTargetClassName({file: {opts: {}, code: 'b'}}));
});

test('options are checked', () => {
  const plugin = require('..');
  assert.throws(() => plugin({types: {}}, {autoLabel: 'sometimes'}), /'autoLabel' option must be undefined, or one of the following: "dev-only", "never", "always"/);
  const instance = plugin({types: {}}, {});
  assert.equal(instance.name, '@emotion');
  const parserOptions = {plugins: []};
  instance.manipulateOptions({}, parserOptions);
  assert.deepEqual(parserOptions.plugins, ['jsx']);
  const typescript = {plugins: ['typescript']};
  instance.manipulateOptions({}, typescript);
  assert.deepEqual(typescript.plugins, ['typescript']);
});
