'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const OrderedMap = process.env.VPM_ORDEREDMAP_ENTRY ? require(process.env.VPM_ORDEREDMAP_ENTRY) : require('..');
const upstream = require('../../../scripts/orderedmap-conformance/node_modules/orderedmap');
const entries = map => { const result = []; map.forEach((key, value) => result.push([key, value])); return result; };

test('public construction, value identity, iteration, empty values and immutable edits', () => {
  const object = {a: {value: 1}, b: undefined, c: false};
  const original = OrderedMap.from(object);
  assert.equal(OrderedMap.from(original), original);
  assert.equal(OrderedMap.from().size, 0);
  assert.equal(OrderedMap.from(null).size, 0);
  assert.equal(original.get('a'), object.a);
  assert.equal(original.get('missing'), undefined);
  assert.equal(original.size, 3);
  object.d = 4; delete object.c;
  assert.deepEqual(entries(original), [['a', {value: 1}], ['b', undefined], ['c', false]]);
  assert.equal(original.remove('missing'), original);
  assert.equal(original.append({}), original);
  assert.equal(original.prepend({}), original);
  const next = original.update('a', 2).remove('b').addToStart('c', 3).addToEnd('d', 4).addBefore('a', 'e', 5);
  assert.deepEqual(entries(next), [['c', 3], ['e', 5], ['a', 2], ['d', 4]]);
  assert.equal(original.size, 3);
  assert.equal(original.get('a').value, 1);
  assert.equal(original.forEach(() => {}), undefined);
});

test('renames, moves, precedence and collisions match upstream ordering', () => {
  for (const initial of [{}, {a: 1}, {a: 1, b: 2, c: 3}]) {
    for (const [method, args] of [
      ['update', ['a', 8, 'b']], ['update', ['z', 8, 'b']], ['update', ['b', 8, 'a']],
      ['addBefore', ['b', 'a', 8]], ['addBefore', ['a', 'a', 8]], ['addBefore', ['z', 'b', 8]],
      ['prepend', [{b: 8, d: 9}]], ['append', [{b: 8, d: 9}]], ['subtract', [{b: undefined, c: null}]],
    ]) assert.deepEqual(entries(OrderedMap.from(initial)[method](...args)), entries(upstream.from(initial)[method](...args)), method + JSON.stringify(args));
  }
});

test('4000 deterministic edits match upstream and retain historical snapshots', () => {
  let seed = 0x12345678;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  let a = OrderedMap.from(), b = upstream.from();
  const past = [];
  for (let i = 0; i < 4000; i++) {
    const key = 'k' + random(80), value = random(200), key2 = 'k' + random(80);
    const methods = [['update', [key, value]], ['update', [key, value, key2]], ['remove', [key]], ['addToStart', [key, value]], ['addToEnd', [key, value]], ['addBefore', [key2, key, value]], ['append', [{[key]: value, [key2]: i}]], ['prepend', [{[key]: value}]], ['subtract', [{[key]: 0, [key2]: 0}]]];
    if (i % 100 === 0) past.push([a, entries(a)]);
    const [method, args] = methods[random(methods.length)];
    a = a[method](...args); b = b[method](...args);
    assert.deepEqual(entries(a), entries(b), method + ' at ' + i);
    assert.deepEqual(a.toObject(), b.toObject());
    assert.equal(a.get(key), b.get(key)); assert.equal(a.size, b.size);
  }
  for (const [map, snapshot] of past) assert.deepEqual(entries(map), snapshot);
});

test('only own enumerable input keys are imported; prototype-named keys round-trip as data', () => {
  const source = Object.assign(Object.create({inherited: 1}), {own: 2});
  Object.defineProperty(source, 'hidden', {value: 3}); source[Symbol('ignored')] = 4;
  assert.deepEqual(entries(OrderedMap.from(source)), [['own', 2]]);
  assert.equal(upstream.from(source).get('inherited'), 1, 'upstream comparison reproduces inherited-key behavior');
  const value = {danger: true};
  const map = OrderedMap.from().update('__proto__', value).update('constructor', 2).update('toString', 3);
  const result = map.toObject();
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.hasOwn(result, '__proto__'), true);
  assert.equal(result.__proto__, value);
  assert.equal(result.constructor, 2);
  assert.deepEqual(entries(OrderedMap.from(result)), entries(map));
  assert.equal(Object.hasOwn(upstream.from().update('__proto__', value).toObject(), '__proto__'), false);
});

test('empty-string renaming, no-op updates and signed zero have defined behavior', () => {
  const map = OrderedMap.from({'': 1, a: 2, b: 3});
  assert.deepEqual(entries(map.update('a', 4, '')), [['', 4], ['b', 3]]);
  assert.deepEqual(entries(map.update('absent', 4, '')), [['a', 2], ['b', 3], ['', 4]]);
  assert.equal(map.update('a', 2), map);
  const nan = OrderedMap.from({a: NaN}); assert.equal(nan.update('a', NaN), nan);
  assert.equal(Object.is(OrderedMap.from({a: 0}).update('a', -0).get('a'), -0), true);
});

test('large-map index and private storage stay correct after every kind of edit', () => {
  const map = OrderedMap.from(Object.fromEntries(Array.from({length: 128}, (_, i) => ['k' + i, i])));
  for (let i = 0; i < 128; i++) assert.equal(map.get('k' + i), i);
  map.content = ['k127', 'tampered'];
  assert.equal(map.get('k127'), 127);
  const variants = [map.update('k127', 9), map.update('k127', 9, 'k0'), map.remove('k1'), map.addToStart('k127', 9), map.addToEnd('k0', 9), map.addBefore('k2', 'k100', 9), map.prepend({k127: 9}), map.append({k0: 9}), map.subtract({k1: true})];
  for (const next of variants) for (const [key, value] of entries(next)) assert.equal(next.get(key), value);
  assert.equal(map.get('k127'), 127); assert.equal(map.get('k0'), 0);
  assert.throws(() => new OrderedMap([]), /OrderedMap.from/);
});
