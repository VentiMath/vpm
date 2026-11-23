'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {context, loadContainer, loadModule, stack} = require('../../../scripts/container-conformance/load.cjs');
const file = path.resolve(__dirname, '../index.cjs');
for (const marker of [undefined, '', new Error('EACCES')]) for (const docker of [false, true]) {
  test(`marker ${String(marker)} / Docker ${docker}: lazy, short-circuiting, cached`, () => {
    const ctx = context({entries:{'/run/.containerenv':marker}});
    let calls = 0;
    const detect = loadContainer(file, ctx, () => {calls++; return docker});
    assert.equal(ctx.calls.length, 0);
    const expected = marker === '' || docker;
    assert.equal(detect(), expected);
    assert.equal(calls, marker === '' ? 0 : 1);
    assert.equal(ctx.calls.length, 1);
    ctx.entries['/run/.containerenv'] = marker === '' ? undefined : '';
    assert.equal(detect(), expected);
    assert.equal(ctx.calls.length, 1);
    assert.equal(calls, marker === '' ? 0 : 1);
  });
}
test('real VPM Docker closure recognizes mountinfo-only containers', () => {
  const ctx = context({entries:{'/proc/self/cgroup':'0::/', '/proc/self/mountinfo':'/docker/containers/id/hostname'}});
  assert.equal(stack(ctx).inside(), true);
});
test('CJS/ESM share callable and CLI preserves status 0/2', async () => {
  const cjs = require('../index.cjs');
  assert.equal((await import('../index.mjs')).default, cjs);
  assert.equal(cjs.default, cjs);
  assert.equal(typeof cjs(), 'boolean');
  for (const value of [false, true]) {
    const proc = {};
    loadModule(path.resolve(__dirname, '../cli.cjs'), {'./index.cjs':() => value}, proc);
    assert.equal(proc.exitCode, value ? 0 : 2);
  }
});
