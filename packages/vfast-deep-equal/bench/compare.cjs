'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const original = require('../../../scripts/deep-equal-conformance/node_modules/fast-deep-equal');
const originalES6 = require('../../../scripts/deep-equal-conformance/node_modules/fast-deep-equal/es6');
const originalReact = require('../../../scripts/deep-equal-conformance/node_modules/fast-deep-equal/react');
const vpm = {equal: require('..'), es6: require('../es6'), react: require('../react')};
const upstream = {equal: original, es6: originalES6, react: originalReact};
const compare = (name, a, b, expected, kind = 'equal') => ({name, make: lib => () => lib[kind](a, b), validate: v => assert.equal(v, expected)});
const large = Object.fromEntries(Array.from({length: 64}, (_, i) => ['k' + i, {n: i, tags: ['a', 'b']} ]));
const cases = [
  compare('primitive / equal', 1, 1, true),
  compare('record / small equal', {a: 1, b: 'two', c: true}, {c: true, a: 1, b: 'two'}, true),
  compare('record / changed value', {a: 1, b: 'two', c: true}, {a: 1, b: 'two', c: false}, false),
  compare('record / missing key', {a: 1, b: undefined}, {a: 1, c: undefined}, false),
  compare('record / nested 64 fields', large, structuredClone(large), true),
  compare('array / 32 records', Array.from({length: 32}, (_, n) => ({n})), Array.from({length: 32}, (_, n) => ({n})), true),
  compare('Buffer / equal 1KiB', Buffer.alloc(1024, 97), Buffer.alloc(1024, 97), true),
  compare('Map / nested 32 entries', new Map(Object.entries(large).slice(0, 32)), new Map(Object.entries(structuredClone(large)).slice(0, 32)), true, 'es6'),
  compare('Set / 32 primitives', new Set(Array.from({length: 32}, (_, i) => i)), new Set(Array.from({length: 32}, (_, i) => 31 - i)), true, 'es6'),
  compare('React / equal element', {$$typeof: Symbol.for('react.element'), type: 'div', props: {title: 'one'}, _owner: {}}, {$$typeof: Symbol.for('react.element'), type: 'div', props: {title: 'one'}, _owner: {}}, true, 'react'),
];
const caller = require('../../../scripts/deep-equal-conformance/callers.cjs');
const sdkCases = new Map([[upstream, caller.cases(upstream.equal)], [vpm, caller.cases(vpm.equal)]]);
for (let i = 0; i < 7; i++) cases.push({name: sdkCases.get(upstream)[i].name, make: lib => sdkCases.get(lib)[i].run, validate: v => assert.equal(v, sdkCases.get(upstream)[i].expected)});
require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases, files: ['package.json', 'special.js', 'src/equal.js.txt', '../../scripts/build-deep-equal.cjs', 'index.js', 'react.js', 'es6/index.js', 'es6/react.js', 'bench/compare.cjs', '../../scripts/deep-equal-conformance/package-lock.json', '../../scripts/deep-equal-conformance/callers.cjs', '../../scripts/protobuf-conformance/package-lock.json']}).catch(e => {console.error(e); process.exitCode = 1;});
