'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {load, filesystem, currentControl} = require('./load.cjs');
const current = currentControl();
const vpm = path.resolve(__dirname, '../../packages/vis-docker/index.cjs');
const legacy = path.join(__dirname, 'node_modules/is-docker-app/index.js');
const markers = [undefined, '', new Error('EACCES'), new Error('EIO')];
const groups = [undefined, '', '0::/', '12:devices:/docker/id', '0::/system.slice/docker-id.scope', 'DOCKER', 'libpod-id', new Error('EACCES')];
const mounts = [undefined, '', '/docker/containers/id/hostname', '/var/lib/docker/containers/id/hosts', '/Docker/containers/id', '/containers/docker', new Error('EIO')];
let comparisons = 0, upgraded = 0;
for (const marker of markers) for (const group of groups) for (const mount of mounts) {
  const entries = {'/.dockerenv': marker, '/proc/self/cgroup': group, '/proc/self/mountinfo': mount};
  const expected = marker === '' || (typeof group === 'string' && group.includes('docker')) || (typeof mount === 'string' && mount.includes('/docker/containers/'));
  const observed = [current, vpm, legacy].map(file => {
    const fs = filesystem({...entries});
    const fn = load(file, fs.stub);
    assert.equal(fs.calls.length, 0);
    const result = fn();
    const calls = [...fs.calls];
    for (const key of Object.keys(fs.entries)) fs.entries[key] = new Error('filesystem changed');
    assert.equal(fn(), result);
    assert.deepEqual(fs.calls, calls);
    return {result, calls};
  });
  assert.equal(observed[1].result, expected);
  assert.deepEqual(observed[1], observed[0]);
  if (observed[1].result !== observed[2].result) {
    assert.equal(observed[2].result, false);
    assert.equal(typeof mount, 'string');
    assert(mount.includes('/docker/containers/'));
    upgraded++;
  }
  comparisons++;
}
console.log(`${comparisons} filesystem scenarios match is-docker 4.0.0, including probe order and caching; ${upgraded} intentional mountinfo upgrades from 2.2.1.`);
