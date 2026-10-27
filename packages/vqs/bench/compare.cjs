'use strict';
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const upstream = require('../test/upstream.cjs');
const vpm = require('..');
const flat = Object.fromEntries(Array.from({ length: 20 }, (_, i) => ['field' + i, 'value' + i]));
const nested = { user: { name: 'Ada', address: { city: 'London', zip: '12345' } }, tags: ['math', 'code'], active: true };
const unicode = { title: 'café 日本 💩'.repeat(20), message: 'hello & world = ?'.repeat(20) };
const large = { items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: 'item ' + i })) };
const cases = [
  ['parse / short flat', 'parse', 'a=1&b=two&c=hello+world'],
  ['parse / 20 fields', 'parse', upstream.stringify(flat)],
  ['parse / nested arrays', 'parse', upstream.stringify(nested)],
  ['parse / Unicode', 'parse', upstream.stringify(unicode)],
  ['parse / repeated conflicts', 'parse', 'a[b]=x&a=y&a=z&a[c]=q&a[]=r&a[0]=s'],
  ['parse / strict limits', 'parse', upstream.stringify(nested), { depth: 5, parameterLimit: 100, arrayLimit: 20, strictDepth: true, throwOnLimitExceeded: true }],
  ['stringify / short flat', 'stringify', { a: '1', b: 'two', c: 'hello world' }],
  ['stringify / 20 fields', 'stringify', flat],
  ['stringify / nested arrays', 'stringify', nested],
  ['stringify / Unicode', 'stringify', unicode],
  ['stringify / WHATWG', 'stringify', unicode, { format: 'WHATWG' }],
  ['stringify / lone surrogates', 'stringify', { value: 'before\ud800middle\udfffend' }],
  ['stringify / 100 objects', 'stringify', large],
  ['stringify / comma array', 'stringify', { a: Array.from({ length: 20 }, (_, i) => 'item ' + i) }, { arrayFormat: 'comma' }],
];
let sink = 0;
function sample(implementation, method, input, options, count) {
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    const value = implementation[method](input, options);
    sink += method === 'stringify' ? value.length : value !== null ? 1 : 0;
  }
  return (performance.now() - start) * 1e6 / count;
}
const results = [];
for (const [name, method, input, options] of cases) {
  assert.deepEqual(vpm[method](input, options), upstream[method](input, options), name);
  for (const implementation of [upstream, vpm]) sample(implementation, method, input, options, 5000);
  const values = [[], []];
  for (let round = 0; round < 9; round++) {
    for (const index of round % 2 ? [1, 0] : [0, 1]) {
      values[index].push(sample([upstream, vpm][index], method, input, options, 10000));
    }
  }
  const medians = values.map(list => Math.round(list.sort((a, b) => a - b)[4]));
  results.push({ name, upstreamNs: medians[0], vpmNs: medians[1], changePercent: +(100 * (medians[1] / medians[0] - 1)).toFixed(1), samplesNs: values });
  console.error(`${name}: ${medians[0]} → ${medians[1]} ns (${results.at(-1).changePercent}%)`);
}
assert.ok(sink > 0);
console.log(JSON.stringify({ runtime: process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version, upstream: 'qs 6.17.0, published CommonJS sources and 18 pinned runtime dependencies', methodology: 'Median of 9 alternating samples of 10,000 calls; 5,000 warmup calls per implementation per case. Output parity asserted first.', results }, null, 2));
