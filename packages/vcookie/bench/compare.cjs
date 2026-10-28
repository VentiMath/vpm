'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const after = require('..');
const legacy = require('../test/fixtures/cookie-0.7.2.cjs');
(async () => {
  const modern = await import('../test/fixtures/cookie-2.0.1.mjs');
  const count = Number(process.env.COUNT || 50000);
  const rounds = 9;
  const cases = [];
  const parsed = value => (value.sid?.length || 0) + (value.theme?.length || 0) + (value.value?.length || 0) + (value.name?.length || 0);
  function add(baseline, name, method, inputs, iterations = count) {
    const before = baseline === '0.7.2' ? legacy : modern;
    for (const args of inputs) {
      const a = after[method](...args); const b = before[method](...args);
      assert.deepEqual(typeof a === 'object' ? { ...a } : a, typeof b === 'object' ? { ...b } : b, name);
    }
    const functions = [before[method], after[method]].map(fn => args => {
      const result = fn(...args);
      return typeof result === 'string' ? result.length : parsed(result);
    });
    cases.push({ baseline, name, inputs, functions, iterations });
  }
  for (const version of ['0.7.2', '2.0.1']) {
    const method = version === '0.7.2' ? 'parse' : 'parseCookie';
    add(version, 'parse one cookie', method, [['sid=abc123'], ['sid=xyz987']]);
    add(version, 'parse five cookies', method, [['sid=abc123; theme=dark; lang=en; csrf=token; seen=1']]);
    add(version, 'parse encoded', method, [['sid=%E9%9B%AA; theme=light%20blue']]);
    add(version, 'parse duplicate', method, [['sid=first; sid=second; sid=third; theme=dark']]);
    add(version, 'parse malformed escape', method, [['sid=%FF; theme=dark']], Math.min(count, 5000));
    add(version, 'parse 50 cookies', method, [[Array.from({ length: 50 }, (_, i) => (i ? 'c' + i : 'sid') + '=value' + i).join('; ')]], Math.min(count, 10000));
  }
  const attrs = { maxAge: 3600, domain: 'example.com', path: '/', expires: new Date('2026-01-01T00:00:00Z'), httpOnly: true, secure: true, partitioned: true, priority: 'high', sameSite: 'lax' };
  add('0.7.2', 'serialize plain', 'serialize', [['sid', 'abc123'], ['sid', 'xyz987']]);
  add('0.7.2', 'serialize Unicode', 'serialize', [['sid', '雪'], ['sid', 'café']]);
  add('0.7.2', 'serialize Express defaults', 'serialize', [['sid', 'abc123', { path: '/' }]]);
  add('0.7.2', 'serialize all attributes', 'serialize', [['sid', 'abc123', attrs]]);
  add('2.0.1', 'stringify Set-Cookie plain', 'stringifySetCookie', [[{ name: 'sid', value: 'abc123' }], [{ name: 'sid', value: 'xyz987' }]]);
  add('2.0.1', 'stringify Set-Cookie Unicode', 'stringifySetCookie', [[{ name: 'sid', value: '雪' }], [{ name: 'sid', value: 'café' }]]);
  add('2.0.1', 'stringify Set-Cookie attributes', 'stringifySetCookie', [[{ name: 'sid', value: 'abc123', ...attrs }]]);
  add('2.0.1', 'stringify Cookie five values', 'stringifyCookie', [[{ sid: 'abc123', theme: 'dark', lang: 'en', csrf: 'token', seen: '1' }]]);
  add('2.0.1', 'parse Set-Cookie plain', 'parseSetCookie', [['sid=abc123'], ['sid=xyz987']]);
  add('2.0.1', 'parse Set-Cookie attributes', 'parseSetCookie', [[modern.stringifySetCookie({ name: 'sid', value: 'abc123', ...attrs })]]);
  let checksum = 0;
  function measure(fn, inputs, iterations) {
    let sum = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) sum += fn(inputs[i % inputs.length]);
    const elapsed = performance.now() - start;
    checksum += sum;
    return elapsed * 1e6 / iterations;
  }
  for (const entry of cases) for (const fn of entry.functions) measure(fn, entry.inputs, 5000);
  const rows = [];
  for (const entry of cases) {
    for (const fn of entry.functions) measure(fn, entry.inputs, Math.min(entry.iterations, 20000));
    const samples = [[], []];
    for (let round = 0; round < rounds; round++) for (const i of round % 2 ? [1, 0] : [0, 1]) samples[i].push(measure(entry.functions[i], entry.inputs, entry.iterations));
    const medians = samples.map(values => values.slice().sort((a, b) => a - b)[4]);
    rows.push({ baseline: entry.baseline, case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], vpmNs: medians[1], ratio: medians[1] / medians[0], samples });
  }
  const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
  const result = { date: '2026-10-27', runtime: process.versions, platform: process.platform, arch: process.arch,
    count, rounds, corpusWarmup: 5000, caseWarmup: 'min(iterations, 20000)', units: 'nanoseconds/call',
    sourceSha256: hash('../index.js'), baselineSha256: { '0.7.2': hash('../test/fixtures/cookie-0.7.2.cjs'), '2.0.1': hash('../test/fixtures/cookie-2.0.1.mjs') }, harnessSha256: hash('compare.cjs'), checksum, rows };
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
  console.table(rows.map(row => ({ baseline: row.baseline, case: row.case, upstream: Math.round(row.upstreamNs), VPM: Math.round(row.vpmNs), ratio: row.ratio.toFixed(2) })));
  console.log('Consumed checksum:', checksum, 'Nine alternating-order samples; this measures individual calls, not HTTP throughput.');
})().catch(error => { console.error(error); process.exitCode = 1; });
