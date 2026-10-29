'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const upstream = require('../../../scripts/consumers/node_modules/extend');
const previous = require('./previous.cjs');
const vpm = require('..');
const cases = [];
const large = Object.fromEntries(Array.from({length: 50}, (_, i) => ['k' + i, {value: i, list: [i, i + 1]}]));
const inputs = [
  ['shallow three fields', () => [{}, {a: 1, b: 2, c: 3}]],
  ['deep three fields', () => [true, {}, {a: 1, b: 2, c: 3}]],
  ['deep HTTP options', () => [true, {}, {headers: {Accept: 'application/json'}, timeout: 1000, params: {limit: 50}}, {headers: {Authorization: 'Bearer test'}, params: {page: 2}}]],
  ['deep 50 records', () => [true, {}, large]]
];
for (const baseline of ['upstream', 'previous VPM']) {
  for (const [name, args] of inputs) cases.push({
    name: baseline + ' / ' + name,
    make: lib => {
      const implementation = baseline === 'previous VPM' && lib === upstream ? previous : lib;
      return () => implementation(...args());
    },
    validate: result => assert.deepEqual(result, upstream(...args()))
  });
}
require('../../../scripts/bench-paired.cjs').run({
  root: path.resolve(__dirname, '..'), upstream, vpm, cases,
  files: ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', 'bench/previous.cjs', '../../scripts/consumers/node_modules/extend/index.js', '../../scripts/consumers/package-lock.json']
}).catch(error => { console.error(error); process.exitCode = 1; });
