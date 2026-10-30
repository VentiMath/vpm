'use strict';
const assert=require('node:assert/strict');
(async()=>{
 for(const [prefix,vpm]of [['@google-cloud/',false],['../../packages/v',true]]){
  const promises=require(prefix+'promisify'),project=require(prefix+'projectify');
  class C{first(){}}Object.defineProperty(C.prototype,'accessor',{get(){throw Error('accessor evaluated');}});
  if(vpm)assert.doesNotThrow(()=>promises.promisifyAll(C));else assert.throws(()=>promises.promisifyAll(C),/accessor evaluated/);
  const reason=await new Promise(resolve=>promises.callbackify(()=>Promise.reject(0))(resolve));if(vpm){assert.equal(reason.code,'ERR_FALSY_VALUE_REJECTION');assert.equal(reason.reason,0);}else assert.equal(reason,0);
  const token='{{projectId}}';assert.equal(project.replaceProjectIdToken(token,'$&'),vpm?'$&':token);
  const record=Object.assign(Object.create(null),{id:token});project.replaceProjectIdToken(record,'p');assert.equal(record.id,vpm?'p':token);
  const cycle={id:token};cycle.self=cycle;if(vpm){assert.equal(project.replaceProjectIdToken(cycle,'p'),cycle);assert.equal(cycle.id,'p');}else assert.throws(()=>project.replaceProjectIdToken(cycle,'p'),RangeError);
 }
 console.log('Verified upstream accessor evaluation, falsy rejection, replacement-pattern interpretation, null-prototype omission and cyclic recursion; VPM fixes pass.');
})().catch(e=>{console.error(e);process.exitCode=1;});
