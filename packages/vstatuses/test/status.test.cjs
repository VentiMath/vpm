'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const status = require('..');
const upstream = require('./fixtures/statuses-2.0.2');

test('preserves every status code, reason phrase, and case-insensitive reverse lookup', () => {
  assert.deepEqual(status.codes, upstream.codes);
  for (const code of upstream.codes) {
    const message = upstream(code);
    assert.equal(status(code), message);
    assert.equal(status(String(code)), message);
    for (const text of [message, message.toUpperCase(), message.toLowerCase()]) {
      assert.equal(status(text), upstream(text));
    }
  }
});
test('preserves every flag and table value used by HTTP consumers', () => {
  for (const name of ['message', 'code', 'redirect', 'empty', 'retry']) {
    assert.deepEqual({ ...status[name] }, { ...upstream[name] });
  }
});
test('rejects numeric prefixes, padding, whitespace, and fractional strings', () => {
  for (const value of ['200garbage', '200 OK', '200.9', '0200', '+200', ' 200', '200 ', '200\n', '200e1']) {
    assert.equal(upstream(value), 'OK', value);
    assert.throws(() => status(value), Error, value);
  }
});
test('rejects unknown codes and messages', () => {
  for (let code = 0; code < 1000; code++) {
    if (upstream.message[code] === undefined) {
      assert.throws(() => status(code), /invalid status code/);
      assert.throws(() => status(String(code)), /invalid status/);
    }
  }
  for (const value of [NaN, Infinity, -Infinity, 200.5, '', 'not a reason', ' Not Found']) {
    assert.throws(() => status(value), /invalid status/);
  }
});
test('rejects wrong types without invoking conversion hooks', () => {
  const object = { [Symbol.toPrimitive]() { throw new Error('must not coerce'); } };
  for (const value of [undefined, null, true, 200n, Symbol('code'), object, new Number(200)]) {
    assert.throws(() => status(value), TypeError);
  }
});
test('lookup dictionaries have no inherited keys', () => {
  for (const name of ['message', 'code', 'redirect', 'empty', 'retry']) {
    assert.equal(Object.getPrototypeOf(status[name]), null);
    for (const key of ['constructor', '__proto__', 'toString']) assert.equal(status[name][key], undefined);
  }
  for (const key of ['constructor', '__proto__', 'toString']) assert.throws(() => status(key));
});
test('freezes tables, code list, and exported references against shared mutation', () => {
  for (const key of ['message', 'code', 'redirect', 'empty', 'retry', 'codes']) {
    assert.equal(Object.isFrozen(status[key]), true);
    assert.throws(() => { status[key] = {}; }, TypeError);
    assert.throws(() => { status[key][200] = 'changed'; }, TypeError);
  }
  assert.throws(() => status.codes.push(999), TypeError);
  assert.throws(() => { status.message[200] = 'changed'; }, TypeError);
  assert.equal(status(200), 'OK');
});
test('retains every result for generated valid inputs', () => {
  for (let i = 0; i < 2000; i++) {
    const code = upstream.codes[(i * 37) % upstream.codes.length];
    const value = i % 3 === 0 ? code : i % 3 === 1 ? String(code) : upstream.message[code];
    assert.equal(status(value), upstream(value));
  }
});
