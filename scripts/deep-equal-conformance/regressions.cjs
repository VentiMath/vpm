'use strict';
const assert = require('node:assert/strict'), {spawnSync} = require('node:child_process');
const upstream = require('./node_modules/fast-deep-equal'), vpm = require('../../packages/vfast-deep-equal');
const a = Buffer.from([0xff]), b = Buffer.from([0xfe]);
assert.equal(upstream(a, b), true); assert.equal(vpm(a, b), false);
assert.throws(() => upstream(Object.create(null), Object.create(null)), TypeError);
assert.equal(vpm(Object.create(null), Object.create(null)), true);
assert.throws(() => upstream({toString: 1}, {toString: 1}), TypeError);
assert.equal(vpm({toString: 1}, {toString: 1}), true);
assert.equal(upstream([], {constructor: Array, length: 0}), true);
assert.equal(vpm([], {constructor: Array, length: 0}), false);
// Run the known infinite loop in a bounded child so it cannot hang CI.
const script = `const equal=require(${JSON.stringify(require.resolve('./node_modules/fast-deep-equal/es6'))});process.stdout.write('started');equal(new DataView(new ArrayBuffer(1)),new DataView(new ArrayBuffer(1)));`;
const run = spawnSync(process.execPath, ['-e', script], {encoding: 'utf8', timeout: 1500});
assert.equal(run.stdout, 'started'); assert.equal(run.error?.code, 'ETIMEDOUT');
assert.equal(vpm(new DataView(new ArrayBuffer(1)), new DataView(new ArrayBuffer(1))), true);
console.log('Reproduced and fixed binary false equality, null-prototype/non-callable-hook throws, array kind confusion and the ES6 DataView infinite loop.');
