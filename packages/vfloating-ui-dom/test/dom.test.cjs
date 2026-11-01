'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {environment}=require('../../../scripts/floating-dom-conformance/environment.cjs');
const vpm=require('..'),upstream=require('../../../scripts/floating-dom-conformance/node_modules/@floating-ui/dom');
function probe(api,scenario){const env=environment();try{return scenario(api,env);}finally{env.restore();}}
const off={elementResize:false,layoutShift:false};
test('exports and CJS/ESM identity',async()=>{assert.deepEqual(Object.keys(vpm).sort(),Object.keys(upstream).sort());const esm=await import('../runtime.mjs');for(const key of Object.keys(vpm))assert.equal(vpm[key],esm[key]);});
test('subscriptions with the same callback own independent listeners',()=>{
 const scenario=(api,e)=>{let count=0;const update=()=>count++;const a=api.autoUpdate(e.reference,e.floating,update,off),b=api.autoUpdate(e.reference,e.floating,update,off);a();count=0;e.container.dispatch('scroll');const result=count;b();return result;};
 assert.equal(probe(upstream,scenario),0);assert.equal(probe(vpm,scenario),1);
});
test('queued resize and movement notifications cannot outlive cleanup',()=>{
 const scenario=(api,e)=>{let count=0;const stop=api.autoUpdate(e.reference,e.floating,()=>count++);const observers=e.observers.slice();stop();count=0;e.reference.rect.x++;for(const observer of observers)observer.callback([{target:e.reference,intersectionRatio:1}]);return {count,observing:e.observers.some(o=>o.targets.size>0),frames:e.frames.size};};
 const old=probe(upstream,scenario);assert.ok(old.count>0||old.observing);assert.deepEqual(probe(vpm,scenario),{count:0,observing:false,frames:0});
});
test('cleanup cancels pending resize re-observation and animation frames',()=>probe(vpm,(api,e)=>{
 let count=0;const stop=api.autoUpdate(e.reference,e.floating,()=>count++,{layoutShift:false,animationFrame:true});e.observers[0].callback([{target:e.reference}]);assert.ok(e.frames.size>0);stop();stop();assert.equal(e.frames.size,0);const before=count;e.flushFrames();e.container.dispatch('scroll');assert.equal(count,before);assert.equal(e.container.count()+e.win.count(),0);
}));
test('setup failure rolls back already installed subscriptions',()=>{
 const scenario=(api,e)=>{assert.throws(()=>api.autoUpdate(e.reference,e.floating,()=>{throw new Error('update');}),/update/);return e.container.count()+e.win.count()+e.observers.reduce((n,o)=>n+o.targets.size,0);};
 assert.ok(probe(upstream,scenario)>0);assert.equal(probe(vpm,scenario),0);
});
test('inherited custom platform overrides and direct clipping calls work',async()=>{
 const e=environment();try{
  const direct=()=>vpm.platform.getClippingRect({element:e.floating,boundary:'clippingAncestors',rootBoundary:'viewport',strategy:'absolute'});
  assert.doesNotThrow(direct);assert.throws(()=>upstream.platform.getClippingRect({element:e.floating,boundary:'clippingAncestors',rootBoundary:'viewport',strategy:'absolute'}));
  let reads=0;const custom=Object.create({getElementRects(){reads++;return {reference:{x:20,y:30,width:50,height:20},floating:{x:0,y:0,width:10,height:5}};}});
  const result=await vpm.computePosition(e.reference,e.floating,{platform:custom});assert.equal(reads,1);assert.equal(result.x,40);assert.equal(result.y,50);
 }finally{e.restore();}
});
test('ordinary geometry, custom dimensions and observer options match',async()=>{
 for(const api of [upstream,vpm]){const e=environment();try{
   const result=await api.computePosition(e.reference,e.floating,{placement:'bottom-start',middleware:[api.offset(4),api.shift()]});assert.equal(result.x,10);assert.equal(result.y,74);
   for(const ancestorResize of [true,false]){let n=0;const stop=api.autoUpdate(e.reference,e.floating,()=>n++,{ancestorResize});n=0;e.win.dispatch('resize');assert.equal(n,1);stop();}
   const virtual={getBoundingClientRect:()=>e.reference.getBoundingClientRect()};assert.deepEqual(api.platform.getClientRects(virtual),[]);
 }finally{e.restore();}}
});
