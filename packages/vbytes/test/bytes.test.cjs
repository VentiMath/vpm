'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const bytes = require('..');
const upstream = require('./fixtures/bytes-3.1.2.cjs');
const factors = [1, 1024, 1048576, 1073741824, 1099511627776, 1125899906842624];
const units = ['b', 'kb', 'mb', 'gb', 'tb', 'pb'];

test('the upstream comparison fixture matches its recorded digest', () => {
  const metadata = require('./fixtures/UPSTREAM.json');
  assert.equal(createHash('sha256').update(readFileSync(require.resolve('./fixtures/bytes-3.1.2.cjs'))).digest('hex'), metadata.sha256);
});

test('ordinary signed binary sizes agree with bytes 3.1.2', () => {
  for (let index = 0; index < units.length; index++) {
    for (const number of ['0', '-0', '1', '+1', '2', '7', '-2']) {
      for (const unit of [units[index], units[index].toUpperCase()]) {
        assert.equal(bytes.parse(number + ' ' + unit), upstream.parse(number + ' ' + unit));
      }
    }
    if (index > 0) for (const number of ['0.125', '1.5', '-1.5', '+2.25']) {
      assert.equal(bytes.parse(number + units[index]), upstream.parse(number + units[index]));
    }
  }
  for (const value of [0, -0, 1, -1, 1.5, -1.5, Number.MAX_SAFE_INTEGER]) assert.equal(bytes.parse(value), value);
  for (const value of ['0', '-0', '123', '-123', '+123', '00123']) assert.equal(bytes.parse(value), upstream.parse(value));
});

test('only absent input returns null; malformed supplied input throws without coercion', () => {
  for (const value of [null, undefined]) assert.equal(bytes.parse(value), null);
  const hostile = { toString() { throw new Error('coercion'); }, valueOf() { throw new Error('coercion'); } };
  for (const value of ['', ' ', '100kbjunk', '1e3', '0x10', '1KiB', '1XB', '1KB\n', '1\tKB', '1 KB\r', '\n1kb', '.5kb', '1.kb', '--1', '1 2', 'NaN', 'Infinity', [], {}, true, hostile]) {
    assert.throws(() => bytes.parse(value), TypeError);
  }
  assert.equal(upstream.parse('100kbjunk'), 100);
  assert.equal(upstream.parse('1e3'), 1);
});

test('complete bare decimal sizes, B suffixes and outer ASCII spaces are supported', () => {
  for (const [value, expected] of [[' 1.5 KB ', 1536], ['1.9', 1], ['-1.9', -2], ['1.9b', 1], ['-1.9 B', -2], ['  +00012  ', 12]]) {
    assert.equal(bytes.parse(value), expected);
  }
});

test('exact decimal scaling avoids floating-point rounding across byte boundaries', () => {
  assert.equal(bytes.parse('0.99999999999999999999kb'), 1023);
  assert.equal(upstream.parse('0.99999999999999999999kb'), 1024);
  assert.equal(bytes.parse('-1.00000000000000000001kb'), -1025);
  assert.equal(bytes.parse('7.999999999999999999999999pb'), Number.MAX_SAFE_INTEGER);
  assert.equal(bytes.parse('9007199254740991.99b'), Number.MAX_SAFE_INTEGER);
  assert.throws(() => bytes.parse('-9007199254740991.01b'), RangeError);
  assert.equal(bytes.parse('0.' + '0'.repeat(10000) + '1pb'), 0);
  assert.equal(bytes.parse('-0.' + '0'.repeat(10000) + '1pb'), -1);
});

test('numeric and parsed bounds are explicit', () => {
  for (const value of [NaN, Infinity, -Infinity, 2 ** 53, -(2 ** 53), '9007199254740992', '-9007199254740992', '8pb', '9'.repeat(10000) + 'kb']) {
    assert.throws(() => bytes.parse(value), RangeError);
  }
  assert.equal(bytes.parse('9007199254740991'), Number.MAX_SAFE_INTEGER);
  assert.equal(bytes.parse('-9007199254740991'), -Number.MAX_SAFE_INTEGER);
});

test('generated decimal parses agree with an independent full-precision rational oracle', () => {
  let seed = 7812;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let i = 0; i < 12000; i++) {
    const index = next() % 6, negative = Boolean(next() % 2), whole = next() % 9;
    const digits = Array.from({ length: 1 + next() % 90 }, () => next() % 10).join('');
    const numerator = BigInt(String(whole) + digits) * BigInt(factors[index]);
    const denominator = 10n ** BigInt(digits.length);
    const expected = negative ? -(numerator / denominator) - (numerator % denominator ? 1n : 0n) : numerator / denominator;
    const input = (negative ? '-' : '') + whole + '.' + digits + units[index];
    if (expected < -9007199254740991n || expected > 9007199254740991n) assert.throws(() => bytes.parse(input), RangeError, input);
    else assert.equal(bytes.parse(input), Number(expected), input);
  }
});

test('ordinary formatting, dispatch and fixed precision agree with upstream', () => {
  const options = [undefined, {}, { fixedDecimals: true }, { decimalPlaces: 0 }, { decimalPlaces: 2 }, { unit: 'kb' }, { unit: 'B', thousandsSeparator: ',' }, { unitSeparator: ' ', fixedDecimals: true, decimalPlaces: 6 }];
  for (const value of [0, -0, 1, -1, 1023, 1024, 1234567, -1234567, 2 ** 30, 2 ** 40, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
    for (const option of options) {
      assert.equal(bytes.format(value, option), upstream.format(value, option));
      assert.equal(bytes(value, option), bytes.format(value, option));
    }
  }
  assert.equal(bytes('1kb'), 1024);
  for (const value of [null, undefined, {}, true]) assert.equal(bytes(value), null);
  for (const value of [NaN, Infinity, -Infinity, '1', {}]) assert.equal(bytes.format(value), null);
});

test('generated formatting comparisons preserve ordinary defaults', () => {
  let seed = 31212;
  for (let i = 0; i < 10000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = (seed - 2147483648) * 1024;
    for (const options of [undefined, { unit: 'KB', thousandsSeparator: ',', decimalPlaces: 2 }, { fixedDecimals: true, decimalPlaces: 8 }]) {
      assert.equal(bytes.format(value, options), upstream.format(value, options));
    }
  }
});

test('trailing zero trimming works with interior zeroes', () => {
  assert.equal(bytes.format(1.01, { unit: 'B', decimalPlaces: 4 }), '1.01B');
  assert.equal(upstream.format(1.01, { unit: 'B', decimalPlaces: 4 }), '1.0100B');
  assert.equal(bytes.format(1.01, { unit: 'B', decimalPlaces: 4, fixedDecimals: true }), '1.0100B');
});

test('group separators are literal and never affect fractional or exponent digits', () => {
  for (const separator of ['$&', "$'", '$`', '$$', ',', '.', ' ', '💧']) {
    assert.equal(bytes.format(-1234567.125, { unit: 'B', decimalPlaces: 3, thousandsSeparator: separator }), '-1' + separator + '234' + separator + '567.125B');
  }
  assert.equal(bytes.format(1e25, { unit: 'B', thousandsSeparator: ',' }), '1e+25B');
});

test('format options are validated without implicit coercion or inherited keys', () => {
  for (const unit of ['constructor', '__proto__', 'toString', 'XB', 'KB\n', 1, {}]) assert.throws(() => bytes.format(1024, { unit }), TypeError);
  assert.equal(upstream.format(1024, { unit: 'constructor' }), 'NaNconstructor');
  for (const decimalPlaces of [-1, 101, 1.5, NaN, Infinity, '2', {}]) assert.throws(() => bytes.format(1, { decimalPlaces }), RangeError);
  for (const options of [true, 1, 'KB', []]) assert.throws(() => bytes.format(1, options), TypeError);
  for (const options of [{ fixedDecimals: 1 }, { thousandsSeparator: 1 }, { unitSeparator: {} }]) assert.throws(() => bytes.format(1, options), TypeError);
  assert.equal(bytes.format(1.25, { decimalPlaces: null }), '1.25B');
  assert.equal(bytes.format(1024, Object.create({ unit: 'constructor', decimalPlaces: -1 })), '1KB');
  assert.equal(bytes.format(1, { decimalPlaces: 100, fixedDecimals: true }), '1.' + '0'.repeat(100) + 'B');
  const reads = [];
  const options = Object.fromEntries(['decimalPlaces', 'fixedDecimals', 'unit', 'unitSeparator', 'thousandsSeparator'].map(name => [name, undefined]));
  for (const name of Object.keys(options)) Object.defineProperty(options, name, { get() { reads.push(name); return undefined; } });
  assert.equal(bytes.format(1024, options), '1KB');
  assert.equal(reads.length, 5); assert.equal(new Set(reads).size, 5);
});

test('frozen CommonJS and native ESM entry points share the API', async () => {
  assert.equal(Object.isFrozen(bytes), true);
  const esm = await import('../index.js');
  assert.equal(esm.default, bytes); assert.equal(esm.parse, bytes.parse); assert.equal(esm.format, bytes.format);
});
