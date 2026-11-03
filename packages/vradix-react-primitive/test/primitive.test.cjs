'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const [name,file,args] of [
  ['current and app-baseline Primitive contracts','run.cjs',[]],
  ['unchanged Toggle caller with original Primitive','callers.cjs',['--upstream']],
  ['unchanged Toggle caller with VPM Primitive','callers.cjs',[]],
])test(name,()=>{const r=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/radix-react-primitive-conformance',file),...args],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);});
