'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {trace,targeted}=require('./scenarios.cjs');
const own=process.env.VPM_SCHEDULER_ENTRY || path.resolve(__dirname,'../../packages/vscheduler/index.cjs');
const upstream=require.resolve('scheduler');
assert.deepEqual(Object.keys(require(own)).sort(),Object.keys(require(upstream)).sort());
let count=0;
for(const realm of ['vm','native']) for(const mode of ['immediate','channel','timeout']) {
  assert.deepEqual(targeted(own,mode,realm),targeted(upstream,mode,realm),mode+' targeted');count++;
  for(let seed=1;seed<=128;seed++) {
    assert.deepEqual(trace(own,seed,mode,realm),trace(upstream,seed,mode,realm),mode+' seed '+seed);count++;
  }
}
console.log(count+' deterministic priority/timing traces match Scheduler 0.28.0 across isolated/native realms and three host paths');
