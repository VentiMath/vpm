'use strict';
process.env.NODE_ENV='development';const assert=require('node:assert/strict'),path=require('node:path');
for(const file of [process.env.VPM_RESELECT_INSTALL||path.resolve(__dirname,'../../packages/vreselect'),__dirname+'/node_modules/reselect']){
 const a=require(file),saved=console.warn,warnings=[];console.warn=(...args)=>warnings.push(args);
 try{
  a.setGlobalDevModeChecks({identityFunctionCheck:'never',inputStabilityCheck:'once',cacheSizeCheck:'never'});
  const unstable=a.createSelector([s=>[s.value]],x=>x.length);unstable({value:1});unstable({value:2});assert.equal(warnings.length,1);warnings.length=0;
  a.setGlobalDevModeChecks({identityFunctionCheck:'once',inputStabilityCheck:'never'});const identity=a.createSelector([s=>s],x=>x);identity({x:1});identity({x:2});assert.equal(warnings.length,1);warnings.length=0;
  a.setGlobalDevModeChecks({identityFunctionCheck:'never',cacheSizeCheck:'once'});const big=a.weakMapMemoize(x=>x);for(let i=0;i<1010;i++)big(i);assert.equal(warnings.length,1);big.clearCache();for(let i=0;i<1010;i++)big(i);assert.equal(warnings.length,2);warnings.length=0;
  const bounded=a.weakMapMemoize(x=>x,{maxSize:10});for(let i=0;i<1100;i++)bounded(i);assert.equal(warnings.length,0);
 }finally{console.warn=saved;a.setGlobalDevModeChecks({identityFunctionCheck:'once',inputStabilityCheck:'once',cacheSizeCheck:'once'});}
}
console.log('Development identity, unstable input and unbounded-cache diagnostics match public controls');
