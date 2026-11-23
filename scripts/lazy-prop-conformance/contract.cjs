'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const vpm=require(process.env.VPM_LAZY_PACKAGE||'../../packages/vdefine-lazy-prop');
function trace(define,seed){
 const key=seed%2?Symbol.for('lazy'):'value',target=seed%3?{}:Object.create(null);let calls=0;const log=[];
 const initialize=function(){assert.equal(this,undefined);calls++;if(calls%7===0)throw Error('retry');return calls%5?calls:undefined};
 const install=()=>assert.equal(define(target,key,initialize),target);install();
 for(let i=0;i<80;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  try{switch(seed%7){case 0:case 1:log.push(['read',target[key]]);break;case 2:target[key]=seed%13;break;case 3:delete target[key];break;case 4:install();break;case 5:log.push(['child',Object.create(target)[key]]);break;case 6:log.push(['copy',Object.assign({},target)[key]]);}}
  catch(e){log.push(['error',e.name,e.message]);}
  const d=Object.getOwnPropertyDescriptor(target,key);log.push([calls,d&&{...d,get:typeof d.get,set:typeof d.set}]);
 }
 return log;
}
(async()=>{
 const controls=await Promise.all(['define-lazy-prop','define-lazy-prop-app'].map(async n=>(await import(pathToFileURL(require.resolve(n)))).default));
 for(let seed=1;seed<=128;seed++)for(const control of controls)assert.deepEqual(trace(vpm,seed),trace(control,seed));
 for(const control of controls){
  const proxyTrace=fn=>{const logs=[];const target=new Proxy({},{defineProperty(t,k,d){logs.push([k,{...d,get:typeof d.get,set:typeof d.set}]);return Reflect.defineProperty(t,k,d)}});fn(target,'x',()=>1);assert.equal(target.x,1);return logs};assert.deepEqual(proxyTrace(vpm),proxyTrace(control));
 }
 console.log('20,480 generated read/write/delete/redefine/inheritance transitions and proxy descriptors match current 3.0.0 and installed 2.0.0.');
})().catch(e=>{console.error(e);process.exitCode=1});
