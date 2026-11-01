'use strict';
// Runs Emotion's own Jest suite (the release's tests for hash, weak-memoize,
// sheet, cache, react and styled) against the published packages, as upstream's
// `test:dist` runs it against its builds: the pinned originals (--upstream) or
// VPM's packages. --mode=development (upstream's `jest.config.js`, the default)
// resolves the packages' development builds; --mode=production
// (`jest.prod.js`) resolves the production builds and runs the tests gated to
// them. Upstream's Babel configuration and test utilities are used as retained.
// --vpm=hash,memoize,... replaces only the named packages (the rest stay the
// originals), so each layer is checked under the original layers above it;
// without --vpm, every Emotion package VPM provides is used.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto');
const upstream = process.argv.includes('--upstream');
const mode = process.argv.find(arg => arg.startsWith('--mode='))?.slice(7) ?? 'development';
// --react=18: upstream's test:react18 configuration (jest-react18.config.js),
// which maps react, react-dom and react-test-renderer to React 18.
const react = process.argv.find(arg => arg.startsWith('--react='))?.slice(8) ?? '16';
assert.ok(['16', '18'].includes(react), react);
assert.ok(['development', 'production'].includes(mode), mode);
const fixture = __dirname, retained = path.join(fixture, 'upstream'), packages = path.resolve(fixture, '../../packages');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(retained, file))).digest('hex'), hash, file);
}
assert.equal(require('./node_modules/@emotion/react/package.json').version, '11.14.0');

// Emotion's packages and the two packages below them that VPM provides.
const emotion = ['hash', 'memoize', 'unitless', 'weak-memoize', 'utils', 'sheet', 'use-insertion-effect-with-fallbacks', 'serialize', 'is-prop-valid', 'cache', 'react', 'styled', 'babel-plugin'];
// Tests of modules that are not part of the published packages (they import
// `../src/...`, which exists only in upstream's repository).
const sourceOnly = ['packages/react/__tests__/get-label-from-stack-trace.js'];
// Tests of the macro entries (@emotion/react/macro, @emotion/styled/macro,
// @emotion/css/macro), which VPM does not build. Their fixtures still run
// through the plugin in css.js, global.js, styled.js and vanilla-emotion.js.
const macroOnly = ['css-macro', 'global-macro', 'styled-macro', 'vanilla-emotion-macro'].map(name => `packages/babel-plugin/__tests__/${name}/index.js`);

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'emotion-conformance-'));
try {
  (function copy(from, to) {
    for (const entry of fs.readdirSync(from, {withFileTypes: true})) {
      const source = path.join(from, entry.name);
      if (entry.isDirectory()) { fs.mkdirSync(path.join(to, entry.name), {recursive: true}); copy(source, path.join(to, entry.name)); }
      else if (entry.name !== 'SHA256.json') fs.copyFileSync(source, path.join(to, entry.name.replace(/\.txt$/, '')));
    }
  })(retained, temporary);
  // The repository's workspace links: the fixture's installed modules, the
  // private test-utils and Babel preset, and (for VPM) the packages under test.
  const modules = path.join(temporary, 'node_modules');
  fs.mkdirSync(modules);
  for (const name of fs.readdirSync(path.join(fixture, 'node_modules'))) {
    if (name.startsWith('.') || name === '@emotion') continue;
    fs.symlinkSync(path.join(fixture, 'node_modules', name), path.join(modules, name), 'dir');
  }
  fs.symlinkSync(path.join(temporary, 'scripts/test-utils'), path.join(modules, 'test-utils'), 'dir');
  fs.symlinkSync(path.join(temporary, 'scripts/babel-tester'), path.join(modules, 'babel-tester'), 'dir');
  fs.symlinkSync(path.join(temporary, 'scripts/babel-preset-emotion-dev'), path.join(modules, 'babel-preset-emotion-dev'), 'dir');
  const moduleNameMapper = {};
  // @emotion/*: each original, except that with VPM's Babel plugin selected,
  // Babel (which resolves plugins with Node, not Jest) loads VPM's plugin to
  // compile the test files too.
  const selected = upstream ? [] : process.argv.find(arg => arg.startsWith('--vpm='))?.slice(6).split(',') ?? emotion.filter(name => fs.existsSync(path.join(packages, 'vemotion-' + name)));
  for (const name of selected) assert.ok(emotion.includes(name) && fs.existsSync(path.join(packages, 'vemotion-' + name)), name);
  fs.mkdirSync(path.join(modules, '@emotion'));
  for (const name of fs.readdirSync(path.join(fixture, 'node_modules/@emotion'))) {
    const target = name === 'babel-plugin' && selected.includes('babel-plugin') ? path.join(packages, 'vemotion-babel-plugin') : path.join(fixture, 'node_modules/@emotion', name);
    fs.symlinkSync(target, path.join(modules, '@emotion', name), 'dir');
  }
  // The retained packages/babel-plugin/package.json (which locates the
  // package root for target class names) names a package @emotion/babel-plugin
  // in Jest's module map; the plugin's name is mapped to the library under test.
  moduleNameMapper['^@emotion/babel-plugin$'] = selected.includes('babel-plugin') ? path.join(packages, 'vemotion-babel-plugin/index.cjs') : require.resolve('@emotion/babel-plugin', {paths: [fixture]});
  if (selected.length) {
    for (const name of fs.readdirSync(packages).filter(name => name.startsWith('vemotion-') || name === 'vstylis')) {
      fs.symlinkSync(path.join(packages, name), path.join(modules, name), 'dir');
    }
    // Every import of a selected package, from the tests, from the original
    // packages and from the companion packages they use (@emotion/css,
    // @emotion/server), resolves to VPM's.
    const mapped = selected.filter(name => name !== 'babel-plugin');
    if (mapped.length) moduleNameMapper[`^@emotion/(${mapped.join('|')})($|/.*)`] = 'vemotion-$1$2';
  }
  fs.writeFileSync(path.join(temporary, 'jest.harness.js'), `const config = require('./${mode === 'production' ? 'jest.prod.js' : 'jest.config.js'}')
const react18 = ${react === '18'} ? require('./jest-react18.config.js').moduleNameMapper : {}
module.exports = Object.assign({}, config, {
  transformIgnorePatterns: require('./jest.dist.js').transformIgnorePatterns,
  testPathIgnorePatterns: [...config.testPathIgnorePatterns, ${[...sourceOnly, ...macroOnly].map(file => JSON.stringify('<rootDir>/' + file)).join(', ')}],
  moduleNameMapper: Object.assign({}, react18, ${JSON.stringify(moduleNameMapper)}),
  // Packages under test resolve React and their other dependencies from the
  // fixture, as an application's would.
  modulePaths: [${JSON.stringify(modules)}],
  watchPlugins: []
})
`);
  const report = path.join(temporary, 'report.json');
  const run = spawnSync(process.execPath, [path.join(fixture, 'node_modules/jest/bin/jest.js'), '--config', 'jest.harness.js', '--ci', '--no-cache', '--json', '--outputFile=' + report],
    {cwd: temporary, encoding: 'utf8', timeout: 900000, env: {...process.env, TZ: 'UTC'}});
  let result;
  try { result = JSON.parse(fs.readFileSync(report, 'utf8')); } catch { throw new Error('No report\n' + run.stdout.slice(-4000) + run.stderr.slice(-8000)); }
  const statuses = [];
  for (const file of result.testResults) {
    const relative = path.relative(temporary, file.name);
    if (file.status === 'failed' && !file.assertionResults.length) statuses.push([relative, 'failed']), console.log('FAIL', relative, '\n ', file.message.split('\n').slice(0, 12).join('\n  '));
    for (const test of file.assertionResults) {
      statuses.push([relative + ' › ' + test.fullName, test.status]);
      if (test.status === 'failed') console.log('FAIL', relative, '›', test.fullName, '\n ', test.failureMessages.join('\n').split('\n').slice(0, Number(process.env.FAILURE_LINES || 12)).join('\n  '));
    }
  }
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(statuses));
  console.log(`${selected.length ? 'VPM (' + selected.join(', ') + ')' : 'Upstream'} Emotion suite (${mode}, React ${react}): ${result.numPassedTests} passed, ${result.numFailedTests} failed, ${result.numPendingTests} skipped of ${result.numTotalTests} in ${result.numTotalTestSuites} files; ${result.snapshot.total} snapshots, ${result.snapshot.unmatched} unmatched.`);
  assert.equal(result.numFailedTests + result.numRuntimeErrorTestSuites, 0);
  assert.equal(result.snapshot.unmatched + result.snapshot.filesAdded + result.snapshot.added, 0);
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
