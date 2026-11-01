'use strict';
// Runs firebase-admin 14.5.0's unit tests (test/unit, entered through
// index.spec as upstream's `test:unit` script does), unchanged, compiled with
// the workspace TypeScript 7 compiler. The compiled tests sit in upstream's
// source layout with `src` linked to the implementation's `lib` and its
// package.json beside them. For VPM, the tests' own google-auth-library import
// resolves to vgoogle-auth-library, which the implementation uses.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {spawnSync} = require('node:child_process');
const {compiler} = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..');
const upstream = process.argv.includes('--upstream');
const only = process.argv.find(arg => arg.startsWith('--grep='))?.slice(7);
// VPM omits the Realtime Database client and multipart response parsing (see
// the package README); the tests that exercise them must fail, and only those.
// 38 tests, plus Http2Client's multipart error test, whose :scheme check comes
// before its multipart check.
const SCHEME_TESTS = 39;
const unavailable = Object.fromEntries(['HttpClient', 'Http2Client'].flatMap(client => [
  ...['an empty multipart payload', 'a multipart payload', 'any multipart payload'].map(body => [`${client} should be fulfilled for a 2xx response with ${body}`, /Received a multipart response, which no Firebase Admin API reads.*Error code: ERR_UNSUPPORTED_MULTIPART_RESPONSE/]),
  [`${client} should fail for an error response with a multipart payload`, client === 'HttpClient' ? /expected undefined to exist/ : /^expected 'https' to equal 'https:'$/]]));
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
const original = path.join(__dirname, 'node_modules/firebase-admin');
assert.equal(require(path.join(original, 'package.json')).version, '14.5.0');
const implementation = upstream ? original : path.join(root, 'packages/vfirebase-admin');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirebase-admin-conformance-'));
try {
  const source = path.join(temporary, 'source'), build = path.join(temporary, 'build');
  fs.cpSync(path.join(__dirname, 'upstream/test'), path.join(source, 'test'), {recursive: true});
  for (const file of fs.readdirSync(source, {recursive: true})) {
    if (file.endsWith('.ts.txt')) fs.renameSync(path.join(source, file), path.join(source, file.slice(0, -4)));
  }
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(temporary, 'suite.json'), JSON.stringify({compilerOptions: {
    target: 'ES2022', module: 'Node16', moduleResolution: 'Node16', noCheck: true, outDir: build, rootDir: source,
    resolveJsonModule: true, useUnknownInCatchVariables: false,
  }, include: ['source/test/**/*.ts']}));
  const compiled = spawnSync(process.execPath, [compiler().path, '-p', path.join(temporary, 'suite.json'), '--pretty', 'false'], {encoding: 'utf8'});
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  for (const file of fs.readdirSync(path.join(source, 'test/resources'))) {
    if (!file.endsWith('.ts')) fs.copyFileSync(path.join(source, 'test/resources', file), path.join(build, 'test/resources', file));
  }
  fs.symlinkSync(path.join(implementation, 'lib'), path.join(build, 'src'), 'dir');
  fs.copyFileSync(path.join(implementation, 'package.json'), path.join(build, 'package.json'));
  // The tests mint their own tokens with jsonwebtoken, as a tool; they keep the
  // original (vjsonwebtoken rejects the empty-string key they pass for unsigned
  // emulator tokens). The implementation under test uses its own JWT library.
  const redirects = upstream ? {} : {
    'google-auth-library': path.join(root, 'packages/vgoogle-auth-library'),
  };
  for (const file of fs.readdirSync(path.join(build, 'test'), {recursive: true}).filter(file => file.endsWith('.js'))) {
    const filename = path.join(build, 'test', file);
    // The tests stub members of namespace imports; keep CommonJS namespaces
    // mutable as their original compiler emitted them.
    let text = fs.readFileSync(filename, 'utf8').replace(/__importStar\((require\([^\n]+?\))\)/g, '$1');
    if (file === 'unit/remote-config/condition-evaluator.spec.js') {
      // Upstream samples random UUIDs against a three-standard-deviation
      // bound, so a correct control occasionally fails. Both implementations
      // now receive the same 100,000 distinct IDs. Only this test input changes;
      // hashing, sample sizes, assertions and tolerances remain untouched.
      assert.equal(text.split('crypto.randomUUID()').length - 1, 1);
      text = text.replace('crypto.randomUUID()', "'vpm-percent-condition-' + i");
    }
    for (const [from, to] of Object.entries(redirects)) text = text.replaceAll(`require("${from}")`, `require(${JSON.stringify(to)})`);
    fs.writeFileSync(filename, text);
  }
  // The Realtime Database specs require lib/database's implementation, which
  // VPM omits; leave their two files (the 84 tests of the "Database" suite)
  // out of the VPM run instead of letting the missing module abort the suite.
  if (!upstream) {
    const index = path.join(build, 'test/unit/index.spec.js');
    const text = fs.readFileSync(index, 'utf8');
    const stripped = text.replace(/^require\("\.\/database\/(?:database|index)\.spec"\);\n/gm, '');
    assert.equal(text.length - stripped.length, 'require("./database/database.spec");\nrequire("./database/index.spec");\n'.length, 'database spec imports');
    fs.writeFileSync(index, stripped);
  }
  const report = path.join(temporary, 'report.json');
  const args = [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'), '--reporter', 'json', '--reporter-option', 'output=' + report,
    '--exit', path.join(build, 'test/unit/index.spec.js')];
  if (only) args.push('--grep', only);
  const result = spawnSync(process.execPath, args, {cwd: build, encoding: 'utf8', timeout: 1200000, maxBuffer: 256 * 1024 * 1024});
  let stats;
  try { stats = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
    throw new Error('Suite produced no report\n' + result.stdout.slice(-6000) + result.stderr.slice(-6000));
  }
  if (process.env.OUTPUT) fs.copyFileSync(report, process.env.OUTPUT);
  // These tests match V8's wording for assigning to a getter-only property
  // ("Cannot assign to read only property", "Cannot set property ... which has
  // only a getter"). Bun throws the same TypeError as "Attempted to assign to
  // readonly property", for the original and VPM alike.
  const engineWording = process.versions.bun ? ['FirebaseApp #name should be read-only', 'FirebaseApp #options should be read-only',
    'addReadonlyGetter() should make the new property read-only', 'Auth app is read-only',
    'TenantManager authForTenant() should return a TenantAwareAuth with read-only tenant ID',
    // The Database suite only runs for the original (VPM omits that client).
    ...(upstream ? ['Database app is read-only'] : []),     'Messaging app is read-only', 'Storage app is read-only', 'Firestore app is read-only', 'Installations app is read-only',
    ...['getTemplate', 'getTemplateAtVersion', 'validateTemplate', 'publishTemplate', 'rollback'].map(method => `RemoteConfig ${method} should resolve with Remote Config template on success`),
    'RemoteConfig createTemplateFromJSON should succeed when a valid json string is provided'] : [];
  const expected = new Map(engineWording.map(title => [title, /but got 'Attempted to assign to readonly prope/]));
  for (const [title, pattern] of Object.entries(upstream ? {} : unavailable)) expected.set(title, pattern);
  // Each Storage client now captures its own emulator configuration. The
  // original assertion explicitly requires the process-wide mutation removed
  // by this design; paired two-server wire controls verify preserved routing.
  if (!upstream) expected.set('Storage Emulator mode sets STORAGE_EMULATOR_HOST if FIREBASE_STORAGE_EMULATOR_HOST is set',
    /^expected undefined to equal 'http:\/\/localhost:9199'$/);
  // VPM sends the HTTP/2 :scheme pseudo-header as 'https' (RFC 9113); upstream
  // sends 'https:', and these Http2Client tests assert that value on a mocked
  // session (Http2Client and AuthorizedHttp2Client). Each must fail on exactly
  // that assertion.
  const scheme = failure => !upstream && /^(?:Authorized)?Http2Client /.test(failure.fullTitle) && failure.err.message === "expected 'https' to equal 'https:'";
  for (const failure of stats.failures.filter(scheme)) expected.set(failure.fullTitle, /^expected 'https' to equal 'https:'$/);
  const schemeFailures = stats.failures.filter(scheme).length;
  const unexpected = stats.failures.filter(failure => !expected.get(failure.fullTitle)?.test(failure.err.message || ''));
  for (const failure of stats.failures) console.log(expected.has(failure.fullTitle) ? 'EXPECTED' : 'FAIL', failure.fullTitle, '\n ', (failure.err.message || '').split('\n')[0]);
  console.log(`${upstream ? 'Upstream' : 'VPM'} Firebase Admin suite: ${stats.stats.passes} passed, ${stats.stats.failures} failed (${stats.stats.failures - unexpected.length} expected), ${stats.stats.pending} pending of ${stats.stats.tests}.`);
  assert.equal(unexpected.length, 0);
  assert.ok(stats.stats.tests > 0, 'suite filter matched no tests');
  if (!only) {
    assert.equal(stats.stats.failures, [...expected.keys()].filter(title => !(title in unavailable) || !upstream).length, 'an expected failure now passes; update the expectation');
    assert.equal(schemeFailures, upstream ? 0 : SCHEME_TESTS, ':scheme assertions');
    assert.equal(stats.stats.tests, upstream ? 6146 : 6146 - 84);
  }
} finally {
  if (!process.env.KEEP) fs.rmSync(temporary, {recursive: true, force: true}); else console.log('kept', temporary);
}
