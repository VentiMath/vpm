'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const etag = require('..');
const upstream = require('./fixtures/etag-1.8.1.cjs');

test('preserves tags for empty, ASCII, Unicode, surrogate, and binary bodies', () => {
  const entities = ['', 'hello', 'é 🦊', '\uD800\uD800', 'a'.repeat(65536), Buffer.alloc(0), Buffer.from([0, 1, 127, 255])];
  for (const entity of entities) for (const options of [undefined, null, {}, { weak: true }, { weak: false }]) {
    assert.equal(etag(entity, options), upstream(entity, options));
  }
});

test('matches upstream across generated UTF-16 strings and byte sequences', () => {
  let seed = 87654;
  for (let round = 0; round < 500; round++) {
    let value = '';
    for (let i = 0; i < round % 101; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; value += String.fromCharCode(seed & 65535); }
    assert.equal(etag(value), upstream(value));
    const bytes = Buffer.from(value); assert.equal(etag(bytes), upstream(bytes));
  }
});

test('hashes precisely the visible Uint8Array slice without changing its contents', () => {
  const backing = Uint8Array.from([99, 1, 2, 255, 88]); const view = backing.subarray(1, 4);
  assert.equal(etag(view), upstream(Buffer.from([1, 2, 255])));
  assert.deepEqual([...backing], [99, 1, 2, 255, 88]);
  assert.equal(etag(new Uint8Array()), upstream(Buffer.alloc(0)));
});

test('preserves actual file-stat tags and supports bigint Stats', () => {
  const ordinary = fs.statSync(__filename); const big = fs.statSync(__filename, { bigint: true });
  assert.equal(etag(ordinary), upstream(ordinary)); assert.equal(etag(big), upstream(ordinary));
  assert.equal(etag(big, { weak: false }), upstream(ordinary, { weak: false }));
});

test('supports minimal stat objects with exact bigint sizes and valid cross-realm dates', () => {
  const mtime = vm.runInNewContext('new Date(1000)');
  assert.equal(etag({ size: 16, mtime }), 'W/"10-3e8"');
  assert.equal(etag({ size: 9007199254740993n, mtime }), 'W/"20000000000001-3e8"');
});

test('rejects invalid sizes, dates, and unsupported entities', () => {
  for (const size of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1, -1n, '1']) {
    assert.throws(() => etag({ size, mtime: new Date() }), TypeError);
  }
  for (const mtime of [new Date(NaN), 1, 'today', { getTime: () => 0 }]) {
    assert.throws(() => etag({ size: 1, mtime }), TypeError);
  }
  for (const value of [undefined, null, 1, {}, new ArrayBuffer(1), new Uint16Array(1), new DataView(new ArrayBuffer(1))]) {
    assert.throws(() => etag(value), TypeError);
  }
});

test('supports the createHash fallback on runtimes without one-shot hashing', () => {
  const fixture = { exports: {} }; const file = path.join(__dirname, '../index.js');
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module'], { filename: file })(
    name => { assert.equal(name, 'node:crypto'); return { createHash: crypto.createHash }; }, fixture);
  for (const value of ['hello', 'é 🦊', Buffer.from([0, 255]), Uint8Array.from([1, 2])]) {
    assert.equal(fixture.exports(value), etag(value));
  }
});
