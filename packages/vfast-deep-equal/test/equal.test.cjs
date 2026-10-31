'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const equal = require('..'), react = require('../react');
const pair = (a, b, expected) => {assert.equal(equal(a, b), expected); assert.equal(equal(b, a), expected);};

test('primitive contract, own keys and insertion order', () => {
  pair(NaN, NaN, true); pair(0, -0, true); pair(0, false, false);
  pair({a: 1, b: undefined}, {b: undefined, a: 1}, true);
  pair({a: undefined}, {b: undefined}, false);
  pair({a: 1}, Object.create({a: 1}), false);
  pair({[Symbol('x')]: 1}, {}, true);
});
test('null-prototype records and nested data', () => {
  pair(Object.assign(Object.create(null), {a: {b: 1}}), Object.assign(Object.create(null), {a: {b: 1}}), true);
  pair(Object.assign(Object.create(null), {a: 1}), Object.assign(Object.create(null), {a: 2}), false);
  pair(Object.create(null), {}, false);
});
test('non-callable conversion fields compare as data', () => {
  pair({valueOf: 1, toString: null}, {valueOf: 1, toString: null}, true);
  pair({valueOf: 1}, {valueOf: 2}, false);
  pair({toString: 'one'}, {toString: 'two'}, false);
});
test('custom conversion hooks retain upstream precedence', () => {
  pair({valueOf: () => 1, different: 1}, {valueOf: () => 1, different: 2}, true);
  pair({toString: () => 'one'}, {toString: () => 'two'}, false);
  pair(new Date(1), new Date(2), false); pair(new Date(1), new Date(1), true);
  pair(new Date(NaN), new Date(NaN), false);
  pair(/a/gi, /a/gi, true); pair(/a/g, /a/i, false);
});
test('arrays require an array on both sides', () => {
  pair([], {constructor: Array, length: 0}, false);
  pair([1, {a: 2}], [1, {a: 2}], true);
  pair([1], [2], false); pair(new Array(1), [undefined], true);
});
test('binary comparisons retain bytes that UTF-8 decoding loses', () => {
  pair(Buffer.from([0xff]), Buffer.from([0xfe]), false);
  pair(Buffer.from([0xff]), Buffer.from([0xff]), true);
  pair(Buffer.from([1]), new Uint8Array([1]), false);
  pair(Buffer.from([9, 1, 2, 9]).subarray(1, 3), Buffer.from([1, 2]), true);
});
test('DataView compares just its selected range and terminates', () => {
  const a = new DataView(Uint8Array.from([9, 1, 2, 9]).buffer, 1, 2);
  pair(a, new DataView(Uint8Array.from([1, 2]).buffer), true);
  pair(a, new DataView(Uint8Array.from([1, 3]).buffer), false);
  pair(a, new DataView(new ArrayBuffer(0)), false);
});
test('ArrayBuffer compares content and length', () => {
  pair(Uint8Array.from([1, 2]).buffer, Uint8Array.from([1, 2]).buffer, true);
  pair(Uint8Array.from([1, 2]).buffer, Uint8Array.from([1, 3]).buffer, false);
  pair(new ArrayBuffer(0), new ArrayBuffer(1), false);
  const a = new SharedArrayBuffer(2), b = new SharedArrayBuffer(2);
  pair(a, b, true); new Uint8Array(b)[1] = 1; pair(a, b, false);
});
test('compared array entries and record getters are read once', () => {
  for (const array of [false, true]) {
    let reads = 0;
    const a = array ? [0] : {}, b = array ? [0] : {};
    const key = array ? '0' : 'value';
    Object.defineProperty(a, key, {enumerable: true, get() {reads++; return {n: 1};}});
    Object.defineProperty(b, key, {enumerable: true, get() {reads++; return {n: 1};}});
    assert.equal(equal(a, b), true); assert.equal(reads, 2);
  }
});
test('typed arrays use upstream ES6 strict element comparison', () => {
  for (const C of [Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array]) {
    pair(new C([1, 2]), new C([1, 2]), true); pair(new C([1, 2]), new C([1, 3]), false);
  }
  pair(new BigInt64Array([1n]), new BigInt64Array([2n]), false);
  pair(new BigUint64Array([1n]), new BigUint64Array([1n]), true);
  pair(new Float64Array([NaN]), new Float64Array([NaN]), false);
});
test('Map keys and Set entries retain identity semantics', () => {
  const key = {};
  pair(new Map([[key, {a: 1}]]), new Map([[key, {a: 1}]]), true);
  pair(new Map([[{}, 1]]), new Map([[{}, 1]]), false);
  pair(new Map([['a', undefined]]), new Map([['b', undefined]]), false);
  pair(new Map([['a', 1], ['b', 2]]), new Map([['b', 2], ['a', 1]]), true);
  pair(new Set([1, key]), new Set([key, 1]), true);
  pair(new Set([{}]), new Set([{}]), false);
});
test('opaque promises and weak collections require identity', () => {
  for (const [a, b] of [[Promise.resolve(1), Promise.resolve(1)], [new WeakMap(), new WeakMap()], [new WeakSet(), new WeakSet()]]) {
    pair(a, b, false); pair(a, a, true);
  }
});
test('React mode skips owners while still comparing props', () => {
  const make = n => {const a = {$$typeof: Symbol.for('react.transitional.element'), type: 'h1', props: {n}, _owner: {}}; a._owner.element = a; return a;};
  assert.equal(react(make(1), make(1)), true); assert.equal(react(make(1), make(2)), false);
  assert.equal(react({_owner: 1}, {_owner: 2}), false);
});
test('both ES6 entry points are aliases of the full comparator', async () => {
  assert.equal(require('../es6'), equal); assert.equal(require('../es6/react'), react);
  for (const name of ['index', 'react', 'es6/index', 'es6/react']) {
    const imported = await import(`../${name}.mjs`);
    assert.equal(imported.default, require(`../${name}.js`));
  }
  for (const sub of ['/index', '/index.js', '/react.js', '/es6/index', '/es6/index.js', '/es6/react.js']) {
    assert.equal(require('vfast-deep-equal' + sub), sub.includes('react') ? react : equal);
    assert.equal((await import('vfast-deep-equal' + sub)).default, sub.includes('react') ? react : equal);
  }
});
test('deterministic JSON corpus agrees with Node strict equality', () => {
  const {isDeepStrictEqual} = require('node:util'); let seed = 101;
  const random = n => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n);
  const make = depth => depth && random(3) ? (random(2) ? Array.from({length: random(4)}, () => make(depth - 1)) : Object.fromEntries(Array.from({length: random(4)}, (_, i) => ['k' + i, make(depth - 1)]))) : [null, false, true, 0, 1, 'a', 'b'][random(7)];
  for (let i = 0; i < 2000; i++) {
    const a = make(4), b = i % 2 ? JSON.parse(JSON.stringify(a)) : make(4);
    pair(a, b, isDeepStrictEqual(a, b));
  }
});
