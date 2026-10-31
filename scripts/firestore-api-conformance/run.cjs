'use strict';
// Runs @google-cloud/firestore-api 0.7.1's generated unit tests, unchanged, with
// the workspace TypeScript 7 compiler. Only module locations are redirected:
// `../src` and `../protos` to the package under test, and, for VPM, the tests'
// own `google-gax` import to vgoogle-gax so one transport stack is in use.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {spawnSync} = require('node:child_process');
const {compiler} = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..');
const upstream = process.argv.includes('--upstream');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
assert.equal(require('./node_modules/@google-cloud/firestore-api/package.json').version, '0.7.1');
const original = path.join(__dirname, 'node_modules/@google-cloud/firestore-api/build');
const target = upstream
  ? {src: path.join(original, 'src'), protos: path.join(original, 'protos')}
  : {src: path.join(root, 'packages/vgoogle-cloud-firestore-api'), protos: path.join(root, 'packages/vgoogle-cloud-firestore-api/protos')};
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirestore-api-conformance-'));
try {
  fs.mkdirSync(path.join(temporary, 'test'));
  for (const file of ['gapic_firestore_v1.ts', 'gapic_firestore_admin_v1.ts']) {
    fs.copyFileSync(path.join(__dirname, 'upstream/test', file + '.txt'), path.join(temporary, 'test', file));
  }
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const out = path.join(temporary, 'compiled');
  fs.writeFileSync(path.join(temporary, 'suite.json'), JSON.stringify({compilerOptions: {
    target: 'ES2022', module: 'Node16', moduleResolution: 'Node16', noCheck: true, outDir: out, rootDir: temporary,
  }, include: ['test/*.ts']}));
  const compiled = spawnSync(process.execPath, [compiler().path, '-p', path.join(temporary, 'suite.json'), '--pretty', 'false'], {encoding: 'utf8'});
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  // The generated tests stub members of namespace imports; keep CommonJS
  // namespaces mutable as their original compiler emitted them.
  const gax = upstream ? 'google-gax' : path.join(root, 'packages/vgoogle-gax');
  for (const file of fs.readdirSync(path.join(out, 'test'))) {
    const filename = path.join(out, 'test', file);
    let source = fs.readFileSync(filename, 'utf8').replace(/__importStar\((require\([^\n]+?\))\)/g, '$1');
    source = source
      .replaceAll('require("../src")', `require(${JSON.stringify(target.src)})`)
      .replaceAll('require("../protos/protos")', `require(${JSON.stringify(path.join(target.protos, 'protos.js'))})`)
      .replaceAll("require('../protos/protos.json')", `require(${JSON.stringify(path.join(target.protos, 'protos.json'))})`)
      .replaceAll('require("google-gax")', `require(${JSON.stringify(gax)})`);
    assert.doesNotMatch(source, /require\(["']\.\.\/(?:src|protos)/, file + ': unredirected import');
    fs.writeFileSync(filename, source);
  }
  const report = path.join(temporary, 'report.json');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'),
    '--reporter', 'json', '--reporter-option', 'output=' + report, '--timeout', '10000', '--exit', path.join(out, 'test')],
  {encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024});
  let stats;
  try { stats = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
    throw new Error('Upstream suite produced no report\n' + result.stdout.slice(-4000) + result.stderr.slice(-4000));
  }
  if (process.env.OUTPUT) fs.copyFileSync(report, process.env.OUTPUT);
  for (const failure of stats.failures) console.log('FAIL', failure.fullTitle, '\n ', failure.err.message.split('\n')[0]);
  console.log(`${upstream ? 'Upstream' : 'VPM'} Firestore API suite: ${stats.stats.passes} passed, ${stats.stats.failures} failed, ${stats.stats.pending} pending of ${stats.stats.tests}.`);
  assert.equal(stats.stats.tests, 320);
  assert.equal(stats.stats.pending, 0);
  assert.equal(stats.stats.failures, 0);
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
