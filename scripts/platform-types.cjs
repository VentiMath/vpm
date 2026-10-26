'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const modules = path.join(__dirname, 'type-consumers/node_modules');
function configuration(files, { baseline = false, dom = false } = {}) {
  const undici = baseline ? path.join(modules, 'undici-types') : path.join(root, 'packages/vundici-types');
  return {
    compilerOptions: {
      strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022', ...(dom ? ['DOM', 'DOM.Iterable'] : [])],
      module: 'NodeNext', moduleResolution: 'NodeNext', skipLibCheck: false,
      types: [baseline ? 'node' : 'vnode-types'],
      typeRoots: [baseline ? path.join(modules, '@types') : path.join(root, 'node_modules')],
      paths: { 'vundici-types': [path.join(undici, 'index.d.ts')], 'vundici-types/*': [path.join(undici, '*.d.ts')] },
    }, files,
  };
}
function runtimeTypeTests() {
  return fs.readdirSync(path.join(root, 'packages')).flatMap(name => {
    const directory = path.join(root, 'packages', name);
    return require(path.join(directory, 'package.json')).vpm?.kind === 'types'
      ? [] : [path.join(directory, 'test/types.ts')];
  });
}
function compiler() {
  const directory = path.join(root, 'node_modules/typescript');
  const metadata = require(path.join(directory, 'package.json'));
  assert.match(metadata.version, /^7\./, 'VPM checks require the TypeScript 7 compiler');
  return { path: path.join(directory, metadata.bin.tsc), version: metadata.version };
}
// Use the supported CLI instead of depending on an unstable compiler API.
// All input file/type-root paths in these configurations are absolute.
function compile(config) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-tsc-'));
  try {
    const file = path.join(temporary, 'tsconfig.json');
    fs.writeFileSync(file, JSON.stringify(config));
    const result = spawnSync(process.execPath, [compiler().path, '-p', file, '--listFiles', '--pretty', 'false'], {
      cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    assert.ifError(result.error);
    assert.notEqual(result.status, null, `compiler terminated: ${result.signal}`);
    const output = result.stdout + result.stderr;
    return {
      status: result.status, output,
      diagnostics: [...output.matchAll(/\berror TS(\d+):/g)].map(match => Number(match[1])),
      files: result.stdout.split(/\r?\n/).filter(line => path.isAbsolute(line) && /\.[cm]?tsx?$/.test(line)),
    };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
function clean(result) {
  assert.equal(result.status, 0, result.output);
  assert.equal(result.diagnostics.length, 0, result.output);
  assert.ok(result.files.length > 0, 'compiler must report its loaded files');
}
module.exports = { root, modules, configuration, runtimeTypeTests, compiler, compile, clean };
