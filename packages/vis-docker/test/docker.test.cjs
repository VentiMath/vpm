'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {load, loadModule, filesystem} = require('../../../scripts/docker-conformance/load.cjs');
const file = path.resolve(__dirname, '../index.cjs');

for (const [name, entries, expected, probes] of [
  ['marker wins', {'/.dockerenv': ''}, true, 1],
  ['cgroup v1', {'/proc/self/cgroup': '12:devices:/docker/abcdef'}, true, 2],
  ['systemd cgroup', {'/proc/self/cgroup': '0::/system.slice/docker-abcdef.scope'}, true, 2],
  ['mountinfo with cgroup v2', {'/proc/self/cgroup': '0::/', '/proc/self/mountinfo': '24 0:6 /docker/containers/abc/hostname /etc/hostname rw'}, true, 3],
  ['ordinary host', {'/proc/self/cgroup': '0::/', '/proc/self/mountinfo': 'rootfs / rw'}, false, 3],
  ['missing proc', {}, false, 3],
  ['Podman is not Docker', {'/run/.containerenv': '', '/proc/self/cgroup': 'libpod-abcd.scope'}, false, 3],
  ['matching remains case sensitive', {'/proc/self/cgroup': 'DOCKER', '/proc/self/mountinfo': '/Docker/containers/id'}, false, 3],
  ['errors allow later evidence', {'/.dockerenv': new Error('EACCES'), '/proc/self/cgroup': new Error('EIO'), '/proc/self/mountinfo': '/docker/containers/id'}, true, 3],
]) {
  test(name + '; probes are lazy and result is cached', () => {
    const fs = filesystem(entries);
    const detect = load(file, fs.stub);
    assert.equal(fs.calls.length, 0);
    assert.equal(detect(), expected);
    assert.equal(fs.calls.length, probes);
    for (const key of Object.keys(entries)) delete entries[key];
    entries['/.dockerenv'] = expected ? new Error('missing') : '';
    assert.equal(detect(), expected);
    assert.equal(fs.calls.length, probes);
  });
}

test('CJS and ESM use one function and cache', async () => {
  const cjs = require('../index.cjs');
  const esm = await import(pathToFileURL(path.resolve(__dirname, '../index.mjs')));
  assert.equal(esm.default, cjs);
  assert.equal(cjs.default, cjs);
  assert.equal(typeof cjs(), 'boolean');
});

test('CLI is silent and sets status 0 or 2 without exiting the host', () => {
  for (const found of [true, false]) {
    const processStub = {};
    loadModule(path.resolve(__dirname, '../cli.cjs'), {'./index.cjs': () => found}, processStub);
    assert.equal(processStub.exitCode, found ? 0 : 2);
  }
});
