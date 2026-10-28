'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const after = require('..');
const plain = value => ({ type: value.type, parameters: { ...value.parameters } });
const consume = value => value.type.length + (value.parameters.filename?.length || 0) + (value.parameters.name?.length || 0);
(async () => {
  const version = process.argv.includes('latest') ? '3.0.0' : '2.0.1';
  const baseline = '../test/fixtures/content-disposition-' + version + (version[0] === '3' ? '.mjs' : '.cjs');
  const before = version[0] === '3' ? await import(baseline) : require(baseline);
  const count = Number(process.env.COUNT || 50000);
  const rounds = 9;
  const cases = [];
  function add(name, method, inputs, options) {
    for (const input of inputs) assert.deepEqual(method === 'parse' ? plain(after[method](input, options)) : after[method](input, options),
      method === 'parse' ? plain(before[method](input, options)) : before[method](input, options), name);
    cases.push({ name, inputs, functions: [before, after].map(pkg => {
      // Resolve the function once so ESM namespace access is not timed against
      // a CommonJS property lookup. Both public APIs support named imports.
      const fn = pkg[method];
      return method === 'parse' ? input => consume(fn(input, options)) : input => fn(input, options);
    }) });
  }
  add('create ASCII', 'create', ['report.pdf', 'photo.jpg', 'notes.txt']);
  add('create quoted', 'create', ['report (1).pdf', 'a"b\\c.txt']);
  add('create Unicode', 'create', ['café.pdf', '雪-📚.txt']);
  add('create Unicode no fallback', 'create', ['café.pdf', '雪-📚.txt'], { fallback: false });
  add('parse type only', 'parse', ['attachment', 'inline']);
  add('parse short filename', 'parse', ['attachment; filename=report.pdf', 'inline; filename=photo.jpg']);
  add('parse short quoted', 'parse', ['attachment; filename="report (1).pdf"', 'inline; filename="a b.txt"']);
  add('parse extended', 'parse', ["attachment; filename=cafe.pdf; filename*=UTF-8''caf%C3%A9.pdf"]);
  add('parse 4 KiB quoted', 'parse', ['attachment; filename="' + 'abc '.repeat(1024) + '"']);
  add('parse escaped quoted', 'parse', ['attachment; filename="' + 'abc\\" def\\\\ '.repeat(64) + '"']);
  add('parse duplicate 4 KiB', 'parse', ['attachment; filename=first; filename="' + 'abc '.repeat(1024) + '"']);
  add('parse multipart', 'parse', ['form-data; name="file"; filename="a%22b%0D%0Ac.txt"'], { multipart: true });
  add('format ASCII', 'format', [{ type: 'attachment', parameters: { filename: 'report.pdf' } }]);
  add('format quoted', 'format', [{ type: 'attachment', parameters: { filename: 'report (1).pdf' } }]);
  add('format Unicode', 'format', [{ type: 'attachment', parameters: { filename: '雪.txt' } }]);
  add('format fallback pair', 'format', [{ type: 'attachment', parameters: { filename: 'snow.txt', 'filename*': "UTF-8''%E9%9B%AA.txt" } }]);
  add('format multipart pair', 'format', [{ type: 'form-data', parameters: { name: 'file', filename: 'a\r\n"b.txt' } }], { multipart: true });
  add('encode ASCII', 'encodeExtended', ['report.pdf', 'photo.jpg']);
  add('encode Unicode', 'encodeExtended', ['café 📚.pdf']);
  add('decode Latin-1 short', 'decodeExtended', ["ISO-8859-1''caf%E9.pdf"]);
  add('decode Latin-1 sparse', 'decodeExtended', ["ISO-8859-1''caf%E9-" + 'report-'.repeat(32) + '%A3.pdf']);
  add('decode UTF-8', 'decodeExtended', ["UTF-8''caf%C3%A9-%F0%9F%93%9A.pdf"]);
  let checksum = 0;
  function measure(fn, inputs, iterations) {
    let sum = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const result = fn(inputs[i % inputs.length]);
      sum += typeof result === 'string' ? result.length : result;
    }
    const elapsed = performance.now() - start;
    checksum += sum;
    return elapsed * 1e6 / iterations;
  }
  const rows = [];
  for (const entry of cases) {
    for (const fn of entry.functions) measure(fn, entry.inputs, Math.min(count, 20000));
    const samples = [[], []];
    for (let round = 0; round < rounds; round++) for (const i of round % 2 ? [1, 0] : [0, 1]) samples[i].push(measure(entry.functions[i], entry.inputs, count));
    const medians = samples.map(values => values.slice().sort((a, b) => a - b)[4]);
    rows.push({ case: entry.name, upstreamNs: medians[0], vpmNs: medians[1], ratio: medians[1] / medians[0], samples });
  }
  const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
  const result = { date: '2026-10-27', runtime: process.versions, platform: process.platform, arch: process.arch, baseline: version,
    count, rounds, units: 'nanoseconds/call', sourceSha256: hash('../index.js'), baselineSha256: hash(baseline), harnessSha256: hash('compare.cjs'), checksum, rows };
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
  console.table(rows.map(row => ({ case: row.case, upstream: Math.round(row.upstreamNs), VPM: Math.round(row.vpmNs), ratio: row.ratio.toFixed(2) })));
  console.log('Consumed checksum:', checksum, 'Nine alternating-order samples; microbenchmarks do not establish HTTP throughput gains.');
})().catch(error => { console.error(error); process.exitCode = 1; });
