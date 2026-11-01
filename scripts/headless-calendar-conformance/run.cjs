'use strict';
// Runs @full-ui/headless-calendar 7.1.3's own vitest suite against the pinned
// original (--upstream) or vfull-ui-headless-calendar. The tests import the
// package's TypeScript modules from ../src; each becomes a re-export of the
// published entry under test.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {createHash} = require('node:crypto'), {spawnSync} = require('node:child_process');
const upstream = process.argv.includes('--upstream');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
const original = path.join(__dirname, 'node_modules/@full-ui/headless-calendar');
assert.equal(require(path.join(original, 'package.json')).version, '7.1.3');
const entry = upstream ? path.join(original, 'index.js') : path.resolve(__dirname, '../../packages/vfull-ui-headless-calendar/index.js');
const modules = ['calendar-system', 'env', 'formatting-cmd', 'formatting-func', 'formatting-interface', 'formatting-native', 'formatting-utils', 'locale'];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'headless-calendar-conformance-'));
try {
  fs.mkdirSync(path.join(temporary, 'tests')); fs.mkdirSync(path.join(temporary, 'src'));
  for (const file of fs.readdirSync(path.join(__dirname, 'upstream/tests'))) {
    fs.copyFileSync(path.join(__dirname, 'upstream/tests', file), path.join(temporary, 'tests', file.replace(/\.txt$/, '')));
  }
  fs.copyFileSync(path.join(__dirname, 'upstream/vitest.config.ts.txt'), path.join(temporary, 'vitest.config.ts'));
  for (const name of modules) fs.writeFileSync(path.join(temporary, 'src', name + '.ts'), `export * from ${JSON.stringify(entry)};\n`);
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const report = path.join(temporary, 'report.json');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'node_modules/vitest/vitest.mjs'), 'run', '--root', temporary, '--reporter=json', '--outputFile=' + report],
    {cwd: temporary, encoding: 'utf8', timeout: 600000, env: {...process.env, TZ: 'America/New_York'}});
  let stats;
  try { stats = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
    throw new Error('Suite produced no report\n' + result.stdout.slice(-6000) + result.stderr.slice(-6000));
  }
  // Two tests expect UTC's short offset to read "GMT+0", as current ICU (Bun,
  // browsers) renders it; ICU 77 (Node 22) renders "GMT". Both libraries
  // format through Intl, so on such a runtime both fail exactly these.
  const utcName = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', timeZoneName: 'shortOffset'}).formatToParts(0).find(part => part.type === 'timeZoneName').value;
  const expected = utcName === 'GMT' ? {
    'NativeDateFormatter datelib main.ts compatibility formats a pretty UTC date/time string': /^AssertionError: expected 'Friday June 8 2018 12:00AM GMT' to be 'Friday June 8 2018 12:00AM GMT\+0'/,
    'NativeDateFormatter timeZoneName rendering renders the UTC zone as "GMT+0"': /^AssertionError: expected 'GMT' to be 'GMT\+0'/,
  } : {};
  const failures = stats.testResults.flatMap(file => file.assertionResults.filter(test => test.status === 'failed'));
  for (const failure of failures) console.log(failure.fullName in expected ? 'EXPECTED' : 'FAIL', failure.fullName, '\n ', (failure.failureMessages[0] || '').split('\n')[0]);
  console.log(`${upstream ? 'Upstream' : 'VPM'} headless-calendar suite: ${stats.numPassedTests} passed, ${stats.numFailedTests} failed (${Object.keys(expected).length} expected where ICU renders UTC as "${utcName}"), ${stats.numPendingTests + stats.numTodoTests} skipped of ${stats.numTotalTests} in ${stats.testResults.length} files.`);
  assert.deepEqual(failures.filter(failure => !expected[failure.fullName]?.test(failure.failureMessages[0] || '')).map(failure => failure.fullName), []);
  assert.equal(failures.length, Object.keys(expected).length);
  assert.equal(stats.numPendingTests + stats.numTodoTests, 0);
  assert.equal(stats.testResults.length, 3);
  assert.equal(stats.numTotalTests, 75);
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
