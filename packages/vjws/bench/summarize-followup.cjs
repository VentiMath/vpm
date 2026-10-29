'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const directory = path.join(__dirname, 'results/followup');
const median = xs => { const a = xs.slice().sort((a, b) => a - b); return (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2; };
const percent = xs => +(100 * (median(xs) - 1)).toFixed(2);
const read = file => JSON.parse(fs.readFileSync(path.join(directory, file)));
let hashes;
const result = {};
for (const runtime of ['node', 'bun']) {
  const control = read('calibration-' + runtime + '.json');
  const reports = [1, 2, 3].map(n => read(runtime + '-' + n + '.json'));
  const reference = reports[0];
  hashes ||= reference.hashes;
  for (const report of [control, ...reports]) {
    for (const name of ['platform', 'arch', 'cpu', 'rounds', 'methodology', 'runtime']) assert.deepEqual(report[name], reference[name], name);
    assert.deepEqual(report.hashes, hashes);
    assert.deepEqual(report.rows.map(row => row.case), reference.rows.map(row => row.case));
    for (const row of report.rows) for (const samples of Object.values(row.samples)) {
      assert.equal(samples.length, 12); assert.ok(samples.every(value => Number.isFinite(value) && value > 0));
    }
  }
  assert.equal(control.calibration, true);
  for (const report of reports) assert.equal(report.calibration, false);
  result[runtime] = reference.rows.map((row, i) => {
    const rows = reports.map(report => report.rows[i]);
    const ratios = base => rows.map(row => row.samples.vpm.map((v, n) => v / row.samples[base][n]));
    const calibration = control.rows[i];
    return { case: row.case,
      ...Object.fromEntries(['upstream', 'before', 'vpm'].map(name => [name + 'Ns', +median(rows.flatMap(row => row.samples[name])).toFixed(2)])),
      upstreamChange: percent(ratios('upstream').flat()), beforeChange: percent(ratios('before').flat()),
      perReport: ratios('upstream').map(percent),
      calibrationChange: percent(calibration.samples.vpm.map((v, n) => v / calibration.samples.upstream[n])) };
  });
}
if (process.argv.includes('--verify-current')) for (const [file, hash] of Object.entries(hashes)) assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', file))).digest('hex'), hash, file);
console.log(JSON.stringify(result, null, 2));
