'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = async () => (await import(path.join(__dirname, '../index.js'))).default;

test('returns the same result for the same object', async () => {
  const weakMemoize = await load();
  let calls = 0;
  const wrap = weakMemoize(() => ({calls: ++calls}));
  const key = {};
  assert.equal(wrap(key), wrap(key));
  assert.notEqual(wrap({}), wrap(key));
  const nothing = weakMemoize(() => { calls++; });
  const other = {};
  nothing(other);
  nothing(other);
  assert.equal(calls, 3);
});
