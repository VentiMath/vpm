'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, createSecretKey } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const fixture = '../test/fixtures/cookie-signature-1.2.2.cjs';
const baseline = 'cookie-signature 1.2.2';
const before = require(fixture);
const after = require('..');
const count = Number(process.env.COUNT || 10000);
const rounds = 9;
const secret = 'benchmark-only-secret';
const key = createSecretKey(Buffer.from(secret));
const cases = [];
function add(name, method, inputs, iterations = count) {
  for (const args of inputs) assert.equal(after[method](...args), before[method](...args), name);
  cases.push({ name, inputs, iterations, functions: [before[method], after[method]].map(fn => args => fn(...args)) });
}
add('sign short, string key', 'sign', [['session-123', secret], ['other-456', secret]]);
add('sign short, KeyObject', 'sign', [['session-123', key], ['other-456', key]]);
add('sign Unicode', 'sign', [['雪📚café', secret]]);
add('sign 4 KiB', 'sign', [['x'.repeat(4096), secret]], Math.min(count, 5000));
add('verify short, string key', 'unsign', [[before.sign('session-123', secret), secret]]);
add('verify short, KeyObject', 'unsign', [[before.sign('session-123', key), key]]);
add('verify Unicode', 'unsign', [[before.sign('雪📚café', secret), secret]]);
add('verify 4 KiB', 'unsign', [[before.sign('x'.repeat(4096), secret), secret]], Math.min(count, 5000));
add('verify 64 KiB', 'unsign', [[before.sign('x'.repeat(65536), secret), secret]], Math.min(count, 1000));
add('reject wrong key', 'unsign', [[before.sign('session-123', secret), 'wrong-secret']]);
add('reject malformed short', 'unsign', [['no-signature', secret]]);
add('reject malformed 64 KiB', 'unsign', [['x'.repeat(65536), secret]], Math.min(count, 1000));
let checksum = 0;
function measure(fn, inputs, iterations) {
  let sum = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = fn(inputs[i % inputs.length]);
    sum += result === false ? 1 : result.length;
  }
  checksum += sum;
  return (performance.now() - start) * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) measure(fn, entry.inputs, Math.min(entry.iterations, 2000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) measure(fn, entry.inputs, Math.min(entry.iterations, 5000));
  const samples = [[], []];
  for (let round = 0; round < rounds; round++) for (const i of round % 2 ? [1, 0] : [0, 1]) samples[i].push(measure(entry.functions[i], entry.inputs, entry.iterations));
  const medians = samples.map(values => values.slice().sort((a, b) => a - b)[4]);
  rows.push({ case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], vpmNs: medians[1], ratio: medians[1] / medians[0], samples });
}
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
const result = { date: '2026-10-27', runtime: process.versions, platform: process.platform, arch: process.arch, baseline,
  count, rounds, corpusWarmup: 'min(iterations, 2000)', caseWarmup: 'min(iterations, 5000)', units: 'nanoseconds/call',
  sourceSha256: hash('../index.js'), baselineSha256: hash(fixture), harnessSha256: hash('compare.cjs'), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: Math.round(row.upstreamNs), VPM: Math.round(row.vpmNs), ratio: row.ratio.toFixed(2) })));
console.log('Consumed checksum:', checksum, 'Nine alternating-order samples; individual calls, not application throughput.');
