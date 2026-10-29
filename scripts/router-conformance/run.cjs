'use strict';
// Copy the verified, unmodified router 2.2.0 tests into an isolated temporary
// checkout. Only the package entry the tests require is redirected.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const vrouter = path.join(root, 'packages/vrouter');
const provenance = require('../../packages/vrouter/PROVENANCE.json');
const fixtures = provenance.fixtures.filter(entry => entry.file.startsWith('test/fixtures/upstream/'));
assert.equal(fixtures.length, 8, 'unexpected upstream fixture list');
const upstream = process.argv.includes('--upstream');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vrouter-conformance-'));
try {
  for (const { file, sha256 } of fixtures) {
    const source = fs.readFileSync(path.join(vrouter, file));
    assert.equal(createHash('sha256').update(source).digest('hex'), sha256, file);
    const target = path.join(temporary, 'test', file.slice('test/fixtures/upstream/'.length).replace(/\.txt$/, ''));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  if (process.versions.bun && !process.argv.includes('--all-runtime-tests')) {
    // Bun's HTTP server answers the raw `OPTIONS *` request in this test with
    // 400 before any handler runs, for router and vrouter alike. Keep it
    // visible as pending rather than rewriting the expected HTTP result.
    const target = path.join(temporary, 'test/router.js'), text = fs.readFileSync(target, 'utf8');
    const title = "it('should invoke function for all requests'";
    assert.equal(text.split(title).length - 1, 1, 'router.js: runtime fixture drift');
    fs.writeFileSync(target, text.replace(title, "it.skip('should invoke function for all requests'"));
  }
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const entry = upstream ? path.join(__dirname, 'node_modules/router') : vrouter;
  fs.writeFileSync(path.join(temporary, 'index.js'), 'module.exports = require(' + JSON.stringify(entry) + ');\n');
  // Mocha writes this synchronously, as in the Express suite runner.
  const reportFile = path.join(temporary, 'report.json');
  const args = [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'),
    '--reporter', 'json', '--reporter-option', 'output=' + reportFile,
    '--check-leaks', '--timeout', '3000', '--exit', 'test/'];
  const result = spawnSync(process.execPath, args, { cwd: temporary, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 180000 });
  let report;
  try { report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch {
    process.stderr.write(result.stderr.slice(-8000)); process.stdout.write(result.stdout.slice(-8000));
    throw new Error('Upstream suite did not produce a JSON report');
  }
  if (result.error) throw result.error;
  assert.notEqual(result.status, null, 'upstream test process terminated by ' + result.signal);
  assert.equal(report.stats.failures, report.failures.length, 'incomplete failure report');
  assert.ok(report.stats.passes > 0, 'no upstream tests ran');
  console.log(JSON.stringify({ runtime: process.version, bun: process.versions.bun, target: upstream ? 'router' : 'vrouter', ...report.stats }, null, 2));
  for (const failure of report.failures) console.log(failure.fullTitle + '\n' + failure.err.message);
  process.exitCode = result.status;
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
