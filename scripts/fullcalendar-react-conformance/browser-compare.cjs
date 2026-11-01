'use strict';
// Runs the browser suite against both libraries and requires the same result,
// spec by spec. The suite's five failures in this configuration are the same
// for both and pinned here: four `destroy` specs measure React's root against a
// baseline taken with Preact's createRoot (lib/vdom-misc imports preact
// directly), so React's 137 delegated listeners on the container count as
// leftovers; one scroll spec trips Chromium's ResizeObserver loop error.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawnSync} = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fullcalendar-browser-compare-'));
const reports = {};
try {
  for (const library of ['upstream', 'vpm']) {
    const output = path.join(directory, library + '.json');
    const run = spawnSync(process.execPath, [path.join(__dirname, 'browser-suite.cjs'), ...(library === 'upstream' ? ['--upstream'] : []), '--output=' + output], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], timeout: 3600000});
    assert.equal(run.status, 0, library);
    process.stdout.write(run.stdout);
    reports[library] = JSON.parse(fs.readFileSync(output, 'utf8'));
  }
} finally {
  fs.rmSync(directory, {recursive: true, force: true});
}
const {upstream, vpm} = reports;
for (const report of [upstream, vpm]) {
  assert.deepEqual(report.done, {status: 'failed', incomplete: null, globalErrors: []});
  assert.deepEqual(report.pageErrors, []);
}
assert.deepEqual(vpm.specs.map(spec => [spec.name, spec.status]), upstream.specs.map(spec => [spec.name, spec.status]));
const failed = upstream.specs.filter(spec => spec.status === 'failed').map(spec => spec.name.trim());
assert.deepEqual([...failed].sort(), [
  'refetchEvents retains scroll when in month view',
  'destroy when in dayGridWeek view leaves no handlers attached to DOM',
  'destroy when in week view leaves no handlers attached to DOM',
  'destroy when in listWeek view leaves no handlers attached to DOM',
  'destroy when in month view leaves no handlers attached to DOM',
].sort());
assert.equal(upstream.specs.length, 1542);
console.log(`FullCalendar browser suite on the React build: ${upstream.specs.length} specs in ${upstream.files} files, identical for the original and VPM (${upstream.counts.passed} passed, ${upstream.counts.pending} pending, the same ${failed.length} failing).`);
