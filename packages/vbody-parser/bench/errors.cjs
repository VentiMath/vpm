'use strict';
// Isolate error delivery from HTTP, using the exact pre-fix VPM helper.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const baseline = path.join(__dirname, 'fixtures/utils-20181c4.cjs');
const current = path.join(__dirname, '../lib/utils.js');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(sha256(baseline), 'b483ca4698a5e3dc0de68eee46588ff5c11e837cff631ea99e7d94e8cb252aab');
const helpers = [require(baseline).bodyError, require(current).bodyError];
const body = '{"broken":}';
let sink = 0;
function sample(wrap, readStack, count) {
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    try { JSON.parse(body); assert.fail('must reject malformed JSON'); }
    catch (original) {
      const error = wrap(400, original, { body, type: 'entity.parse.failed' });
      sink += readStack ? error.stack.length : error.status;
    }
  }
  return (performance.now() - start) * 1000 / count;
}
const results = [];
for (const readStack of [false, true]) {
  for (const wrap of helpers) sample(wrap, readStack, 5000);
  const samples = [[], []];
  for (let round = 0; round < 9; round++) for (const index of round % 2 ? [1, 0] : [0, 1]) {
    samples[index].push(sample(helpers[index], readStack, 10000));
  }
  const medians = samples.map(values => [...values].sort((a, b) => a - b)[4]);
  const result = { name: readStack ? 'parse + wrap + read stack' : 'parse + wrap, stack unread',
    previousUs: +medians[0].toFixed(3), currentUs: +medians[1].toFixed(3),
    changePercent: +(100 * (medians[1] / medians[0] - 1)).toFixed(1), samplesUs: samples };
  results.push(result); console.error(`${result.name}: ${result.previousUs} → ${result.currentUs} µs (${result.changePercent}%)`);
}
assert.ok(sink > 0);
console.log(JSON.stringify({ date: new Date().toISOString(), runtime: process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version,
  baseline: 'VPM 20181c4d286b80eb0c58da2f650fb9e1f830b400 lib/utils.js', baselineSha256: sha256(baseline), currentSha256: sha256(current),
  methodology: 'Fresh native JSON.parse failure and HTTP wrapper each iteration. Median of 9 alternating 10,000-operation samples after 5,000 warmups per implementation/case. Compare unread stacks with reading the complete trace. No HTTP or logging I/O.', results }, null, 2));
