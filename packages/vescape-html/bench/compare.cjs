'use strict';

const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const upstream = require('../test/fixtures/escape-html-1.0.3.cjs');
const replacement = require('..');

// Compare identical output on varied plain, sparse, dense, and Unicode inputs.
const cases = [
  ['short plain text', 'Cannot GET /missing-'],
  ['short redirect text', 'Redirecting to /?a=1&b='],
  ['short markup', '<p title="quoted">Hello & goodbye</p>'],
  ['2 KB plain text', 'plain text '.repeat(200)],
  ['2 KB, early escape', '<' + 'plain text '.repeat(200)],
  ['2 KB, late escape', 'plain text '.repeat(200) + '<'],
  ['2 KB, sparse escapes', ('<hello' + 'plain text '.repeat(20) + '>').repeat(10)],
  ['1 KB, dense escapes', '<&\'">'.repeat(200)],
  ['Unicode with escapes', '😀é你好&'.repeat(100)],
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
  results.push({ case: name, 'escape-html ns': Math.round(before), 'vescape-html ns': Math.round(after), 'vescape-html / escape-html': (after / before).toFixed(2) });
}
console.table(results);
console.log(`Checksum: ${checksum}. Results vary with runtime, warmup, and garbage collection.`);
