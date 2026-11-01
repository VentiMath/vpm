'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const clsx = require('..'), original = require('../../../scripts/clsx-conformance/node_modules/clsx');
test('full/lite CJS and ESM identities and exports match', async () => {
  const esm = await import('../runtime.mjs'), lite = await import('../lite.mjs');
  assert.equal(esm.default, clsx);assert.equal(clsx.clsx, clsx);
  assert.equal(lite.default, require('../lite.cjs'));assert.equal(lite.clsx, lite.default);
  assert.equal(lite.clsx('one', false, ['two'], 3, {three: true}, 'four'), 'one four');
});
test('5000 generated ordinary inputs match the pinned original', () => {
  let seed = 1234567;const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const atoms = ['', 'a', 'x y', 0, -1, 42, false, true, null, undefined, NaN, Infinity, 2n, Symbol('ignored')];
  function input(depth) {const n = rand();if (depth && n % 4 === 0) return Array.from({length: n % 6}, () => input(depth - 1));if(n % 4 === 1)return {one: n & 1, two: n & 2, three: n & 4};return atoms[n % atoms.length];}
  for (let i = 0; i < 5000; i++) {const args = Array.from({length: rand() % 7}, () => input(5));assert.equal(clsx(...args), original(...args));}
});
test('only own enumerable dictionary keys contribute classes', () => {
  const value = Object.assign(Object.create({inherited: true}), {own: true});
  assert.equal(original(value), 'own inherited');assert.equal(clsx(value), 'own');
  const special = JSON.parse('{"__proto__":true,"constructor":true,"toString":true}');
  assert.equal(clsx(special), '__proto__ constructor toString');
  assert.equal(clsx(Object.assign(Object.create(null), {safe: true})), 'safe');
});
test('deep arrays are stack-safe and shared arrays are not cycles', () => {
  let value = ['middle'];for (let i = 0; i < 100000; i++) value = [value];
  assert.throws(() => original(value), RangeError);assert.equal(clsx('first', value, 'last'), 'first middle last');
  const shared = ['same'];assert.equal(clsx(shared, [shared]), 'same same');
  const cycle = ['start'];cycle.push(cycle);
  assert.throws(() => clsx(cycle), {name: 'TypeError', message: 'Class-name arrays must not contain cycles.'});
});
test('frozen, sparse and cross-realm arrays retain order without mutation', () => {
  const values = Object.freeze(['a', Object.freeze({b: true}), false, ['c']]);
  assert.equal(clsx(values), 'a b c');
  assert.equal(clsx(require('node:vm').runInNewContext('["x", ["y"]]')), 'x y');
  const sparse = new Array(5);sparse[3] = 'found';assert.equal(clsx(sparse), 'found');
});
test('retained upstream suite and actual React/MUI caller outputs match', () => {
  const {spawnSync} = require('node:child_process'), path = require('node:path');
  for (const file of ['run.cjs', 'callers.cjs']) {
    const run = spawnSync(process.execPath, [path.resolve(__dirname, '../../../scripts/clsx-conformance', file)], {encoding: 'utf8', timeout: 90000});
    assert.equal(run.status, 0, run.stderr || run.stdout);
  }
});
