'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),path=require('node:path');
for(const [name,file,args] of [
 ['current and app-version refs with paired cleanup corrections','run.cjs',[]],
 ['unchanged upstream Slot callers','callers.cjs',['--upstream']],
 ['unchanged Slot callers with VPM refs','callers.cjs',[]],
])test(name,()=>{
  const result=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/compose-refs-conformance',file),...args],{encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
});
