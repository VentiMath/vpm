'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {currentControl, filesystem} = require('../../../scripts/docker-conformance/load.cjs');
const root = path.resolve(__dirname, '..');
const upstream = currentControl();
const vpm = path.join(root, 'index.cjs');
function fresh(file, fsObject) {
  const factory = new Function('require', 'module', 'exports', fs.readFileSync(file, 'utf8'));
  const require = name => {
    assert.equal(name, 'node:fs');
    return fsObject;
  };
  return () => {
    const module = {exports:{}};
    factory(require, module, module.exports);
    return module.exports();
  };
}
const expectedHost = require(vpm)();
const cases = [
  {name:'cached host detection', make(file) {const fn = require(file); fn(); return fn}, validate:value => assert.equal(value, expectedHost)},
  {name:'fresh module and host probes', make:file => fresh(file, fs), validate:value => assert.equal(value, expectedHost)},
  {name:'fresh module and cgroup-v2 probes (simulated)', make(file) {
    const {stub, calls} = filesystem({'/proc/self/cgroup':'0::/', '/proc/self/mountinfo':'24 0:6 /docker/containers/abcd/hostname /etc/hostname rw'});
    const fn = fresh(file, stub);
    return () => {calls.length = 0; return fn()};
  }, validate:value => assert.equal(value, true)},
];
require('../../../scripts/bench-process.cjs').run({root, upstream, vpm, cases, files:['index.cjs','index.mjs','package.json','bench/compare.cjs','../../scripts/docker-conformance/load.cjs','../../scripts/docker-conformance/package-lock.json']}).catch(error => {console.error(error); process.exitCode = 1});
