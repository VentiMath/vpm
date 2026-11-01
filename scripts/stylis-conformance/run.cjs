'use strict';
// Runs stylis 4.4.0's own mocha suite against the pinned original (--upstream)
// or vstylis. The tests import ../index.js; that becomes a re-export of the
// library's entry.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto');
const upstream = process.argv.includes('--upstream');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
assert.equal(require('./node_modules/stylis/package.json').version, '4.4.0');
const root = upstream ? path.join(__dirname, 'node_modules/stylis') : path.resolve(__dirname, '../../packages/vstylis');
const target = path.join(root, 'index.js');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'stylis-conformance-'));
try {
  fs.mkdirSync(path.join(temporary, 'test'));
  for (const file of fs.readdirSync(path.join(__dirname, 'upstream/test'))) {
    let source = fs.readFileSync(path.join(__dirname, 'upstream/test', file), 'utf8');
    // Eleven prefix() calls pass a length other than the length of the
    // property's name. The original selects properties by a hash of that length
    // and the name's first four characters, so the mistakes go unnoticed (eight
    // mask calls happen to hash like mask-image); VPM selects properties by
    // name. Both libraries run with the names' lengths. One assertion, that
    // `align-self:flex-start;` with length 12 is not prefixed, only held
    // because the hash missed: the same declaration with its length is
    // prefixed by the test 'flex-box', so it is removed.
    if (file === 'Prefixer.js.txt') {
      const contradicted = "\t\texpect(prefix('align-self:flex-start;', 12)).to.equal([`align-self:flex-start;`].join(''))\n";
      assert.equal(source.split(contradicted).length, 2, 'contradicted assertion');
      source = source.replace(contradicted, '');
      let corrected = 0;
      source = source.replace(/prefix\(([`'])([^`':]*):([^`']*)\1, (\d+)\)/g, (call, quote, name, rest, length) => {
        if (name.length === +length) return call;
        corrected++;
        return `prefix(${quote}${name}:${rest}${quote}, ${name.length})`;
      });
      assert.equal(corrected, 10, 'corrected lengths');
    }
    fs.writeFileSync(path.join(temporary, 'test', file.replace(/\.txt$/, '')), source);
  }
  fs.copyFileSync(path.join(__dirname, 'upstream/setup.js.txt'), path.join(temporary, 'setup.js'));
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"type":"module"}\n');
  fs.writeFileSync(path.join(temporary, 'index.js'), `export * from ${JSON.stringify(target)};\n`);
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
  const run = spawnSync(process.execPath, [path.join(__dirname, 'node_modules/mocha/bin/mocha'), '--require', './setup.js', '--reporter', 'json', 'test/*.js'], {cwd: temporary, encoding: 'utf8', timeout: 300000});
  let report;
  try { report = JSON.parse(run.stdout.slice(run.stdout.indexOf('{'))); } catch { throw new Error('No report\n' + run.stdout.slice(-3000) + run.stderr.slice(-3000)); }
  for (const failure of report.failures) console.log('FAIL', failure.fullTitle, '\n ', (failure.err.message || '').split('\n')[0].slice(0, 300));
  console.log(`${upstream ? 'Upstream' : 'VPM'} stylis suite: ${report.stats.passes} passed, ${report.stats.failures} failed, ${report.stats.pending} pending of ${report.stats.tests}.`);
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report.tests.map(test => [test.fullTitle, Object.keys(test.err).length ? 'failed' : 'passed'])));
  // The original's namespace plugin switches on a variable that one case label
  // assigns; JavaScriptCore compares the label with the assigned value, and
  // the original fails its own namespace test under Bun (see regressions.cjs).
  const expected = upstream && typeof Bun !== 'undefined' ? ['Middleware namespace'] : [];
  assert.deepEqual(report.failures.map(failure => failure.fullTitle), expected);
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
