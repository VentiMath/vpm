'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('..');

test('FIFO preserves falsy values, identity and empty results', () => {
  const q = new Queue(), values = [undefined, null, false, 0, '', NaN, {}, Symbol('q')];
  for (const value of values) assert.equal(q.enqueue(value), undefined);
  assert.equal(q.size, values.length);
  for (const value of values) { assert.equal(q.peek(), value); assert.equal(q.dequeue(), value); }
  assert.equal(q.size, 0); assert.equal(q.dequeue(), undefined); assert.equal(q.peek(), undefined);
  q.enqueue('reused'); assert.equal(q.dequeue(), 'reused');
});
test('model comparison across randomized enqueue/dequeue/clear operations', () => {
  const q = new Queue(), model = []; let seed = 0x12345678;
  for (let i = 0; i < 20000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    if (seed % 23 === 0) { q.clear(); model.length = 0; }
    else if (seed % 3) { q.enqueue(seed); model.push(seed); }
    else assert.equal(q.dequeue(), model.shift());
    assert.equal(q.size, model.length); assert.equal(q.peek(), model[0]);
    if (i % 101 === 0) assert.deepEqual([...q], model);
  }
});
test('iteration is lazy, non-destructive and sees appended links', () => {
  const q = new Queue(), iterator = q[Symbol.iterator]();
  q.enqueue(1); q.enqueue(2); assert.equal(iterator.next().value, 1);
  q.enqueue(3); assert.deepEqual([...iterator], [2, 3]); assert.equal(q.size, 3);
});
test('started iterators retain their original links across clear', () => {
  const q = new Queue(); q.enqueue(1); q.enqueue(2);
  const iterator = q[Symbol.iterator](); assert.equal(iterator.next().value, 1);
  q.clear(); q.enqueue(3); assert.deepEqual([...iterator], [2]); assert.deepEqual([...q], [3]);
});
test('drain removes one item per advance and permits early return', () => {
  const q = new Queue(); q.enqueue(undefined); q.enqueue(2);
  const drain = q.drain(); assert.equal(q.size, 2);
  assert.deepEqual(drain.next(), {value:undefined, done:false}); assert.equal(q.size, 1);
  drain.return(); assert.equal(q.dequeue(), 2);
});
test('drain consumes entries added while draining', () => {
  const q = new Queue(); q.enqueue(1); const drain = q.drain();
  assert.equal(drain.next().value, 1); q.enqueue(2); assert.deepEqual([...drain], [2]); assert.equal(q.size, 0);
});
test('constructor does not invoke an override before subclass initialization', () => {
  class Custom extends Queue { clear() { throw Error('override'); } }
  const q = new Custom(); q.enqueue(1); assert.equal(q.dequeue(), 1);
});
test('large queue drains without recursion and read-only size cannot drift', () => {
  const q = new Queue(); for (let i = 0; i < 100000; i++) q.enqueue(i);
  assert.throws(() => { q.size = 0; }, TypeError);
  let i = 0; for (const value of q.drain()) assert.equal(value, i++);
  assert.equal(i, 100000); assert.equal(q.size, 0);
});
