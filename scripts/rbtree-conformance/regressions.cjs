'use strict';
// Reproduces the original's index and comparator defects, then checks VPM.
const assert = require('node:assert/strict');
const upstream = require('./node_modules/functional-red-black-tree'), vpm = require('../../packages/vfunctional-red-black-tree');
const pair = lib => lib().insert(1, 'a').insert(2, 'b');

// at() on an empty tree dereferences a null root.
assert.throws(() => upstream().at(0), TypeError);
assert.equal(vpm().at(0).valid, false);
assert.equal(vpm().at(0).index, 0);

// NaN passes upstream's `idx < 0` and `!idx` checks, selecting the first entry.
assert.equal(pair(upstream).at(NaN).key, 1);
assert.equal(pair(vpm).at(NaN).valid, false);
for (const index of [-1, 2, 0.5, Infinity, '0']) assert.equal(pair(vpm).at(index).valid, false, String(index));
assert.deepEqual([0, 1].map(i => pair(vpm).at(i).key), [1, 2]);

// A truthy non-function comparator is accepted and fails on the second insert.
const broken = upstream(5).insert(1, 'a');
assert.throws(() => broken.insert(2, 'b'), TypeError);
assert.throws(() => vpm(5), {name: 'TypeError', message: 'compare must be a function'});
for (const fallback of [undefined, null, 0, false, '']) assert.deepEqual(vpm(fallback).insert(2).insert(1).keys, [1, 2]);

console.log('Reproduced and fixed empty-tree at(), at(NaN) selecting the first entry and late non-function comparator failures.');
