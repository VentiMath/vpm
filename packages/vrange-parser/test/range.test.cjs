'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const parse = require('..');
const upstream = require('./fixtures/range-parser-1.2.1.cjs');

function ranges(...pairs) { const result = pairs.map(([start, end]) => ({ start, end })); result.type = 'bytes'; return result; }

test('matches ordinary closed, open-ended, suffix, and unsatisfiable ranges', () => {
  for (const size of [0, 1, 10, 1000, Number.MAX_SAFE_INTEGER]) {
    for (const value of ['bytes=0-0', 'bytes=0-', 'bytes=1-8', 'bytes=9-999', 'bytes=10-5', 'bytes=-0',
      'bytes=0-3,6-9', 'bytes=6-9,0-3', 'bytes=0-4,4-9', 'bytes=5-9,0-4', 'bytes=9999-']) {
      for (const combine of [false, true]) assert.deepEqual(parse(size, value, { combine }), upstream(size, value, { combine }));
    }
    if (size > 0) assert.deepEqual(parse(size, 'bytes=-1'), upstream(size, 'bytes=-1'));
  }
});

test('oversized suffixes select the entire nonempty representation', () => {
  assert.deepEqual(parse(10, 'bytes=-100'), ranges([0, 9]));
  assert.deepEqual(parse(10, 'bytes=-' + '9'.repeat(400)), ranges([0, 9]));
  assert.equal(parse(0, 'bytes=-100'), -1);
});

test('clamps arbitrarily large decimal endpoints before arithmetic', () => {
  const huge = '9'.repeat(400);
  assert.deepEqual(parse(10, 'bytes=0-' + huge), ranges([0, 9]));
  assert.equal(parse(10, 'bytes=' + huge + '-'), -1);
  assert.deepEqual(parse(Number.MAX_SAFE_INTEGER, 'bytes=9007199254740990-' + huge), ranges([9007199254740990, 9007199254740990]));
  assert.deepEqual(parse(10, 'bytes=0002-0004'), ranges([2, 4]));
});

test('rejects malformed numeric members instead of accepting partial parseInt results', () => {
  for (const part of ['1junk-3', '0-2junk', '1.5-3', '+1-3', '0x1-3', '1e2-3', '1--3', '1-2-3', '-',
    '1 -2', '1- 2', 'a-2', '1-2\n', '1-2\r']) {
    assert.equal(parse(100, 'bytes=' + part), -2, part);
    assert.equal(parse(100, 'bytes=0-0,' + part), -2, part);
  }
});

test('validates range units, preserves generic units, and tolerates HTTP list whitespace', () => {
  assert.deepEqual(parse(10, 'Bytes=\t0-1, , 4-5\t,'), ranges([0, 1], [4, 5]));
  assert.equal(parse(10, 'items=0-1').type, 'items');
  for (const input of ['', 'bytes', '=0-1', 'bytes =0-1', 'bytes\n=0-1', 'bytes=', 'bytes= , ', 'bytes=0-1,\n']) {
    assert.equal(parse(10, input), -2, input);
  }
});

test('combines overlapping and adjacent ranges in earliest contributing input order', () => {
  assert.deepEqual(parse(30, 'bytes=5-6,20-21,0-9', { combine: true }), ranges([0, 9], [20, 21]));
  assert.deepEqual(parse(30, 'bytes=20-21,5-6,0-9', { combine: true }), ranges([20, 21], [0, 9]));
  assert.deepEqual(parse(30, 'bytes=0-4,5-9,3-6', { combine: true }), ranges([0, 9]));
  assert.deepEqual(parse(30, 'bytes=0-4,0-4', { combine: true }), ranges([0, 4]));
});

test('validates representation sizes without unsafe integer rounding', () => {
  for (const size of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '10', 10n, undefined]) {
    assert.throws(() => parse(size, 'bytes=0-1'), TypeError);
  }
  for (const value of [null, undefined, 1, {}]) assert.throws(() => parse(10, value), TypeError);
});

test('matches a byte-set model across 2000 generated range sets with combining', () => {
  let seed = 321;
  function next(n) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; }
  for (let trial = 0; trial < 2000; trial++) {
    const size = next(100) + 1; const expected = new Set(); const parts = [];
    for (let count = next(8) + 1; count > 0; count--) {
      const start = next(150); const end = start + next(100);
      parts.push(start + '-' + end);
      for (let i = start; i <= end && i < size; i++) expected.add(i);
    }
    const parsed = parse(size, 'bytes=' + parts.join(','), { combine: true });
    if (!expected.size) { assert.equal(parsed, -1); continue; }
    const actual = new Set();
    for (const { start, end } of parsed) for (let i = start; i <= end; i++) {
      assert.equal(actual.has(i), false); actual.add(i);
    }
    assert.deepEqual([...actual].sort((a, b) => a - b), [...expected].sort((a, b) => a - b));
  }
});
