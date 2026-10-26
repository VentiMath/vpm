'use strict';

// Run from the repository: node packages/vparseurl/bench/compare.cjs (or bun).
const { performance } = require('node:perf_hooks');
const upstream = require('../test/fixtures/parseurl-1.3.3.cjs');
const replacement = require('..');

const implementations = [['parseurl 1.3.3', upstream], ['vparseurl', replacement]];
const cases = [
  { name: 'first parse: short path', raw: '/foo/bar' },
  { name: 'first parse: path + query', raw: '/foo/bar?user=tj&pet=fluffy' },
  { name: 'first parse: 2 KB path', raw: '/segment'.repeat(256) + '?x=1' },
  { name: 'first parse: absolute URL', raw: 'https://example.com/foo?x=1' },
  { name: 'cached current URL', raw: '/foo/bar?x=1', cached: true },
  { name: 'cached original URL', raw: '/mount/foo/bar?x=1', cached: true, original: true },
];

let checksum = 0;
function measure(parser, spec, count) {
  const requests = Array.from({ length: spec.cached ? 1 : count }, () => ({ url: spec.raw, originalUrl: spec.raw }));
  const parse = spec.original ? parser.original : parser;
  if (spec.cached) parse(requests[0]);
  let consumed = 0;
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    consumed += parse(requests[spec.cached ? 0 : i]).pathname.length;
  }
  const elapsed = performance.now() - start;
  checksum += consumed;
  return elapsed * 1e6 / count;
}

function median(values) {
  return values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

console.log(`Runtime: ${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version}`);
console.log('Median nanoseconds/call across 7 samples; lower is better. Request creation is outside timing.');
const results = [];
for (const spec of cases) {
  const count = spec.cached ? 200000 : 20000;
  for (const [, parser] of implementations) measure(parser, spec, count);
  const samples = [[], []];
  for (let round = 0; round < 7; round++) {
    for (const index of round % 2 ? [1, 0] : [0, 1]) {
      samples[index].push(measure(implementations[index][1], spec, count));
    }
  }
  const before = median(samples[0]);
  const after = median(samples[1]);
  results.push({ case: spec.name, 'parseurl ns': Math.round(before), 'vparseurl ns': Math.round(after), 'vparseurl / parseurl': (after / before).toFixed(2) });
}
console.table(results);
console.log(`Checksum: ${checksum}. Microbenchmarks do not establish application throughput or latency.`);
