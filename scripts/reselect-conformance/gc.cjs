'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),path=require('node:path');
assert.equal(typeof global.gc,'function','Run Node with --expose-gc');
const keepAlive=[];
(async()=>{
 for(const module of [process.env.VPM_RESELECT_INSTALL||path.resolve(__dirname,'../../packages/vreselect'),__dirname+'/node_modules/reselect']){
  for(const options of [{},{maxSize:2},{resultEqualityCheck:()=>false}]){
   const fn=require(module).weakMapMemoize(key=>({key}),options);keepAlive.push(fn);
   const refs=(()=>{const key={},value=fn(key);return [new WeakRef(key),new WeakRef(value)]})();
   let collected=false;
   for(let i=0;i<30;i++){await new Promise(setImmediate);global.gc();await new Promise(setImmediate);if(refs.every(ref=>ref.deref()===undefined)){collected=true;break}}
   assert.equal(collected,true,'Cache retained an otherwise unreachable object key/result');
  }
 }
 assert.equal(keepAlive.length,6);console.log('Live weak caches release otherwise unreachable keys and results, including bounded and result-equality modes');
})().catch(e=>{console.error(e);process.exitCode=1});
