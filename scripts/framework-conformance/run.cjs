'use strict';
// Run the verified upstream TypeScript tests with TS 7, without bundling source
// or installing upstream's development compiler. Assertions remain unchanged.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { compiler } = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..');
const archive = path.join(__dirname, 'functions-framework-5.0.2.tar.gz');
const provenance = require('../../packages/vfunctions-framework/PROVENANCE.json');
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), provenance.upstreamTestFixture.sha256);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vframework-conformance-'));
const upstream = process.argv.includes('--upstream');
try {
  const extract = spawnSync('tar', ['-xzf', archive, '--strip-components=1', '-C', temporary], { encoding: 'utf8' });
  assert.equal(extract.status, 0, extract.stderr);
  // The source tests import Express only for types. Test dependencies live here;
  // the upstream baseline's own runtime dependencies stay in consumers/.
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const out = path.join(temporary, 'compiled');
  const config = path.join(temporary, 'suite.json');
  fs.writeFileSync(config, JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'Node16', moduleResolution: 'Node16', noCheck: true, outDir: out, rootDir: temporary,
  }, include: ['test/*.ts', 'test/middleware/*.ts', 'test/integration/*.ts'] }));
  const compiled = spawnSync(process.execPath, [compiler().path, '-p', config, '--pretty', 'false'], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  // The upstream suite used callable CommonJS namespace imports and mutable
  // namespaces for Sinon stubs. TS 7 always enables interop; restore only that
  // emitted import convention, without changing any test assertions.
  for (const file of fs.readdirSync(path.join(out, 'test'), { recursive: true })) {
    if (!file.endsWith('.js')) continue;
    const target = path.join(out, 'test', file);
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(/__importStar\((require\([^\n]+?\))\)/g, '$1'));
  }
  const implementation = upstream
    ? path.join(root, 'scripts/consumers/node_modules/@google-cloud/functions-framework/build/src')
    : path.join(root, 'packages/vfunctions-framework/lib');
  for (const file of fs.readdirSync(implementation, { recursive: true })) {
    if (!file.endsWith('.js')) continue;
    const destination = path.join(out, 'src', file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, 'module.exports = require(' + JSON.stringify(path.join(implementation, file)) + ');\n');
  }
  fs.cpSync(path.join(temporary, 'test/data'), path.join(out, 'test/data'), { recursive: true });
  // Loader fixtures deliberately use process.cwd()/test/data.
  fs.mkdirSync(path.join(out, 'node_modules'));
  fs.symlinkSync(path.join(root, 'scripts/consumers/node_modules/express'), path.join(out, 'node_modules/express'), 'dir');
  const reportFile = path.join(temporary, 'report.json');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'),
    '--reporter', 'json', '--reporter-option', 'output=' + reportFile,
    '--timeout', '5000', '--exit', 'test/*.js', 'test/middleware/*.js', 'test/integration/*.js'], {
    cwd: out, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 120000,
  });
  if (result.error) throw result.error;
  if (!fs.existsSync(reportFile)) throw new Error(result.stdout + result.stderr);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.notEqual(result.status, null, result.signal);
  assert.equal(report.stats.failures, report.failures.length);
  if (process.env.OUTPUT) fs.copyFileSync(reportFile, process.env.OUTPUT);
  console.log(JSON.stringify({ runtime: process.version, bun: process.versions.bun,
    target: upstream ? '@google-cloud/functions-framework' : 'vfunctions-framework', ...report.stats }, null, 2));
  for (const failure of report.failures) console.log(failure.fullTitle + '\n' + failure.err.message);
  process.exitCode = result.status;
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
