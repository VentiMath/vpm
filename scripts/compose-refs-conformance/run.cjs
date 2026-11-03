'use strict';
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
if(!process.argv.includes('--child')) {
  for(const variant of ['upstream','legacy','vpm']) {
    const result=spawnSync(process.execPath,[__filename,'--child',variant],{encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr);process.stdout.write(result.stdout);
  }
} else {
  const variant=process.argv.at(-1),api=require('./load.cjs')(variant);
  const kinds=['missing','null','object','callback','cleanup'];let count=0;
  for(const a of kinds)for(const b of kinds)for(const c of kinds) {
    const events=[],node={node:true},objects=[];
    const refs=[a,b,c].map((kind,i)=>{
      if(kind==='missing')return undefined;if(kind==='null')return null;
      if(kind==='object'){const ref={current:null};objects.push(ref);return ref;}
      return value=>{events.push([i,value]);if(kind==='cleanup')return()=>events.push([i,'cleanup']);};
    });
    const cleanup=api.composeRefs(...refs)(node);
    assert(objects.every(ref=>ref.current===node));
    assert.deepEqual(events,[a,b,c].flatMap((kind,i)=>['callback','cleanup'].includes(kind)?[[i,node]]:[]));
    if([a,b,c].includes('cleanup')) {
      assert.equal(typeof cleanup,'function');events.length=0;cleanup();
      assert(objects.every(ref=>ref.current===null));
      assert.deepEqual(events,[a,b,c].flatMap((kind,i)=>kind==='callback'?[[i,null]]:kind==='cleanup'?[[i,'cleanup']]:[]));
    } else assert.equal(cleanup,undefined);
    count++;
  }
  assert.equal(api.composeRefs()({}),undefined);
  for(const value of [0,false,'ignored',{},null])assert.equal(api.composeRefs(()=>value)({}),undefined);
  const failure={reason:'attachment'},events=[];
  assert.throws(()=>api.composeRefs(()=>events.push(1),()=>{throw failure},()=>events.push(3))({}),e=>e===failure);assert.deepEqual(events,[1]);
  const receivers=[];
  const release=api.composeRefs(function(value){receivers.push(this);if(value)return function(){receivers.push(this)}},function(){receivers.push(this)})({});
  release();assert.deepEqual(receivers,[undefined,undefined,undefined,undefined]);
  let calls=0;const repeated=api.composeRefs(()=>()=>calls++)({});repeated();repeated();assert.equal(calls,variant==='vpm'?1:2);
  for(const thrown of [Error('cleanup'),null,undefined]) {
    const object={current:null},events=[],cleanup=api.composeRefs(()=>()=>{events.push('first');throw thrown},object,()=>()=>events.push('last'))({});
    let caught=false;try{cleanup()}catch(e){caught=true;assert.equal(e,thrown)}assert(caught);
    if(variant==='vpm'){assert.equal(object.current,null);assert.deepEqual(events,['first','last']);cleanup();}
    else{assert.notEqual(object.current,null);assert.deepEqual(events,['first']);}
  }
  if(variant==='vpm') {
    let cleanup,calls=0;cleanup=api.composeRefs(()=>()=>{calls++;cleanup()})({});cleanup();assert.equal(calls,1);
  }
  console.log(`${variant}: ${count} mixed-ref combinations, attachment failures, cleanup ownership and paired correction controls pass.`);
}
