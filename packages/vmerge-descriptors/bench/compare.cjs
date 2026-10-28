'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const after = require('..');
const count = Number(process.env.COUNT || 50000);
const rounds = 9;
const cases = [];
function add(name, setup, iterations = count) {
  const functions = [before, after].map(setup);
  for (let i = 0; i < 10; i++) assert.equal(functions[0](i), functions[1](i), name);
  cases.push({ name, functions, iterations });
}
const fixture = '../test/fixtures/merge-descriptors-2.0.0.cjs';
const extraFixtures = [];
const baseline = 'merge-descriptors 2.0.0';
const before = require(fixture);
function properties(n) { return Object.fromEntries(Array.from({ length: n }, (_, i) => ['key' + i, i + 1])); }
for (const n of [0, 3, 20, 100]) {
  const source = properties(n);
  // Compare every descriptor before timing, including empty sources.
  assert.deepEqual(Object.getOwnPropertyDescriptors(after({}, source)), Object.getOwnPropertyDescriptors(before({}, source)));
  add('merge ' + n + ' data properties', merge => i => { const result = merge({}, source); return n ? result.key0 + result['key' + (n - 1)] : Number(typeof result === 'object'); }, n >= 100 ? Math.min(count, 5000) : count);
}
const accessors = Object.defineProperties({}, {
  first: { get() { return this.base + 1; }, enumerable: false, configurable: true },
  second: { get() { return this.base + 2; }, enumerable: true, configurable: true },
  third: { value: 3, writable: false, enumerable: false, configurable: true },
});
assert.deepEqual(Object.getOwnPropertyDescriptors(after({}, accessors)), Object.getOwnPropertyDescriptors(before({}, accessors)));
add('merge accessors and hidden fields', merge => i => { const result = merge({ base: i }, accessors); return result.first + result.second + result.third; });
const source20 = properties(20);
add('skip 20 existing fields', merge => { const destination = properties(20); return i => merge(destination, source20, false).key0; });
add('replace 20 existing fields', merge => { const destination = properties(20); return i => merge(destination, source20).key0; });
const methods = Object.fromEntries(Array.from({ length: 50 }, (_, i) => ['method' + i, function method() { return i; }]));
add('mix 50 methods into a function', merge => i => { const app = function app() {}; merge(app, methods, false); return app.method0() + app.method49(); }, Math.min(count, 5000));

let checksum = 0;
function measure(fn, iterations) {
  let sum = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) sum += fn(i);
  checksum += sum;
  return (performance.now() - start) * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) measure(fn, Math.min(entry.iterations, 2000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) measure(fn, Math.min(entry.iterations, 5000));
  const samples = [[], []];
  for (let round = 0; round < rounds; round++) for (const i of round % 2 ? [1, 0] : [0, 1]) samples[i].push(measure(entry.functions[i], entry.iterations));
  const medians = samples.map(values => values.slice().sort((a, b) => a - b)[4]);
  rows.push({ case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], vpmNs: medians[1], ratio: medians[1] / medians[0], samples });
}
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
const result = { date: '2026-10-27', runtime: process.versions, platform: process.platform, arch: process.arch, baseline,
  count, rounds, corpusWarmup: 'min(iterations, 2000)', caseWarmup: 'min(iterations, 5000)', units: 'nanoseconds/call',
  sourceSha256: hash('../index.js'), baselineSha256: hash(fixture), harnessSha256: hash('compare.cjs'),
  additionalBaselineHashes: Object.fromEntries(extraFixtures.map(file => [file, hash(file)])), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: Math.round(row.upstreamNs), VPM: Math.round(row.vpmNs), ratio: row.ratio.toFixed(2) })));
console.log('Consumed checksum:', checksum, 'Nine alternating-order samples; individual operations, not application throughput.');
