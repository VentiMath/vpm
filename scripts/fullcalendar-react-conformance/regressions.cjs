'use strict';
// Fixes below vfullcalendar-react, observed through a mounted calendar with
// each library (jsdom on this runtime; Node has no native Temporal, so the
// original's named time zones run on temporal-polyfill's own implementation).
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {runVitest} = require('./vitest-run.cjs');
const observed = {};
for (const library of ['upstream', 'vpm']) {
  const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fullcalendar-react-regressions-')), 'observed.json');
  const stats = runVitest({upstream: library === 'upstream', files: {'calendar.test.tsx': path.join(__dirname, 'regressions/calendar.test.tsx.txt')}, env: {OBSERVED_OUTPUT: output}});
  assert.equal(stats.numTotalTests, 2, 'both mounted regressions must run');
  assert.equal(stats.numFailedTests, 0, JSON.stringify(stats.testResults.map(r => r.assertionResults.map(a => a.failureMessages))).slice(0, 4000));
  observed[library] = JSON.parse(fs.readFileSync(output, 'utf8'));
  fs.rmSync(path.dirname(output), {recursive: true, force: true});
}
const nativeTemporal = typeof globalThis.Temporal === 'object';
// Casablanca was on GMT (+00:00) during Ramadan 2020.
assert.deepEqual(observed.vpm.casablanca, {startStr: '2020-05-17T15:00:00Z', now: '2020-05-17T15:00:00Z'});
if (!nativeTemporal) assert.deepEqual(observed.upstream.casablanca, {startStr: '2020-05-17T16:00:00+01:00', now: '2020-05-17T16:00:00+01:00'});
// The feed's range parameters were appended after the #fragment.
assert.deepEqual(observed.upstream.feed, ['/api/events.php#calendar?start=2026-11-01T00%3A00%3A00Z&end=2026-12-13T00%3A00%3A00Z&timeZone=UTC']);
// Fragments belong to the client and must never reach the HTTP transport.
assert.deepEqual(observed.vpm.feed, ['/api/events.php?start=2026-11-01T00%3A00%3A00Z&end=2026-12-13T00%3A00%3A00Z&timeZone=UTC']);
console.log(`Reproduced and fixed through a mounted calendar: a Casablanca calendar an hour off during Ramadan 2020${nativeTemporal ? ' (original correct on this runtime, which has a native Temporal)' : ''}, and a #fragment JSON feed URL sent without its range.`);
