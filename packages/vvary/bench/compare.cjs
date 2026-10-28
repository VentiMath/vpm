'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const fixture = '../test/fixtures/vary-1.1.2.cjs';
const baseline = 'vary 1.1.2';
const before = require(fixture);
const after = require('..');
const count = Number(process.env.COUNT || 50000);
const rounds = 9;
const cases = [];
function add(name, inputs, iterations = count) {
  for (const args of inputs) assert.equal(after.append(...args), before.append(...args), name);
  cases.push({ name, inputs, iterations, functions: [before.append, after.append].map(fn => args => fn(...args)) });
}
add('append first field', [['', 'Accept'], ['', 'Origin']]);
add('append second field', [['Accept', 'Origin']]);
add('duplicate single field', [['Accept', 'accept']]);
add('wildcard', [['*', 'Origin'], ['Accept', '*']]);
add('append to three fields', [['Accept, Origin, Cookie', 'Accept-Encoding']]);
add('duplicate in three fields', [['Accept, Origin, Cookie', 'origin']]);
add('append three fields', [['Accept', ['Origin', 'Cookie', 'Accept-Encoding']]]);
add('append string list', [['Accept', 'Origin, Cookie, Accept-Encoding']]);
add('duplicate new fields', [['Accept', ['Origin', 'origin', 'ORIGIN']]]);
const names = Array.from({ length: 500 }, (_, i) => 'X-' + i);
add('merge 50 fields', [[names.slice(0, 25).join(', '), names.slice(0, 50)]], Math.min(count, 5000));
add('merge 500 fields', [[names.slice(0, 250).join(', '), names]], Math.min(count, 1000));
const responsePrototype = { getHeader() { return this.header; }, setHeader(_name, value) { this.header = value; } };
for (const [name, inputs] of [['response first field', [['', 'Origin']]], ['response duplicate', [['Origin', 'origin']]], ['response array header', [[['Origin', 'Accept'], 'Cookie']]]]) {
  const functions = [before, after].map(fn => args => {
    const response = Object.create(responsePrototype);
    response.header = args[0];
    fn(response, args[1]);
    return Array.isArray(response.header) ? response.header.join(', ') : response.header;
  });
  for (const args of inputs) assert.equal(functions[0](args), functions[1](args), name);
  cases.push({ name, inputs, iterations: count, functions });
}
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
