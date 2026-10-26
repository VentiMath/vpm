'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const ms = require('..');
const upstream = require('./fixtures/ms-2.1.3.cjs');
const units = [
  ['ms msec msecs millisecond milliseconds', 1], ['s sec secs second seconds', 1000],
  ['m min mins minute minutes', 60000], ['h hr hrs hour hours', 3600000],
  ['d day days', 86400000], ['w week weeks', 604800000], ['y yr yrs year years', 31557600000],
];
test('parses all unit aliases, case variants, decimals, and negative durations', () => {
  for (const [names, scale] of units) for (const unit of names.split(' ')) {
    for (const number of ['0', '1', '-1', '.5', '-.5', '12.25', '0002']) {
      for (const spelling of [unit, unit.toUpperCase()]) {
        for (const gap of ['', ' ', '   ']) {
          const value = number + gap + spelling;
          assert.equal(ms(value), Number(number) * scale, value);
          assert.equal(ms(value), upstream(value), value);
        }
      }
    }
  }
});
test('keeps bare numbers, trailing spaces without a unit, and year/week semantics', () => {
  for (const input of ['123', '1.5', '-.5', '1 ', '1   ', '2 weeks', '1 year']) {
    assert.equal(ms(input), upstream(input));
  }
});
test('returns undefined for unrecognized strings and inputs over 100 characters', () => {
  for (const input of [' ', 'nope', '1e3', '+1s', '1.', ' 1s', '1s ', '1\ts', '1s2', 'Infinity', '1'.repeat(101)]) {
    assert.equal(ms(input), undefined, input);
  }
  assert.equal(ms('0'.repeat(99) + '1'), 1);
});
test('preserves rejection of terminal line breaks', () => {
  for (const input of ['1s\n', '1s\r', '1s\u2028', '1s\u2029']) {
    assert.equal(upstream(input), undefined);
    assert.equal(ms(input), undefined);
  }
});
test('preserves positive formatting at unit boundaries and fractional milliseconds', () => {
  for (const value of [0, .25, 999, 1000, 1499, 1500, 59999, 60000, 90000, 3600000, 5400000, 86400000, 129600000, Number.MAX_VALUE]) {
    for (const long of [false, true]) assert.equal(ms(value, { long }), upstream(value, { long }));
  }
});
test('rounds negative halves symmetrically and derives pluralization from the rounded value', () => {
  assert.equal(upstream(-1500, { long: true }), '-1 seconds');
  for (const [value, short, long] of [[-1500, '-2s', '-2 seconds'], [-90000, '-2m', '-2 minutes'], [-5400000, '-2h', '-2 hours'], [-129600000, '-2d', '-2 days']]) {
    assert.equal(ms(value), short);
    assert.equal(ms(value, { long: true }), long);
  }
  assert.equal(ms(-1499, { long: true }), '-1 second');
  assert.equal(ms(-.25), '-0.25ms');
  assert.equal(ms(-0), '0ms');
});
test('throws a stable TypeError for invalid types and non-finite numbers', () => {
  for (const value of ['', undefined, null, true, 1n, Symbol('x'), {}, NaN, Infinity, -Infinity]) {
    assert.throws(() => ms(value), { name: 'TypeError', message: 'value must be a non-empty string or a finite number' });
  }
});
test('invalid input validation does not serialize objects or invoke toJSON', () => {
  let touched = false;
  const circular = {}; circular.self = circular;
  const custom = { toJSON() { touched = true; throw new Error('unexpected'); } };
  assert.throws(() => ms(circular), TypeError);
  assert.throws(() => ms(custom), TypeError);
  assert.equal(touched, false);
});
test('matches upstream for generated ordinary strings and nonnegative formats', () => {
  let seed = 0x2718abcd;
  function random(max) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % max; }
  const suffixes = units.flatMap(([names]) => names.split(' '));
  for (let i = 0; i < 3000; i++) {
    const value = random(1e9) / 10;
    const text = value + ' ' + suffixes[random(suffixes.length)];
    assert.equal(ms(text), upstream(text));
    for (const long of [false, true]) {
      assert.equal(ms(value, { long }), upstream(value, { long }));
      if (value !== 0) assert.equal(ms(-value, { long }), '-' + ms(value, { long }));
    }
  }
});
