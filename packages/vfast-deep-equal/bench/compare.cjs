'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
(async () => {
const {upstream, vpm} = await require('../../../scripts/bench-library.cjs').load({
  upstream: () => ({equal: require('../../../scripts/deep-equal-conformance/node_modules/fast-deep-equal'), es6: require('../../../scripts/deep-equal-conformance/node_modules/fast-deep-equal/es6'), react: require('../../../scripts/deep-equal-conformance/node_modules/fast-deep-equal/react')}),
  vpm: () => ({equal: require('..'), es6: require('../es6'), react: require('../react')}),
});
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
let sdkCases;
const sdkExpected = [['equal document', true], ['changed document', false], ['equal query', true], ['changed filter', false], ['arrayUnion', true], ['arrayRemove', false], ['aggregate query', true]];
for (const [index, [name, expected]] of sdkExpected.entries()) cases.push({name: 'Firestore / ' + name, make: lib => {
  sdkCases ??= require('../../../scripts/deep-equal-conformance/callers.cjs').cases(lib.equal);
  assert.equal(sdkCases[index].name, 'Firestore / ' + name);
  return sdkCases[index].run;
}, validate: value => assert.equal(value, expected)});
require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases, files: ['../../scripts/bench-library.cjs', '../../scripts/deep-equal-conformance/node_modules/fast-deep-equal', '../../scripts/protobuf-conformance/node_modules/@google-cloud/firestore/build/src', 'package.json', 'special.js', 'src/equal.js.txt', '../../scripts/build-deep-equal.cjs', 'index.js', 'react.js', 'es6/index.js', 'es6/react.js', 'bench/compare.cjs', '../../scripts/deep-equal-conformance/package-lock.json', '../../scripts/deep-equal-conformance/callers.cjs', '../../scripts/protobuf-conformance/package-lock.json']}).catch(e => {console.error(e); process.exitCode = 1;});

})().catch(error => {console.error(error); process.exitCode = 1;});
