'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = async () => (await import(path.join(__dirname, '../index.js'))).default;

test('computes each argument once', async () => {
  const memoize = await load();
  let calls = 0;
  const upper = memoize(value => (calls++, value.toUpperCase()));
  assert.equal(upper('a'), 'A');
  assert.equal(upper('a'), 'A');
  assert.equal(upper('__proto__'), '__PROTO__');
  assert.equal(upper('constructor'), 'CONSTRUCTOR');
  assert.equal(calls, 3);
});

test('caches undefined results too', async () => {
  const memoize = await load();
  let calls = 0;
  const nothing = memoize(() => { calls++; });
  nothing('a');
  nothing('a');
  assert.equal(calls, 1);
});
