'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const after = require('..');
const previousFile = './vmerge-descriptors-7744a9e.cjs';
const previous = require(previousFile);
const count = Number(process.env.COUNT || 50000);
const rounds = 12;
const orders = [[0, 1, 2], [2, 1, 0], [1, 2, 0], [0, 2, 1], [2, 0, 1], [1, 0, 2]];
const cases = [];
function add(name, setup, iterations = count, vpmOnly = false) {
  const functions = [vpmOnly ? null : before, previous, after].map(fn => fn && setup(fn));
  for (let i = 0; i < 10; i++) {
    const expected = (functions[0] || functions[1])(i);
    assert.equal(functions[1](i), expected, name);
    assert.equal(functions[2](i), expected, name);
  }
  cases.push({ name, functions, iterations, vpmOnly });
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

// Upstream omits symbol keys, so these compare only the two VPM implementations.
const symbols = Array.from({ length: 20 }, () => Symbol());
const symbolic = Object.fromEntries(symbols.map((key, i) => [key, i + 1]));
add('merge 20 symbol properties', merge => i => merge({}, symbolic)[symbols[0]], count, true);
const mixed = { ...source20, ...symbolic };
add('merge 20 strings and 20 symbols', merge => i => merge({}, mixed).key0, Math.min(count, 10000), true);
const proxied = new Proxy(source20, {});
add('merge 20 properties from a proxy', merge => i => merge({}, proxied).key0, Math.min(count, 10000));

let checksum = 0;
function measure(fn, iterations) {
  let sum = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) sum += fn(i);
  checksum += sum;
  return (performance.now() - start) * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) if (fn) measure(fn, Math.min(entry.iterations, 2000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) if (fn) measure(fn, Math.min(entry.iterations, 5000));
  const samples = [[], [], []];
  for (let round = 0; round < rounds; round++) for (const i of orders[round % orders.length]) if (entry.functions[i]) samples[i].push(measure(entry.functions[i], entry.iterations));
  const medians = samples.map(values => { if (!values.length) return null; const sorted = values.slice().sort((a, b) => a - b); return (sorted[5] + sorted[6]) / 2; });
  rows.push({ case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], previousNs: medians[1], vpmNs: medians[2], ratio: entry.vpmOnly ? null : medians[2] / medians[0], previousRatio: medians[2] / medians[1], samples });
}
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
const recordedAt = new Date().toISOString();
const result = { date: recordedAt.slice(0, 10), recordedAt, runtime: process.versions, platform: process.platform, arch: process.arch, baseline,
  count, rounds, sampleOrder: orders, previousCommit: '7744a9ee18a03ea3720a940b660990eb9727c913', previousSha256: hash(previousFile), corpusWarmup: 'min(iterations, 2000)', caseWarmup: 'min(iterations, 5000)', units: 'nanoseconds/call',
  sourceSha256: hash('../index.js'), baselineSha256: hash(fixture), harnessSha256: hash('compare.cjs'),
  additionalBaselineHashes: Object.fromEntries(extraFixtures.map(file => [file, hash(file)])), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: row.upstreamNs === null ? 'n/a' : Math.round(row.upstreamNs), previous: Math.round(row.previousNs), VPM: Math.round(row.vpmNs), vsPrevious: row.previousRatio.toFixed(2), vsUpstream: row.ratio === null ? 'n/a' : row.ratio.toFixed(2) })));
console.log('Consumed checksum:', checksum, 'Twelve samples rotating through all six implementation orders; individual operations, not application throughput.');
