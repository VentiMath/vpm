'use strict';
// Public application fixtures run by default. --upstream compiles the original
// SDK's complete suite as a reference control, with its original layout.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {spawnSync} = require('node:child_process');
const {compiler} = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..');
const upstream = process.argv.includes('--upstream');
if (!upstream) {
  for(const file of ['application.cjs','listen-cases.cjs','reconnect.cjs']){const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});assert.equal(result.status,0);}
  process.exit(0);
}
const only = process.argv.find(arg => arg.startsWith('--grep='))?.slice(7);
const unskip = process.argv.includes('--unskip');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
const original = path.join(__dirname, 'node_modules/@google-cloud/firestore');
assert.equal(require(path.join(original, 'package.json')).version, '9.4.0');
const implementation = original;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirestore-conformance-'));
try {
  const source = path.join(temporary, 'dev'), build = path.join(temporary, 'build');
  for (const directory of ['test', 'conformance']) {
    fs.cpSync(path.join(__dirname, 'upstream', directory), path.join(source, directory), {recursive: true});
  }
  for (const file of fs.readdirSync(source, {recursive: true})) {
    if (file.endsWith('.ts.txt')) fs.renameSync(path.join(source, file), path.join(source, file.slice(0, -4)));
  }
  // --unskip runs the tests upstream marks skipped: the BulkWriter suite and
  // one Watch case. They are reported, not part of the default gate.
  if (unskip) {
    for (const [file, from, to] of [['test/bulk-writer.ts', "describe.skip('BulkWriter'", "describe('BulkWriter'"], ['test/watch.ts', "it.skip('handles deleting a non-existent doc'", "it('handles deleting a non-existent doc'"]]) {
      const text = fs.readFileSync(path.join(source, file), 'utf8');
      assert.equal(text.split(from).length, 2, file);
      fs.writeFileSync(path.join(source, file), text.replace(from, to));
    }
  }
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(temporary, 'suite.json'), JSON.stringify({compilerOptions: {
    target: 'ES2022', module: 'Node16', moduleResolution: 'Node16', noCheck: true, outDir: build, rootDir: source,
    resolveJsonModule: true, useUnknownInCatchVariables: false,
  }, include: ['dev/test/**/*.ts', 'dev/conformance/*.ts']}));
  const compiled = spawnSync(process.execPath, [compiler().path, '-p', path.join(temporary, 'suite.json'), '--pretty', 'false'], {encoding: 'utf8'});
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  fs.cpSync(path.join(source, 'conformance/test-definition.proto'), path.join(build, 'conformance/test-definition.proto'));
  fs.cpSync(path.join(source, 'conformance/conformance-tests'), path.join(build, 'conformance/conformance-tests'), {recursive: true});
  fs.symlinkSync(path.join(implementation, 'build/src'), path.join(build, 'src'), 'dir');
  fs.symlinkSync(path.join(implementation, 'build/protos'), path.join(build, 'protos'), 'dir');
  const files = fs.readdirSync(build, {recursive: true}).filter(file => file.endsWith('.js') && !/^(?:src|protos)\//.test(file));
  for (const file of files) {
    const filename = path.join(build, file);
    // The generated tests stub members of namespace imports; keep CommonJS
    // namespaces mutable as their original compiler emitted them.
    let text = fs.readFileSync(filename, 'utf8').replace(/__importStar\((require\([^\n]+?\))\)/g, '$1');
    fs.writeFileSync(filename, text);
  }
  const report = path.join(temporary, 'report.json');
  const args = ['--throw-deprecation', path.join(__dirname, 'node_modules/mocha/bin/mocha.js'), '--reporter', 'json', '--reporter-option', 'output=' + report,
    '--timeout', '10000', '--exit', '--recursive', path.join(build, 'test'), path.join(build, 'conformance')];
  if (only) args.push('--grep', only);
  const result = spawnSync(process.execPath, args, {cwd: temporary, encoding: 'utf8', timeout: 1200000, maxBuffer: 256 * 1024 * 1024});
  let stats;
  try { stats = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
    throw new Error('Suite produced no report\n' + result.stdout.slice(-6000) + result.stderr.slice(-6000));
  }
  if (process.env.OUTPUT) fs.copyFileSync(report, process.env.OUTPUT);
  const expected = {};
  const unexpected = stats.failures.filter(failure => expected[failure.fullTitle] !== (failure.err.message || '').split('\n')[0]);
  for (const failure of stats.failures) console.log(failure.fullTitle in expected ? 'EXPECTED' : 'FAIL', failure.fullTitle, '\n ', (failure.err.message || '').split('\n')[0]);
  console.log(`Upstream Firestore suite: ${stats.stats.passes} passed, ${stats.stats.failures} failed (${stats.stats.failures - unexpected.length} expected), ${stats.stats.pending} pending of ${stats.stats.tests}.`);
  if (!unskip) assert.equal(unexpected.length, 0);
  if (only) assert.ok(stats.stats.tests > 0, 'filtered suite must select tests');
  if (!only && !unskip) {
    assert.equal(stats.stats.failures, Object.keys(expected).length, 'an expected failure now passes; update the expectation');
    assert.equal(stats.stats.tests, 1056);
    assert.equal(stats.stats.pending, 47);
  }
} finally {
  if (!process.env.KEEP) fs.rmSync(temporary, {recursive: true, force: true}); else console.log('kept', temporary);
}
