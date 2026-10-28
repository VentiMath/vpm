'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
const merge = require('..');
const upstream = require('./fixtures/merge-descriptors-2.0.0.cjs');

test('unmodified fixture matches its verified source hash', () => {
  const source = require('../PROVENANCE.json').sources[0];
  assert.equal(createHash('sha256').update(readFileSync(resolve(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
});

test('copies exact own data and accessor descriptors without invoking accessors', () => {
  let reads = 0; let writes = 0;
  const source = Object.create({ inherited: 1 });
  Object.defineProperties(source, {
    data: { value: { shared: true }, enumerable: true, configurable: true, writable: false },
    hidden: { value: 3 },
    accessor: { get() { reads++; return this.data; }, set() { writes++; }, enumerable: true, configurable: true },
  });
  const destination = {};
  assert.equal(merge(destination, source), destination);
  assert.deepEqual(Object.getOwnPropertyDescriptors(destination), Object.getOwnPropertyDescriptors(source));
  assert.deepEqual([reads, writes], [0, 0]); assert.equal(Object.hasOwn(destination, 'inherited'), false);
  assert.equal(destination.data, source.data);
});

test('enumerable and nonenumerable symbols are included', () => {
  const a = Symbol('public'), b = Symbol('hidden'), source = { [a]: 1 };
  Object.defineProperty(source, b, { get() { return 2; } });
  const result = merge({}, source);
  assert.deepEqual(Reflect.ownKeys(result), [a, b]);
  assert.deepEqual(Object.getOwnPropertyDescriptors(result), Object.getOwnPropertyDescriptors(source));
  assert.equal(Reflect.ownKeys(upstream({}, source)).length, 0);
});

test('overwrite false preserves own names and symbols but permits inherited-name replacement', () => {
  const symbol = Symbol();
  const destination = Object.assign(Object.create({ inherited: 'old' }), { own: 'old', [symbol]: 'old' });
  merge(destination, { own: 'new', inherited: 'new', extra: true, [symbol]: 'new' }, false);
  assert.equal(destination.own, 'old'); assert.equal(destination[symbol], 'old');
  assert.equal(destination.inherited, 'new'); assert.equal(Object.hasOwn(destination, 'inherited'), true); assert.equal(destination.extra, true);
});

test('default/true overwrite matches upstream and overwrites conflicting types', () => {
  for (const mode of [undefined, true, false]) {
    const a = { a: 1, b: 2 }, b = { a: 1, b: 2 }, source = { a: 'text', c: 3 };
    assert.deepEqual(merge(a, source, mode), upstream(b, source, mode));
  }
});

test('null-prototype objects, __proto__ and accessors retain safe descriptor semantics', () => {
  const source = Object.create(null); const prototype = { injected: true };
  Object.defineProperty(source, '__proto__', { value: prototype, enumerable: true });
  const destination = {};
  merge(destination, source);
  assert.equal(Object.getPrototypeOf(destination), Object.prototype);
  assert.equal(destination.__proto__, prototype); assert.equal(destination.injected, undefined);
  const isolated = Object.create(null); merge(isolated, { x: 1 }); assert.equal(isolated.x, 1);
});

test('functions, arrays and self-merges retain native behavior', () => {
  function destination(value) { return value * 2; }
  merge(destination, { label: 'function' }); assert.equal(destination(3), 6); assert.equal(destination.label, 'function');
  const source = () => 7; source.label = 'source';
  const plain = merge({}, source); assert.equal(typeof plain, 'object'); assert.equal(plain.label, 'source');
  const array = [0]; merge(array, [1, 2]); assert.deepEqual(array, [1, 2]);
  const frozen = Object.freeze({ x: 1 }); assert.equal(merge(frozen, frozen), frozen);
});

test('primitive endpoints and nonboolean overwrite options reject before mutation', () => {
  for (const bad of [null, undefined, 0, 1, true, '', 'abc', Symbol('x'), 1n]) {
    assert.throws(() => merge(bad, {}), TypeError); assert.throws(() => merge({}, bad), TypeError);
  }
  for (const mode of [null, 0, 1, '', 'false', {}, []]) {
    const destination = { x: 1 }; assert.throws(() => merge(destination, { x: 2, y: 3 }, mode), TypeError); assert.deepEqual(destination, { x: 1 });
  }
});

test('nonconfigurable conflicts and nonextensible targets retain native errors and partial progress', () => {
  const destination = {};
  Object.defineProperty(destination, 'locked', { value: 1 });
  assert.throws(() => merge(destination, { first: 2, locked: 3, last: 4 }), TypeError);
  assert.equal(destination.first, 2); assert.equal(destination.locked, 1); assert.equal(Object.hasOwn(destination, 'last'), false);
  assert.throws(() => merge(Object.preventExtensions({}), { x: 1 }), TypeError);
  assert.doesNotThrow(() => merge(destination, { locked: 3 }, false));
});

test('overwrite false skips source descriptor traps for existing destination keys', () => {
  const symbol = Symbol();
  const source = new Proxy({ x: 2, [symbol]: 3 }, { getOwnPropertyDescriptor() { throw new Error('must not read'); } });
  const destination = { x: 1, [symbol]: 1 };
  assert.equal(merge(destination, source, false), destination);
});

test('disappearing source keys are skipped without copying inherited replacements', () => {
  const source = Object.assign(Object.create({ gone: 'inherited' }), { first: 1, gone: 2 });
  const destination = new Proxy({}, { defineProperty(target, key, descriptor) { if (key === 'first') delete source.gone; return Reflect.defineProperty(target, key, descriptor); } });
  merge(destination, source);
  assert.deepEqual(Reflect.ownKeys(destination), ['first']); assert.equal(destination.gone, undefined);
});

test('proxy trap order and descriptor errors follow native property operations', () => {
  const calls = [];
  const source = new Proxy({ a: 1, b: 2 }, { ownKeys(target) { calls.push('keys'); return Reflect.ownKeys(target); }, getOwnPropertyDescriptor(target, key) { calls.push('read ' + key); return Reflect.getOwnPropertyDescriptor(target, key); } });
  const destination = new Proxy({}, { defineProperty(target, key, descriptor) { calls.push('write ' + key); return Reflect.defineProperty(target, key, descriptor); } });
  merge(destination, source);
  assert.deepEqual(calls, ['keys', 'read a', 'write a', 'read b', 'write b']);
  const error = new Error('trap'); assert.throws(() => merge({}, new Proxy({}, { ownKeys() { throw error; } })), e => e === error);
});

test('proxy enumeration retains interleaved symbols and single-trap behavior', () => {
  const symbol = Symbol('first');
  const calls = [];
  const source = new Proxy({ a: 1, b: 2, [symbol]: 3 }, {
    ownKeys() { calls.push('keys'); return [symbol, 'b', 'a']; },
    getOwnPropertyDescriptor(target, key) { calls.push(key); return Reflect.getOwnPropertyDescriptor(target, key); },
  });
  const result = merge({}, source);
  assert.deepEqual(calls, ['keys', symbol, 'b', 'a']);
  assert.equal(result[symbol], 3);
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke(); assert.throws(() => merge({}, proxy), TypeError);
});

test('ordinary string and symbol keys are snapshotted before destination traps', () => {
  const gone = Symbol('gone'), retained = Symbol('retained'), added = Symbol('added');
  const source = { 1: 'integer', first: 1, [gone]: 2, [retained]: 3 };
  const copied = [];
  const destination = new Proxy({}, { defineProperty(target, key, descriptor) {
    copied.push(key);
    if (key === '1') { delete source[gone]; source[added] = 4; source.late = 5; }
    return Reflect.defineProperty(target, key, descriptor);
  } });
  merge(destination, source);
  assert.deepEqual(copied, ['1', 'first', retained]);
  assert.deepEqual(Reflect.ownKeys(destination), ['1', 'first', retained]);
  assert.equal(destination[retained], 3);
});

test('overlapping typed arrays keep sequential descriptor reads', () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const source = bytes.subarray(0, 3), destination = bytes.subarray(1);
  // Defining destination[0] changes source[1] before its descriptor is read.
  merge(destination, source);
  assert.deepEqual([...bytes], [1, 1, 1, 1]);
});

test('generated descriptor combinations match upstream for string-only sources', () => {
  for (let i = 0; i < 1000; i++) {
    const source = {}, a = {}, b = {};
    for (let j = 0; j < 8; j++) {
      const key = 'field' + j;
      const descriptor = { value: i * 8 + j, enumerable: !!((i + j) & 1), writable: !!((i + j) & 2), configurable: !!((i + j) & 4) };
      Object.defineProperty(source, key, descriptor);
      if (j % 2) { a[key] = 'old'; b[key] = 'old'; }
    }
    merge(a, source, !!(i & 1)); upstream(b, source, !!(i & 1));
    assert.deepEqual(Object.getOwnPropertyDescriptors(a), Object.getOwnPropertyDescriptors(b));
  }
});

test('CJS and native ESM expose the same frozen callable default', async () => {
  const esm = await import('../index.js'); assert.equal(esm.default, merge); assert.equal(Object.isFrozen(merge), true);
});
