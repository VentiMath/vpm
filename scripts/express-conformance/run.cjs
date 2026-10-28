'use strict';
// Extract the verified, unmodified upstream tests into an isolated temporary
// checkout. Only its entry point and private-utils import are redirected.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const archive = path.join(__dirname, 'express-5.3.0.tar.gz');
const provenance = require('../../packages/vexpress/PROVENANCE.json');
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), provenance.upstreamTestFixture.sha256);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vexpress-conformance-'));
try {
  const extracted = spawnSync('tar', ['-xzf', archive, '-C', temporary], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  if (!process.argv.includes('--upstream')) {
    fs.writeFileSync(path.join(temporary, 'index.js'), 'module.exports = require(' + JSON.stringify(path.join(root, 'packages/vexpress')) + ');\n');
    fs.writeFileSync(path.join(temporary, 'lib/utils.js'), 'module.exports = require(' + JSON.stringify(path.join(root, 'packages/vexpress/lib/utils.js')) + ');\n');
    if (!process.argv.includes('--unadapted')) require('./adapt.cjs')(temporary);
  }
  if (process.versions.bun && !process.argv.includes('--all-runtime-tests')) require('./runtime.cjs')(temporary);
  const args = [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'), '--require', './test/support/env.js',
    '--reporter', 'json', '--check-leaks', '--timeout', '2000', '--exit', 'test/', 'test/acceptance/'];
  const result = spawnSync(process.execPath, args, { cwd: temporary, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
    timeout: 180000, env: { ...process.env, NODE_PATH: path.join(__dirname, 'node_modules') } });
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, result.stdout);
  let report;
  try { report = JSON.parse(result.stdout); } catch {
    process.stderr.write(result.stderr); process.stdout.write(result.stdout);
    throw new Error('Upstream suite did not produce a JSON report');
  }
  console.log(JSON.stringify({ runtime: process.version, bun: process.versions.bun, target: process.argv.includes('--upstream') ? 'express' : 'vexpress', ...report.stats }, null, 2));
  for (const failure of report.failures) console.log(failure.fullTitle + '\n' + failure.err.message);
  process.exitCode = result.status || 0;
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
