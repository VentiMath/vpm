'use strict';
const fs = require('node:fs');
const path = require('node:path');
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
function compiler(name = 'typescript') {
  const directory = name === 'typescript' ? path.join(root, 'node_modules', name) : path.join(modules, name);
  const metadata = require(path.join(directory, 'package.json'));
  return { path: path.join(directory, metadata.bin.tsc), version: metadata.version };
}
module.exports = { root, modules, configuration, runtimeTypeTests, compiler };
