'use strict';
// Deterministic JSON trees verify values and sharing against the public helper.
const assert = require('node:assert/strict');
(async () => {
  const original = await import('@tanstack/query-core');
  const replacement = await import('../../packages/vtanstack-query-core/query-client.js');
  let seed = 713;
  const random = n => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n;};
  const value = depth => {
    if (!depth) return [null, true, false, random(100), 'value-' + random(10)][random(5)];
    if (random(2)) return Array.from({length: random(5)}, () => value(depth - 1));
    return Object.fromEntries(Array.from({length: random(5)}, (_, i) => ['key' + i, value(depth - 1)]));
  };
  function sharing(before, left, right) {
    assert.deepEqual(left, right);
    assert.equal(Object.is(left, before), Object.is(right, before));
    if (left && right && typeof left === 'object' && typeof right === 'object') {
      for (const key of Object.keys(left)) sharing(before?.[key], left[key], right[key]);
    }
  }
  for (let i = 0; i < 2000; i++) {
    const before = value(3), after = i % 2 ? structuredClone(before) : value(3);
    sharing(before, original.replaceEqualDeep(before, after), replacement.replaceEqualDeep(before, after));
  }
  console.log('2,000 JSON tree comparisons preserve values and unchanged reference sharing.');
})().catch(error => {console.error(error); process.exitCode = 1;});
