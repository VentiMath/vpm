'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto');
const args = process.argv.slice(2), directory = path.resolve(args[0] || '.'), published = args.includes('--published');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'release-manifest.json')));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-styling-install-'));
function run(command, argv) {
  const result = spawnSync(command, argv, {cwd: temp, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024,
    env: {...process.env, BUN_INSTALL_CACHE_DIR: path.join(temp, 'cache')}});
  assert.equal(result.status, 0, (result.stdout + result.stderr).slice(-10000));
  return result.stdout;
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  // These are the app's React/MUI versions and build family. No workspace links,
  // module loader hooks or VPM overrides participate in this consumer.
  const dependencies = {react: '19.1.0', 'react-dom': '19.1.0', '@mui/material': '7.2.0', '@mui/system': '7.2.0',
    '@mui/styled-engine': '7.3.9', 'stylis-plugin-rtl': '2.1.1', csstype: '3.1.3'};
  if (published) {
    // Install roots only: this proves that the other eleven packages resolve
    // transitively from release URLs, without hiding omissions behind overrides.
    const urls = JSON.parse(fs.readFileSync(path.join(directory, 'consumer-package.json'))).dependencies;
    for (const name of ['vclsx', 'vemotion-styled', 'vemotion-babel-plugin', 'vemotion-weak-memoize']) dependencies[name] = urls[name];
  }
  const app = {private: true, type: 'module', dependencies, devDependencies: {
    vite: '6.3.5', esbuild: '0.25.12', '@types/react': '19.2.14', '@types/react-dom': '19.2.3'}};
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify(app, null, 2));
  run('bun', ['install', '--ignore-scripts']);
  if (!published) for (const item of manifest.packages) {
    const unpack = path.join(temp, 'unpack-' + item.name); fs.mkdirSync(unpack);
    run('tar', ['-xzf', path.join(directory, item.asset), '-C', unpack]);
    fs.renameSync(path.join(unpack, 'package'), path.join(temp, 'node_modules', item.name));
  }
  const lock = fs.readFileSync(path.join(temp, 'bun.lock'), 'utf8');
  for (const item of manifest.packages) {
    assert.equal(digest(fs.readFileSync(path.join(directory, item.asset))), item.sha256);
    const installed = path.join(temp, 'node_modules', item.name);
    const metadata = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')));
    assert.equal(metadata.version, item.version); assert.deepEqual(metadata.dependencies || {}, item.dependencies);
    for (const [file, hash] of Object.entries(item.sourceFiles)) assert.equal(digest(fs.readFileSync(path.join(installed, file))), hash, item.name + '/' + file);
    if (published) assert.ok(lock.includes(item.url), 'Lockfile must pin ' + item.name);
  }
  fs.writeFileSync(path.join(temp, 'aliases.json'), JSON.stringify(manifest.aliases));
  for (const name of ['consumer.tsx', 'ssr.mjs', 'browser.tsx', 'build.mjs']) {
    fs.copyFileSync(path.join(__dirname, 'styling-release', name), path.join(temp, name));
  }
  fs.writeFileSync(path.join(temp, 'tsconfig.json'), JSON.stringify({compilerOptions: {
    strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
    jsx: 'react-jsx', jsxImportSource: '@emotion/react', lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    types: ['react'], paths: manifest.typescriptPaths}, files: ['consumer.tsx']}));
  run('node', [require('./platform-types.cjs').compiler().path, '-p', 'tsconfig.json']);
  run('node', ['build.mjs']);
  for (const runtime of ['node', 'bun']) {
    const output = run(runtime, ['ssr-built.cjs']); assert.match(output, /styling SSR checks pass/);
  }
  console.log(run('node', [path.join(__dirname, 'styling-release/browser.cjs'), path.join(temp, 'dist')]).trim());
  const before = fs.readFileSync(path.join(temp, 'bun.lock'));
  run('bun', ['install', '--frozen-lockfile', '--ignore-scripts']);
  assert.deepEqual(fs.readFileSync(path.join(temp, 'bun.lock')), before);
  console.log((published ? 'Public release URLs' : 'Exact extracted archives') + ': hashes, TS7 augmentation/JSX, Node/Bun MUI SSR, Vite browser aliases, theme/RTL updates and frozen install pass.');
} finally { fs.rmSync(temp, {recursive: true, force: true}); }
