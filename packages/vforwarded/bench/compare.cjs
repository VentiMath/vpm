'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const before = require('../test/fixtures/forwarded-0.2.0.cjs');
const after = require('..');
const count = Number(process.env.COUNT || 100000);
const rounds = 12;
const cases = [];
const request = header => ({ headers: header === undefined ? {} : { 'x-forwarded-for': header }, socket: { remoteAddress: '127.0.0.1' } });
function add(name, inputs, iterations = count, corrected = false) {
  for (const input of inputs) {
    const expected = corrected
      ? [input.socket.remoteAddress, ...input.headers['x-forwarded-for'].split(',').map(value => value.replace(/^[ \t]+|[ \t]+$/g, '')).filter(Boolean).reverse()]
      : before(input);
    assert.deepEqual(after(input), expected, name);
  }
  cases.push({ name, inputs, iterations, functions: [corrected ? null : before, after] });
}
add('no forwarded header', [request()]);
add('empty header', [request('')]);
add('one IPv4 address', [request('198.51.100.7'), request('203.0.113.9')]);
add('one IPv6 address', [request('2001:db8:1234:5678:abcd:ef01:2345:6789')]);
add('two proxy entries', [request('198.51.100.7, 10.0.0.1')]);
add('three proxy entries', [request('198.51.100.7, 10.0.0.1, 10.0.0.2')]);
add('ten proxy entries', [request(Array.from({ length: 10 }, (_, i) => '192.0.2.' + i).join(', '))]);
add('100 proxy entries', [request(Array.from({ length: 100 }, (_, i) => '192.0.2.' + i).join(', '))], Math.min(count, 10000));
add('empty entries and spaces', [request(' , 198.51.100.7 , , 10.0.0.1 , , ')]);
add('legacy connection fallback', [{ headers: { 'x-forwarded-for': '198.51.100.7' }, connection: { remoteAddress: '127.0.0.1' } }]);
add('unavailable socket address', [{ headers: { 'x-forwarded-for': '198.51.100.7' }, socket: {} }]);
add('16 KiB opaque token', [request('x'.repeat(16384))], Math.min(count, 2000));
add('8 KiB whitespace', [request(' '.repeat(8192))], Math.min(count, 2000));
// Upstream returns different values here; do not present a speed ratio against
// an implementation that fails the required result.
add('tab whitespace (corrected output)', [request('198.51.100.7\t,\t10.0.0.1\t, \t , 10.0.0.2')], count, true);

let checksum = 0;
function measure(fn, inputs, iterations) {
  let sum = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = fn(inputs[i % inputs.length]);
    sum += result.length;
    // Consume every returned entry, including arrays from longer chains.
    for (const address of result) if (address !== undefined) sum += address.length;
  }
  checksum += sum;
  return (performance.now() - start) * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) if (fn) measure(fn, entry.inputs, Math.min(entry.iterations, 2000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) if (fn) measure(fn, entry.inputs, Math.min(entry.iterations, 5000));
  const samples = [[], []];
  for (let round = 0; round < rounds; round++) for (const index of round % 2 ? [1, 0] : [0, 1]) {
    if (entry.functions[index]) samples[index].push(measure(entry.functions[index], entry.inputs, entry.iterations));
  }
  const medians = samples.map(values => {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    return (sorted[5] + sorted[6]) / 2;
  });
  rows.push({ case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], vpmNs: medians[1], ratio: medians[0] === null ? null : medians[1] / medians[0], samples });
}
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
const recordedAt = new Date().toISOString();
const result = { date: recordedAt.slice(0, 10), recordedAt, runtime: process.versions, platform: process.platform, arch: process.arch,
  baseline: 'forwarded 0.2.0', count, rounds, sampleOrder: 'alternating upstream/VPM and VPM/upstream',
  corpusWarmup: 'min(iterations, 2000)', caseWarmup: 'min(iterations, 5000)', units: 'nanoseconds/call including result consumption',
  sourceSha256: hash('../index.js'), baselineSha256: hash('../test/fixtures/forwarded-0.2.0.cjs'), harnessSha256: hash('compare.cjs'), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: row.upstreamNs === null ? 'n/a' : Math.round(row.upstreamNs), VPM: Math.round(row.vpmNs), ratio: row.ratio === null ? 'n/a' : row.ratio.toFixed(2) })));
console.log('Consumed checksum:', checksum, 'Twelve alternating-order samples; individual calls, not application throughput.');
