'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const after = require('..');
const previousFile = './vonce-7744a9e.cjs';
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
const fixture = '../test/fixtures/once-1.4.0.cjs';
const extraFixtures = ['../test/fixtures/wrappy-1.0.2.cjs', '../test/fixtures/load-once.cjs'];
const baseline = 'once 1.4.0 with wrappy 1.0.2';
const before = require('../test/fixtures/load-once.cjs');
function callback(n) { return n + 1; }
const decorated = Object.assign(function callback(n) { return n + 1; }, { label: 'callback', count: 2, enabled: true });
add('create wrapper', once => i => { const wrapped = once(callback); return Number(wrapped.called) + Number(typeof wrapped === 'function'); });
add('create and first call', once => i => once(callback)(i));
add('create, first and cached call', once => i => { const wrapped = once(callback); wrapped(i); return wrapped(i + 1); });
add('create with three metadata fields', once => i => { const wrapped = once(decorated); return wrapped(i) + wrapped.count; });
add('create strict and first call', once => i => once.strict(callback)(i));
add('cached call', once => { const wrapped = once(callback); wrapped(3); return i => wrapped(i); }, count * 20);
add('cached strict rejection', once => { const wrapped = once.strict(callback); wrapped(3); return i => { try { wrapped(i); } catch (error) { return error.message.length; } throw new Error('expected strict rejection'); }; }, Math.min(count, 10000));

// Retaining callbacks prevents allocation elimination in this construction case.
add('create and retain wrappers', once => {
  const retained = new Array(1024);
  return i => { const wrapped = once(callback); retained[i & 1023] = wrapped; return Number(wrapped.called) + Number(typeof retained[i & 1023] === 'function'); };
});
const hidden = function (n) { return n + 1; };
for (let i = 0; i < 100; i++) Object.defineProperty(hidden, 'hidden' + i, { value: i });
add('create with 100 hidden metadata fields', once => i => once(hidden)(i));
const firstSymbol = Symbol(), secondSymbol = Symbol();
const symbolic = Object.assign(n => n + 1, { [firstSymbol]: 2, [secondSymbol]: 3 });
add('create with two symbol metadata fields', once => i => { const wrapped = once(symbolic); return wrapped(i) + wrapped[firstSymbol] + wrapped[secondSymbol]; }, count, true);

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
