'use strict';
// Runs firebase-functions 7.4.0's unit tests (spec/**/*.spec.ts with
// mocha/setup.ts, as upstream's `test` script does), unchanged, compiled with
// the workspace TypeScript 7 compiler into upstream's layout: `src` linked to
// the implementation's `lib`, `protos` and package.json beside them. For VPM,
// the tests' firebase-admin imports resolve to vfirebase-admin, so tests and
// implementation share one app registry.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {spawnSync} = require('node:child_process');
const {compiler} = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..');
const upstream = process.argv.includes('--upstream');
const only = process.argv.find(arg => arg.startsWith('--grep='))?.slice(7);
const BUN_RUNTIME_DIFFERENCES = [
  "logger compat should format multiple arguments in console.error",
  "logger compat should patch console.debug with DEBUG severity",
  "logger compat should patch console.error for Error objects preserving the original stack",
  "logger compat should patch console.error with ERROR severity without creating synthetic stack trace for string messages",
  "logger compat should patch console.log with INFO severity",
  "logger compat should patch console.log with no arguments",
  "logger compat should patch console.warn with WARNING severity",
  "logger logging methods should coalesce arguments into the message",
  "logger logging methods should merge structured data from the last argument",
  "logger logging methods should not overwrite a 'message' field in structured object if no other args are provided",
  "logger logging methods should not recognize null as a structured logging object",
  "logger logging methods should overwrite a 'message' field in structured object if a message is provided",
  "logger write structured logging write should not break on objects that override toJSON",
  "logger write structured logging write should not detect duplicate object as circular",
  "logger write structured logging write should not detect duplicate object in array as circular",
  "logger write structured logging write should output ALERT severity to stderr",
  "logger write structured logging write should output CRITICAL severity to stderr",
  "logger write structured logging write should output DEBUG severity to stdout",
  "logger write structured logging write should output EMERGENCY severity to stderr",
  "logger write structured logging write should output ERROR severity to stderr",
  "logger write structured logging write should output INFO severity to stdout",
  "logger write structured logging write should output NOTICE severity to stdout",
  "logger write structured logging write should output WARNING severity to stderr",
  "logger write structured logging write should remove circular references",
  "logger write structured logging write should remove circular references in arrays"
];
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
const original = path.join(__dirname, 'node_modules/firebase-functions');
assert.equal(require(path.join(original, 'package.json')).version, '7.4.0');
const implementation = upstream ? original : path.join(root, 'packages/vfirebase-functions');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vfirebase-functions-conformance-'));
try {
  const source = path.join(temporary, 'source'), build = path.join(temporary, 'build');
  for (const directory of ['spec', 'mocha']) fs.cpSync(path.join(__dirname, 'upstream', directory), path.join(source, directory), {recursive: true});
  for (const file of fs.readdirSync(source, {recursive: true})) {
    if (file.endsWith('.ts.txt')) fs.renameSync(path.join(source, file), path.join(source, file.slice(0, -4)));
  }
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(temporary, 'suite.json'), JSON.stringify({compilerOptions: {
    // CommonJS output turns the specs' extensionless import() into require(), as
    // upstream's ts-node runner does.
    target: 'ES2022', module: 'CommonJS', moduleResolution: 'Bundler', noCheck: true, outDir: build, rootDir: source,
    resolveJsonModule: true, useUnknownInCatchVariables: false,
  }, include: ['source/spec/**/*.ts', 'source/mocha/*.ts']}));
  const compiled = spawnSync(process.execPath, [compiler().path, '-p', path.join(temporary, 'suite.json'), '--pretty', 'false'], {encoding: 'utf8'});
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
  // Non-TypeScript fixtures (function sources, credentials, environment files).
  for (const file of fs.readdirSync(path.join(source, 'spec'), {recursive: true})) {
    const from = path.join(source, 'spec', file);
    if (fs.statSync(from).isFile() && !file.endsWith('.ts')) fs.cpSync(from, path.join(build, 'spec', file));
  }
  fs.symlinkSync(path.join(implementation, 'lib'), path.join(build, 'src'), 'dir');
  fs.symlinkSync(path.join(implementation, 'protos'), path.join(build, 'protos'), 'dir');
  fs.copyFileSync(path.join(implementation, 'package.json'), path.join(build, 'package.json'));
  const admin = path.join(root, 'packages/vfirebase-admin');
  const adminExports = require(path.join(admin, 'package.json')).exports;
  for (const file of fs.readdirSync(build, {recursive: true}).filter(file => file.endsWith('.js') && /^(?:spec|mocha)\//.test(file))) {
    const filename = path.join(build, file);
    // The tests stub members of namespace imports; keep CommonJS namespaces
    // mutable as their original compiler emitted them.
    let text = fs.readFileSync(filename, 'utf8').replace(/__importStar\((require\([^\n]+?\))\)/g, '$1');
    if (!upstream) text = text.replace(/require\("firebase-admin(\/[a-z-]+)?"\)/g, (match, entry) => `require(${JSON.stringify(path.join(admin, adminExports['.' + (entry ?? '')].require ?? adminExports['.' + (entry ?? '')]))})`);
    fs.writeFileSync(filename, text);
  }
  const report = path.join(temporary, 'report.json');
  // Some specs leave process.env and the config cache changed, so later specs
  // depend on what ran before them. Load files in one sorted order everywhere;
  // directory listing order differs between filesystems and runtimes.
  const args = [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'), '--reporter', 'json', '--reporter-option', 'output=' + report, '--exit',
    '--file', path.join(build, 'mocha/setup.js'), ...fs.readdirSync(path.join(build, 'spec'), {recursive: true}).filter(f => f.endsWith('.spec.js')).sort().map(f => path.join(build, 'spec', f))];
  if (only) args.push('--grep', only);
  // The optional GraphQL peers the Data Connect specs load are not workspace
  // packages; expose exactly those three from the fixture to VPM's lib.
  const peers = path.join(temporary, 'peers');
  fs.mkdirSync(path.join(peers, '@apollo'), {recursive: true}); fs.mkdirSync(path.join(peers, '@as-integrations'));
  for (const name of ['@apollo/server', '@as-integrations/express4', 'graphql']) fs.symlinkSync(path.join(__dirname, 'node_modules', name), path.join(peers, name), 'dir');
  const env = upstream ? process.env : {...process.env, NODE_PATH: peers};
  const result = spawnSync(process.execPath, args, {cwd: build, env, encoding: 'utf8', timeout: 1200000, maxBuffer: 256 * 1024 * 1024});
  let stats;
  try { stats = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
    throw new Error('Suite produced no report\n' + result.stdout.slice(-6000) + result.stderr.slice(-6000));
  }
  if (process.env.OUTPUT) fs.copyFileSync(report, process.env.OUTPUT);
  // DataSnapshot#ref opens the Realtime Database client through Firebase
  // Admin, which vfirebase-admin omits; it must fail with that explanation.
  const expected = upstream ? {} : {'DataSnapshot #ref: firebase.database.Reference should return a ref for correct instance, not the default instance': /^vfirebase-admin does not include the Realtime Database client/};
  // Under Bun both libraries fail the same logger specs: they capture output by
  // replacing process.stdout.write and process.stderr.write, which Bun's console
  // does not call. The logger's own output is identical.
  if (process.versions.bun) for (const title of BUN_RUNTIME_DIFFERENCES) expected[title] = /^(?:undefined is not an object \(evaluating 'last\.trim'\)|JSON Parse error: Unexpected EOF)/;
  const unexpected = stats.failures.filter(failure => !expected[failure.fullTitle]?.test(failure.err.message || ''));
  for (const failure of stats.failures) console.log(failure.fullTitle in expected ? 'EXPECTED' : 'FAIL', failure.fullTitle, '\n ', (failure.err.message || '').split('\n')[0]);
  console.log(`${upstream ? 'Upstream' : 'VPM'} Firebase Functions suite: ${stats.stats.passes} passed, ${stats.stats.failures} failed (${stats.stats.failures - unexpected.length} expected), ${stats.stats.pending} pending of ${stats.stats.tests}.`);
  assert.equal(unexpected.length, 0);
  if (!only) {
    assert.equal(stats.stats.failures, Object.keys(expected).length, 'an expected failure now passes; update the expectation');
    assert.equal(stats.stats.tests, 996);
  }
} finally {
  if (!process.env.KEEP) fs.rmSync(temporary, {recursive: true, force: true}); else console.log('kept', temporary);
}
