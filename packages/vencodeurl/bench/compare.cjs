'use strict';

const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const upstream = require('../test/fixtures/encodeurl-2.0.0.cjs');
const replacement = require('..');

// These cases have identical outputs in both implementations. Corrected error
// cases are covered by tests and are not compared as equivalent work here.
const cases = [
  ['short plain URL', '/items/item-'],
  ['already encoded', '/a%20b?next=%2Fhome&id='],
  ['spaces and markup', '/a b <tag> "quoted"/'],
  ['Unicode', '/café/你好/😀/'],
  ['2 KB plain path', '/segment'.repeat(256)],
  ['many existing escapes', '/%20%2F%aB%FF'.repeat(32)],
];
const implementations = [upstream, replacement];
let checksum = 0;
function measure(encode, inputs, count) {
  let consumed = 0;
  const start = performance.now();
  for (let i = 0; i < count; i++) consumed += encode(inputs[i % inputs.length]).length;
  const elapsed = performance.now() - start;
  checksum += consumed;
  return elapsed * 1e6 / count;
}
function median(values) {
  return values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

console.log(`Runtime: ${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version}`);
console.log('Median nanoseconds/call across 7 samples of 50,000 calls; lower is better.');
const results = [];
for (const [name, prefix] of cases) {
  const inputs = Array.from({ length: 32 }, (_, i) => prefix + i);
  for (const input of inputs) assert.equal(replacement(input), upstream(input));
  for (const encode of implementations) measure(encode, inputs, 10000);
  const samples = [[], []];
  for (let round = 0; round < 7; round++) {
    for (const index of round % 2 ? [1, 0] : [0, 1]) {
      samples[index].push(measure(implementations[index], inputs, 50000));
    }
  }
  const before = median(samples[0]);
  const after = median(samples[1]);
  results.push({ case: name, 'encodeurl ns': Math.round(before), 'vencodeurl ns': Math.round(after), 'vencodeurl / encodeurl': (after / before).toFixed(2) });
}
console.table(results);
console.log(`Checksum: ${checksum}. Results vary with runtime, warmup, and garbage collection.`);
