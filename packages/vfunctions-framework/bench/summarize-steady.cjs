'use strict';
// Reproduce the paired comparisons and verify that all reports measure one tree.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const directory = process.argv[2] || path.join(__dirname, 'results/steady');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name)));
const median = values => {
  const sorted = values.slice().sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
};
const percent = values => +(100 * (median(values) - 1)).toFixed(2);
const result = {};
let reference;
for (const runtime of ['node', 'bun']) {
  const calibration = read('calibration-' + runtime + '.json');
  const reports = [1, 2, 3].map(n => read(runtime + '-' + n + '.json'));
  reference ||= reports[0];
  for (const report of [...reports, calibration]) {
    for (const field of ['sourceSha256', 'harnessSha256', 'consumerLockSha256', 'fixtures', 'warmups', 'iterations', 'orders']) {
      assert.deepEqual(report[field], reference[field], field + ' mismatch');
    }
    assert.equal(report.platform, reports[0].platform); assert.equal(report.cpu, reports[0].cpu);
    for (const samples of Object.values(report.samples)) for (const rows of Object.values(samples)) {
      assert.equal(rows.length, 8);
      for (const row of rows) for (const metric of ['wallUs', 'cpuUs']) assert.ok(Number.isFinite(row[metric]) && row[metric] > 0);
    }
  }
  assert.equal(calibration.calibration, true);
  assert.deepEqual(calibration.afterRuntime.fixture, calibration.fixtures.before);
  for (const report of reports) assert.equal(report.calibration, false);
  const summary = result[runtime] = {};
  for (const name of Object.keys(reports[0].samples)) {
    const comparison = summary[name] = {};
    for (const metric of ['wallUs', 'cpuUs']) {
      const values = reports.flatMap(report => report.samples[name].after.map(row => row[metric]));
      const details = comparison[metric] = {
        after: +median(values).toFixed(2),
        calibrationPercent: percent(calibration.samples[name].after.map((row, i) => row[metric] / calibration.samples[name].before[i][metric])),
      };
      for (const baseline of Object.keys(reports[0].samples[name]).filter(v => v !== 'after')) {
        const ratios = reports.map(report => report.samples[name].after.map((row, i) => row[metric] / report.samples[name][baseline][i][metric]));
        details[baseline] = { percent: percent(ratios.flat()), perReport: ratios.map(percent) };
      }
    }
  }
}
console.log(JSON.stringify(result, null, 2));
