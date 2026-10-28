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
