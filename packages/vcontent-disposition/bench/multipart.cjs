'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const plain = result => ({ type: result.type, parameters: { ...result.parameters } });

(async () => {
  const files = {
    previous: '../test/fixtures/vcontent-disposition-2097f39.cjs',
    upstream2: '../test/fixtures/content-disposition-2.0.1.cjs',
    upstream3: '../test/fixtures/content-disposition-3.0.0.mjs',
    vpm: '../index.js',
  };
  const implementations = {
    previous: require(files.previous), upstream2: require(files.upstream2),
    upstream3: await import(files.upstream3), vpm: require(files.vpm),
  };
  const options = Object.freeze({ multipart: true });
  const header = value => 'form-data; name="file"; filename="' + value + '"';
  const cases = [
    ['plain fields', header('report.pdf')],
    ['short escapes', header('a%22b%0D%0Ac.txt')],
    ['lowercase escapes', header('a%22b%0d%0ac.txt')],
    ['unknown escapes', header('a%20b%GGc%2.txt')],
    ['mixed-case names', 'Form-Data; NAME="file"; FILENAME="a%22b%0D%0Ac.txt"'],
    ['unterminated field', 'form-data; name="file"; filename="a%22b%0D%0Ac.txt'],
    ['31-character suffix', header('a%22b%0D%0Ac.txt'.padStart(30, 'x'))],
    ['32-character suffix', header('a%22b%0D%0Ac.txt'.padStart(31, 'x'))],
    ['127-character suffix', header('a%22b%0D%0Ac.txt'.padStart(126, 'x'))],
    ['128-character suffix', header('a%22b%0D%0Ac.txt'.padStart(127, 'x'))],
    ['dense escapes', header('%22%0D%0A'.repeat(100))],
    ['8 KiB sparse escapes', header('abc '.repeat(1024) + '%22' + 'def '.repeat(1024))],
    ['8 KiB plain', header('abc '.repeat(2048))],
    ['discarded duplicate', 'form-data; name="file"; filename=first; FILENAME="' + '%22%0D%0A'.repeat(100) + '"'],
  ];
  const labels = Object.keys(implementations);
  const count = Number(process.env.COUNT || 50000);
  assert.ok(Number.isSafeInteger(count) && count > 0, 'COUNT must be a positive integer');
  const rounds = 9;
  const corpusWarmup = 5000;
  const entries = cases.map(([name, input]) => {
    const expected = plain(implementations.upstream3.parse(input, options));
    return { name, input, count: input.length > 500 ? Math.min(count, 5000) : count,
      functions: labels.map(label => {
        const parse = implementations[label].parse;
        assert.deepEqual(plain(parse(input, options)), expected, label + ': ' + name);
        return () => {
          const result = parse(input, options);
          return result.type.length + (result.parameters.filename?.length || 0) + (result.parameters.name?.length || 0);
        };
      }) };
  });
  let checksum = 0;
  function measure(fn, iterations) {
    let sum = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) sum += fn();
    const elapsed = performance.now() - start;
    checksum += sum;
    return elapsed * 1e6 / iterations;
  }
  for (const entry of entries) for (const fn of entry.functions) measure(fn, corpusWarmup);
  const rows = [];
  for (const entry of entries) {
    const warmup = Math.min(entry.count, 20000);
    for (const fn of entry.functions) measure(fn, warmup);
    const samples = labels.map(() => []);
    for (let round = 0; round < rounds; round++) for (let offset = 0; offset < labels.length; offset++) {
      const index = (round + offset) % labels.length;
      samples[index].push(measure(entry.functions[index], entry.count));
    }
    const medianNs = Object.fromEntries(samples.map((values, i) => [labels[i], values.slice().sort((a, b) => a - b)[4]]));
    rows.push({ case: entry.name, count: entry.count, warmup, medianNs,
      ratios: { previous: medianNs.vpm / medianNs.previous, upstream2: medianNs.vpm / medianNs.upstream2, upstream3: medianNs.vpm / medianNs.upstream3 },
      samples: Object.fromEntries(samples.map((values, i) => [labels[i], values])) });
  }
  const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
  const result = { date: '2026-10-27', runtime: process.versions, platform: process.platform, arch: process.arch,
    baselines: { previous: 'VPM 2097f39', upstream2: '2.0.1', upstream3: '3.0.0' },
    units: 'nanoseconds/call', count, rounds, corpusWarmup, order: 'rotate starting implementation each round',
    sourceSha256: Object.fromEntries(Object.entries(files).map(([label, file]) => [label, hash(file)])),
    harnessSha256: hash('multipart.cjs'), checksum, rows };
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
  console.table(rows.map(row => ({ case: row.case, ...Object.fromEntries(Object.entries(row.medianNs).map(([key, value]) => [key, Math.round(value)])),
    'VPM / upstream3': row.ratios.upstream3.toFixed(2) })));
  console.log('Consumed checksum:', checksum, 'Utility-call measurements do not establish HTTP throughput gains.');
})().catch(error => { console.error(error); process.exitCode = 1; });
