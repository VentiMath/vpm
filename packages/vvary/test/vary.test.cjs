'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const vary = require('..');
const upstream = require('./fixtures/vary-1.1.2.cjs');
function response(value) {
  return { value, writes: 0, getHeader(name) { assert.equal(name, 'Vary'); return this.value; }, setHeader(name, next) { assert.equal(name, 'Vary'); this.value = next; this.writes++; } };
}

test('fixture matches the verified upstream hash', () => {
  const source = require('../PROVENANCE.json').sources[0];
  assert.equal(createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
});

test('ordinary append behavior preserves upstream casing, order and formatting', () => {
  for (const header of ['', 'Accept', 'Accept, Accept-Encoding', '  Accept  , Origin ', '*', 'Accept, *', 'Accept, accept']) {
    for (const field of ['Origin', 'accept', 'ACCEPT-ENCODING', 'Origin, Accept', ' * ', '*', [], ['Origin', 'accept', 'ORIGIN']]) {
      assert.equal(vary.append(header, field), upstream.append(header, field), `${header} + ${field}`);
    }
  }
});

test('HTTP optional whitespace includes tabs for new and existing fields', () => {
  assert.throws(() => upstream.append('', 'Accept,\tOrigin'), TypeError);
  assert.equal(vary.append('', 'Accept,\tOrigin'), 'Accept, Origin');
  assert.equal(vary.append('Accept,\tOrigin', 'origin'), 'Accept,\tOrigin');
  assert.equal(upstream.append('Accept,\tOrigin', 'origin'), 'Accept,\tOrigin, origin');
  assert.equal(vary.append('\t*\t', 'Accept'), '*');
  assert.equal(vary.append('', '\tAccept\t, \tOrigin\t'), 'Accept, Origin');
});

test('empty list members are ignored around actual names', () => {
  assert.equal(vary.append('', ',Accept,, Origin, '), 'Accept, Origin');
  assert.equal(vary.append(',,\t', 'Origin'), 'Origin');
  assert.equal(vary.append('Accept, ,Origin,', ['Accept', 'Cookie']), 'Accept, ,Origin,, Cookie');
  assert.equal(vary.append('', []), '');
  for (const value of ['', ',', '\t ', ' , , ']) assert.throws(() => vary.append('', value), TypeError);
});

test('wildcards dominate valid lists but do not bypass validation', () => {
  for (const header of ['', '*', 'Accept, *', ' * , Origin']) {
    assert.equal(vary.append(header, ['Cookie', '*', 'Origin']), '*');
    assert.throws(() => vary.append(header, ['*', 'invalid name']), TypeError);
  }
  assert.throws(() => vary.append('Bad Header', '*'), TypeError);
  assert.throws(() => vary.append('Bad\r\nHeader', []), TypeError);
  assert.equal(vary.append('Accept', []), 'Accept');
});

test('all ASCII token characters are accepted and delimiters/controls rejected', () => {
  const allowed = "!#$%&'*+-.^_`|~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < 256; i++) {
    const name = 'X' + String.fromCharCode(i);
    if (allowed.includes(String.fromCharCode(i))) assert.equal(vary.append('', [name]), name);
    else {
      assert.throws(() => vary.append('', [name]), TypeError, String(i));
      // Strings may contain HTTP whitespace/list separators only at boundaries.
      if (i !== 44) assert.throws(() => vary.append(name + 'X', 'Origin'), TypeError, String(i));
      else assert.equal(vary.append(name + 'X', 'Origin'), 'X,X, Origin');
    }
  }
});

test('invalid existing fields and new fields cannot be reflected into a header', () => {
  for (const value of ['Bad Name', 'A\r\nX: yes', 'A\n', 'A\r', 'A\0', 'Å', 'K', 'X:Y', 'A;B', '"Accept"']) {
    assert.throws(() => vary.append(value, 'Origin'), TypeError);
    assert.throws(() => vary.append('Accept', value), TypeError);
  }
  assert.equal(upstream.append('Bad Name', 'Origin'), 'Bad Name, Origin');
});

test('no implicit coercion and no mutation of readonly inputs', () => {
  let calls = 0;
  const object = { toString() { calls++; return 'Origin'; } };
  for (const value of [null, undefined, 1, false, object, new String('Origin')]) {
    assert.throws(() => vary.append('', value), TypeError);
    assert.throws(() => vary.append('', [value]), TypeError);
    assert.throws(() => vary.append(value, 'Origin'), TypeError);
  }
  assert.throws(() => vary.append('', new Array(1)), TypeError);
  assert.equal(vary.append('Accept', Object.freeze(['Origin', 'Accept'])), 'Accept, Origin');
  assert.equal(calls, 0);
});

test('array accessors are captured once before validation and output', () => {
  const fields = [];
  let reads = 0;
  Object.defineProperty(fields, 0, { get() { return ++reads === 1 ? 'Origin' : 'Injected\r\nHeader: yes'; }, configurable: true });
  assert.equal(vary.append('', fields), 'Origin');
  assert.equal(reads, 1);
  const original = ['Origin', 'Accept'];
  Object.defineProperty(original, 0, { get() { original.push('Cookie'); return 'Origin'; } });
  assert.equal(vary.append('', original), 'Origin, Accept');
});

test('response wrapper appends strings and header arrays with the correct receiver', () => {
  for (const value of [undefined, '', 'Accept', ['Accept', 'Accept-Encoding']]) {
    const res = response(value);
    assert.equal(vary(res, 'Origin'), undefined);
    assert.equal(res.value, upstream.append(Array.isArray(value) ? value.join(', ') : value || '', 'Origin'));
    assert.equal(res.writes, 1);
  }
});

test('no-op additions avoid redundant setHeader calls', () => {
  for (const value of ['Accept', ['Accept'], '*']) {
    const res = response(value);
    vary(res, 'accept');
    assert.equal(res.writes, 0); assert.equal(res.value, value);
  }
  const res = response(undefined); vary(res, []); assert.equal(res.writes, 0);
});

test('response methods and array header elements are read once', () => {
  const res = { value: ['Accept'], writes: 0 };
  let gets = 0, sets = 0, entries = 0;
  Object.defineProperty(res, 'getHeader', { get() { gets++; return function () { return this.value; }; } });
  Object.defineProperty(res, 'setHeader', { get() { sets++; return function (_name, value) { this.value = value; this.writes++; }; } });
  Object.defineProperty(res.value, 0, { get() { entries++; return entries === 1 ? 'Accept' : 'Invalid\r\nHeader'; } });
  vary(res, 'Origin');
  assert.equal(res.value, 'Accept, Origin');
  assert.deepEqual([gets, sets, entries, res.writes], [1, 1, 1, 1]);
});

test('invalid response shapes and header values fail before mutation', () => {
  for (const res of [undefined, null, {}, { getHeader: true, setHeader: true }]) assert.throws(() => vary(res, 'Origin'), TypeError);
  for (const value of [null, 123, {}, ['Accept', 1], 'Invalid Header']) {
    const res = response(value); assert.throws(() => vary(res, 'Origin'), TypeError); assert.equal(res.writes, 0);
  }
  const res = response('Accept'); assert.throws(() => vary(res, ['Origin', 'Bad Header']), TypeError); assert.equal(res.writes, 0);
  const error = new Error('response failed');
  assert.throws(() => vary({ getHeader() { throw error; }, setHeader() {} }, 'Origin'), e => e === error);
});

test('generated valid ordinary lists match upstream and independent set semantics', () => {
  let seed = 84345;
  const next = n => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n);
  const pool = ['Accept', 'Origin', 'Cookie', 'accept', 'ORIGIN', 'X-Variant', '__proto__', 'constructor'];
  for (let i = 0; i < 2000; i++) {
    const existing = Array.from({ length: next(10) }, () => pool[next(pool.length)]);
    const fields = Array.from({ length: next(10) }, () => pool[next(pool.length)]);
    const header = existing.join(', ');
    const result = vary.append(header, fields);
    assert.equal(result, upstream.append(header, fields));
    const expected = new Set([...existing, ...fields].map(x => x.toLowerCase()));
    assert.deepEqual(new Set(result ? result.toLowerCase().split(', ') : []), expected);
  }
});

test('large lists and prototype-shaped names deduplicate correctly', () => {
  const names = Array.from({ length: 2000 }, (_, i) => 'X-' + i);
  const result = vary.append(names.slice(0, 1000).join(', '), names);
  assert.equal(result, names.join(', '));
  assert.equal(vary.append('__proto__, constructor', ['__PROTO__', 'CONSTRUCTOR', 'toString']), '__proto__, constructor, toString');
});

test('CommonJS and ESM retain callable default and named append', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.default, vary); assert.equal(esm.append, vary.append); assert.equal(Object.isFrozen(vary), true);
});
