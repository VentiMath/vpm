'use strict';
const assert=require('node:assert/strict'),clocked=require('./clock.cjs');
(async()=>{
 for(const [retry,asyncRetry,improved]of [[require('retry'),require('async-retry'),false],[require('../../packages/vretry'),require('../../packages/vasync-retry'),true]]){
  const operation=retry.operation();const one=Error('__proto__'),two=Error('normal'),three=Error('__proto__');operation.errors().push(one,two,three);assert.equal(operation.mainError(),improved?three:two);
  const options={retries:0};assert.equal(await asyncRetry(()=>1,options),1);assert.equal(Object.hasOwn(options,'randomize'),!improved);
  clocked(clock=>{
   let calls=0;const op=retry.operation([10]);op.attempt(()=>{if(++calls===1)op.retry(Error('e'));});op.reset();clock.runAll();assert.equal(calls,improved?1:2);assert.equal(op.errors().length,improved?0:1);op.stop();
  });
  await clocked(async clock=>{
   let calls=0;const error=Error('bail');const result=asyncRetry(async bail=>{calls++;bail(error);throw Error('late failure');},{retries:2,minTimeout:1,randomize:false}).catch(e=>e);
   await clock.runAllAsync();assert.equal(await result,error);assert.equal(calls,improved?1:3);
  });
  clocked(clock=>{
   let calls=0;const op=retry.operation({retries:1,minTimeout:10,maxRetryTime:0});op.attempt(()=>{calls++;if(calls===1)op.retry(Error('e'));});clock.runAll();assert.equal(calls,improved?1:2);op.stop();
  });
 }
 console.log('Verified upstream reserved-message counting, option mutation, incomplete reset, post-bail retries and zero-budget regressions; VPM fixes pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});
