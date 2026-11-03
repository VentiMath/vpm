'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const [name,file,args] of [
  ['current and app-baseline Slot contracts','run.cjs',[]],
  ['unchanged Radix Primitive with original Slot','callers.cjs',['--upstream']],
  ['unchanged Radix Primitive with VPM Slot','callers.cjs',[]],
])test(name,()=>{const r=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/slot-conformance',file),...args],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);});
