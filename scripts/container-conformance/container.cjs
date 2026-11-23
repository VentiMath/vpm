'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {root, control, context, loadContainer, stack} = require('./load.cjs');
const current = control('is-inside-container');
const currentWsl = control('is-wsl');
const docker4 = control('is-docker-current');
const docker3 = control('is-docker');
const vpmDir = process.env.VPM_CONTAINER_PACKAGE || path.join(root, 'packages/vis-inside-container');
const vpm = path.join(vpmDir, 'index.cjs');
const vpmDocker = require.resolve('vis-docker', {paths:[vpmDir]});
let comparisons = 0, upgrades = 0;
for (const marker of [undefined, '', new Error('EACCES'), new Error('EIO')]) for (const docker of [false, true]) {
  const run = file => {
    const ctx = context({entries:{'/run/.containerenv':marker}});
    let calls = 0;
    const fn = loadContainer(file, ctx, () => {calls++; return docker});
    assert.equal(ctx.calls.length, 0);
    const result = fn(); const initial = JSON.stringify(ctx.calls);
    assert.equal(fn(), result); assert.equal(JSON.stringify(ctx.calls), initial);
    return {result, calls, probes:ctx.calls};
  };
  assert.deepEqual(run(vpm), run(current)); comparisons++;
}
for (const podman of [undefined, '', new Error('EACCES')])
for (const marker of [undefined, ''])
for (const group of [undefined, '0::/', 'docker-id'])
for (const mount of [undefined, '/docker/containers/id/hosts']) {
  const scenario = {release:'Microsoft', entries:{'/run/.containerenv':podman, '/.dockerenv':marker, '/proc/self/cgroup':group, '/proc/self/mountinfo':mount}};
  const run = (containerFile, dockerFile) => {
    const ctx = context(scenario);
    const {inside,wsl} = stack(ctx, {containerFile,dockerFile,wslFile:currentWsl});
    return {inside:inside(), wsl, calls:ctx.calls};
  };
  const actual = run(vpm,vpmDocker);
  assert.deepEqual(actual, run(current,docker4));
  const old = run(current,docker3);
  if (actual.inside !== old.inside) {
    assert.equal(actual.inside,true); assert.equal(old.inside,false);
    assert.equal(actual.wsl,false); assert.equal(old.wsl,true);
    upgrades++;
  }
  comparisons++;
}
console.log(`${comparisons} container/cache and unchanged is-wsl 3.1.1 caller scenarios pass; ${upgrades} deliberate mountinfo upgrades over the Docker 3 closure.`);
