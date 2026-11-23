'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const {filesystem} = require('../docker-conformance/load.cjs');
const root = path.resolve(__dirname, '../..');
function loadModule(file, overrides = {}, processStub = process) {
  const module = {exports:{}};
  const native = createRequire(file);
  const require = name => Object.hasOwn(overrides,name) ? overrides[name] : native(name);
  const source = fs.readFileSync(file,'utf8').replace(/^#![^\n]*\n/,'');
  vm.runInNewContext('(function(require,module,exports,__dirname,Buffer){'+source+'\n})', {process:processStub}, {filename:file})(require,module,module.exports,path.dirname(file),Buffer);
  return module.exports;
}
function control(name) {
  const source = fs.readFileSync(require.resolve(name, {paths:[__dirname]}), 'utf8');
  const adapted = source.replace(/^import (\w+) from '([^']+)';$/gm, "const $1 = require('$2');").replace('export default ', 'module.exports = ');
  if (/^import |^export /m.test(adapted)) throw new Error('Unexpected control module syntax');
  const file = path.join(__dirname, 'node_modules/.'+name+'-control.cjs');
  fs.writeFileSync(file, adapted);
  return file;
}
function context({platform='linux', release='6.12', entries={}, testMode=false} = {}) {
  const probe = filesystem({...entries});
  probe.stub.existsSync = file => {
    probe.calls.push(['exists', file]);
    return probe.entries[file] !== undefined && !(probe.entries[file] instanceof Error);
  };
  return {...probe, process:{platform, arch:'x64', env:{...(testMode ? {__IS_WSL_TEST__:'1'} : {}), SYSTEMROOT:'C:\\Windows'}, versions:{}}, os:{release:() => {probe.calls.push(['release']); return release}}};
}
function loadContainer(file, ctx, docker) {
  return loadModule(file, {'node:fs':ctx.stub, fs:ctx.stub, 'is-docker':docker, 'vis-docker':docker});
}
function loadWsl(file, ctx, container, docker=container) {
  return loadModule(file, {'node:fs':ctx.stub, fs:ctx.stub, 'node:os':ctx.os, os:ctx.os, 'node:process':ctx.process, 'is-inside-container':container, 'vis-inside-container':container, 'is-docker':docker}, ctx.process);
}
function stack(ctx, {containerFile, dockerFile, wslFile, packageDir} = {}) {
  const docker = loadModule(dockerFile || path.join(root, 'packages/vis-docker/index.cjs'), {'node:fs':ctx.stub, fs:ctx.stub});
  const inside = loadContainer(containerFile || path.join(packageDir || path.join(root, 'packages/vis-inside-container'), 'index.cjs'), ctx, docker);
  return {docker, inside, wsl: wslFile ? loadWsl(wslFile, ctx, inside, docker) : undefined};
}
module.exports = {root, control, context, loadContainer, loadWsl, stack, loadModule};
