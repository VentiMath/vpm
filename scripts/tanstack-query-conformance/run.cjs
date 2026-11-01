'use strict';
// Runs TanStack Query 5.105.0's own vitest suites against the pinned originals
// (--upstream) or the VPM packages: `--package core` (query-core) or
// `--package react` (react-query). The tests import their package's modules
// from ../ (src); each becomes a re-export of the published build module under
// test, so internal modules keep one identity. '@tanstack/query-core' (and
// vtanstack-query-core) resolve to the core under test, which react-query and
// the persister share. Type tests (*.test-d.*) run with vitest's typecheck, as
// upstream configures it, against the built declarations.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto');
const argument = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.split('=')[1];
const upstream = process.argv.includes('--upstream'), which = argument('package') ?? 'core';
assert.ok(['core', 'react'].includes(which), '--package=core|react');
for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) {
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'), hash, file);
}
const modules = path.join(__dirname, 'node_modules'), packages = path.resolve(__dirname, '../../packages');
const roots = upstream
  ? {core: path.join(modules, '@tanstack/query-core'), react: path.join(modules, '@tanstack/react-query')}
  : {core: path.join(packages, 'vtanstack-query-core'), react: path.join(packages, 'vtanstack-react-query')};
for (const name of ['query-core', 'react-query']) assert.equal(require(path.join(modules, '@tanstack', name, 'package.json')).version, '5.105.0');
const dirName = which === 'core' ? 'query-core' : 'react-query';

function copyTree(from, to) {
  for (const entry of fs.readdirSync(from, {withFileTypes: true})) {
    const source = path.join(from, entry.name);
    if (entry.isDirectory()) copyTree(source, path.join(to, entry.name));
    else if (entry.name.endsWith('.txt')) { fs.mkdirSync(to, {recursive: true}); fs.copyFileSync(source, path.join(to, entry.name.slice(0, -4))); }
  }
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tanstack-query-conformance-'));
try {
  const pkg = path.join(temporary, dirName), src = path.join(pkg, 'src');
  copyTree(path.join(__dirname, 'upstream', dirName, '__tests__'), path.join(src, '__tests__'));
  copyTree(path.join(__dirname, 'upstream/query-test-utils'), path.join(temporary, 'query-test-utils'));
  if (which === 'react') fs.copyFileSync(path.join(__dirname, 'upstream/react-query/test-setup.ts.txt'), path.join(pkg, 'test-setup.ts'));
  // src/<module>.ts re-exports build/modern/<module>.js of the package under test.
  const build = path.join(roots[which], 'build/modern');
  const names = fs.readdirSync(build).filter(file => file.endsWith('.js')).map(file => file.slice(0, -3));
  for (const name of names) fs.writeFileSync(path.join(src, name + '.ts'), `export * from ${JSON.stringify(path.join(build, name + '.js'))}\n`);
  fs.symlinkSync(modules, path.join(temporary, 'node_modules'), 'dir');
  const coreEntry = path.join(roots.core, 'build/modern/index.js');
  const alias = [
    {find: /^@tanstack\/query-core$/, replacement: coreEntry},
    {find: /^vtanstack-query-core$/, replacement: coreEntry},
    {find: /^@tanstack\/query-test-utils$/, replacement: path.join(temporary, 'query-test-utils/src/index.ts')},
  ];
  // Upstream's configuration: jsdom, restoreMocks, typecheck, react plugin and
  // setup file for react-query; the source condition is replaced by the aliases.
  fs.writeFileSync(path.join(pkg, 'vitest.config.mjs'), `${which === 'react' ? `import react from ${JSON.stringify(path.join(modules, '@vitejs/plugin-react/dist/index.js'))}\n` : ''}
export default {
  ${which === 'react' ? 'plugins: [react()],' : ''}
  resolve: {alias: [${alias.map(({find, replacement}) => `{find: ${find}, replacement: ${JSON.stringify(replacement)}}`).join(', ')}], dedupe: ['react', 'react-dom']},
  test: {dir: './src', watch: false, environment: 'jsdom', restoreMocks: true, ${which === 'react' ? "setupFiles: ['test-setup.ts']," : ''}
    // Upstream's tests run its sources through vitest, which some spy on
    // (vi.spyOn on module namespaces); the installed builds are processed too.
    server: {deps: {inline: [/@tanstack/, /vtanstack/]}},
    typecheck: {enabled: true, tsconfig: './tsconfig.json'}},
};\n`);
  // Type tests compile against the built declarations through the same shims.
  fs.writeFileSync(path.join(pkg, 'tsconfig.json'), JSON.stringify({compilerOptions: {
    // upstream's root tsconfig.json options that affect checking
    strict: true, noUncheckedIndexedAccess: true, noUnusedLocals: true, noUnusedParameters: true, noImplicitReturns: true, noImplicitOverride: true,
    allowUnreachableCode: false, allowUnusedLabels: false, isolatedModules: true, resolveJsonModule: true, target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler', lib: ['DOM', 'DOM.Iterable', 'ES2022'],
    jsx: 'react-jsx', skipLibCheck: true, noEmit: true, allowImportingTsExtensions: true, esModuleInterop: true, types: [], typeRoots: [path.join(modules, '@types')],
    paths: {'@tanstack/query-core': [path.join(roots.core, 'build/modern/index.d.ts')], 'vtanstack-query-core': [path.join(roots.core, 'build/modern/index.d.ts')],
      '@tanstack/query-test-utils': [path.join(temporary, 'query-test-utils/src/index.ts')]},
  }, include: ['src']}));
  const report = path.join(temporary, 'report.json');
  const result = spawnSync(process.execPath, [path.join(modules, 'vitest/vitest.mjs'), 'run', '--root', pkg, '--config', path.join(pkg, 'vitest.config.mjs'), '--reporter=json', '--outputFile=' + report],
    {cwd: pkg, encoding: 'utf8', timeout: 900000, env: {...process.env, TZ: 'UTC'}});
  let stats;
  try { stats = JSON.parse(fs.readFileSync(report, 'utf8')); } catch {
    throw new Error('Suite produced no report\n' + result.stdout.slice(-6000) + result.stderr.slice(-6000));
  }
  const failures = stats.testResults.flatMap(file => file.assertionResults.filter(test => test.status === 'failed').map(test => ({...test, file: path.relative(src, file.name)})));
  const fileErrors = stats.testResults.filter(file => file.status === 'failed' && !file.assertionResults.some(test => test.status === 'failed'));
  for (const file of fileErrors) console.log('FILE', path.relative(src, file.name), '\n ', (file.message || '').split('\n').slice(0, 4).join('\n  '));
  for (const failure of failures) console.log('FAIL', failure.file, failure.fullName, '\n ', (failure.failureMessages[0] || '').split('\n').slice(0, process.env.STACK ? 14 : 1).join('\n  '));
  const files = stats.testResults.length;
  console.log(`${upstream ? 'Upstream' : 'VPM'} TanStack ${dirName} suite: ${stats.numPassedTests} passed, ${stats.numFailedTests} failed, ${stats.numPendingTests + stats.numTodoTests} skipped of ${stats.numTotalTests} in ${files} files.`);
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(stats.testResults.flatMap(file => file.assertionResults.map(test => [path.relative(src, file.name), test.fullName, test.status]))));
  assert.deepEqual(fileErrors.map(file => file.name), []);
  assert.equal(stats.numFailedTests, 0);
} finally {
  if (!process.env.KEEP) fs.rmSync(temporary, {recursive: true, force: true}); else console.log('kept', temporary);
}
