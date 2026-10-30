'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const retry=require('..'),clocked=require('../../../scripts/retry-conformance/clock.cjs');
const options={retries:2,minTimeout:1,randomize:false};
const observe=promise=>promise.then(value=>({value}),error=>({error}));

test('sync, async and thenable successes preserve values',async()=>{
 for(const value of [undefined,null,false,0,'',{},Symbol('v')]){assert.equal(await retry(()=>value),value);assert.equal(await retry(async()=>value),value);assert.equal(await retry(()=>({then(resolve){resolve(value);}})),value);}
});
test('retries sync throws and async rejections with 1-based attempts',()=>clocked(async clock=>{
 for(const async of [false,true]){const attempts=[];const work=(bail,n)=>{attempts.push(n);if(n<3)throw Error('retry');return 7;};const p=retry(async?async(...args)=>work(...args):work,options);await clock.runAllAsync();assert.equal(await p,7);assert.deepEqual(attempts,[1,2,3]);}
}));
test('exhaustion returns the most frequent error with latest ties',()=>clocked(async clock=>{
 const errors=[Error('__proto__'),Error('other'),Error('__proto__')];const p=observe(retry((b,n)=>{throw errors[n-1];},options));await clock.runAllAsync();assert.equal((await p).error,errors[2]);
}));
test('frozen options work and randomize is not written back',async()=>{
 const opts=Object.freeze({retries:0});assert.equal(await retry(()=>1,opts),1);assert.deepEqual(opts,{retries:0});
});
test('bail prevents further retries even when the task subsequently rejects',()=>clocked(async clock=>{
 let calls=0,hooks=0;const error=Error('bail');const p=observe(retry(async bail=>{calls++;bail(error);throw Error('late');},{...options,onRetry(){hooks++;}}));await clock.runAllAsync();assert.equal((await p).error,error);assert.equal(calls,1);assert.equal(hooks,0);assert.equal(clock.countTimers(),0);
}));
test('bail after a retry was scheduled cancels that retry',()=>clocked(async clock=>{
 let bail,calls=0;const p=observe(retry(b=>{bail=b;calls++;throw Error('failure');},{...options,minTimeout:20}));const error=Error('stop');bail(error);await clock.runAllAsync();assert.equal((await p).error,error);assert.equal(calls,1);
}));
test('bail flags and no-argument bail reject without scheduling',()=>clocked(async clock=>{
 const error=Object.assign(Error('terminal'),{bail:true});const first=observe(retry(()=>{throw error;},options));const second=observe(retry(bail=>bail(),options));await clock.runAllAsync();assert.equal((await first).error,error);assert.equal((await second).error.message,'Aborted');assert.equal(clock.countTimers(),0);
}));
test('falsy thrown reasons become retryable errors with their cause intact',()=>clocked(async clock=>{
 for(const reason of [undefined,null,false,0,'']){let calls=0;const p=observe(retry(()=>{calls++;throw reason;},options));await clock.runAllAsync();const {error}=await p;assert.equal(error.code,'ERR_FALSY_REJECTION');assert.equal(error.cause,reason);assert.equal(calls,3);}
}));
test('onRetry sees only scheduled retries and the failed attempt number',()=>clocked(async clock=>{
 const calls=[];const p=observe(retry((b,n)=>{throw Error('e'+n);},{...options,onRetry:(e,n)=>calls.push([e.message,n])}));await clock.runAllAsync();await p;assert.deepEqual(calls,[['e1',1],['e2',2]]);
}));
test('throwing or rejected hooks settle and cancel pending work',()=>clocked(async clock=>{
 for(const async of [false,true]){let calls=0;const hookError=Error('hook');const hook=()=>{throw hookError;};const p=observe(retry(()=>{calls++;throw Error('task');},{...options,minTimeout:20,onRetry:async?async()=>hook():hook}));await clock.runAllAsync();assert.equal((await p).error,hookError);assert.equal(calls,1);assert.equal(clock.countTimers(),0);}
}));
test('thenable accessors and bail getters cannot leave promises unsettled',()=>clocked(async clock=>{
 const error=Error('accessor');const p=observe(retry(()=>({get then(){throw error;}}),{retries:0}));const q=observe(retry(()=>{throw {get bail(){throw error;}};},options));await clock.runAllAsync();assert.equal((await p).error,error);assert.equal((await q).error,error);
}));
test('zero and insufficient budgets reject without an extra attempt',()=>clocked(async clock=>{
 for(const maxRetryTime of [0,5]){let calls=0;const error=Error('task');const p=observe(retry(()=>{calls++;throw error;},{...options,minTimeout:10,maxRetryTime}));await clock.runAllAsync();assert.equal((await p).error,error);assert.equal(calls,1);}
}));
test('unref applies to backoff handles',()=>clocked(async clock=>{
 let calls=0;const p=retry(()=>{if(++calls===1)throw Error('retry');return 1;},{...options,unref:true});await clock.runAllAsync();assert.equal(await p,1);assert.equal(clock.countTimers(),0);
}));
test('options and task validation reject through the promise API',async()=>{
 for(const fn of [null,1,{}])await assert.rejects(retry(fn),TypeError);
 for(const opts of [1,[],{retries:-1},{onRetry:true}])await assert.rejects(retry(()=>1,opts));
});
test('bailing task result is still observed when it rejects later',()=>clocked(async clock=>{
 const error=Error('terminal');const p=observe(retry(bail=>{bail(error);return new Promise((resolve,reject)=>setTimeout(()=>reject(Error('late')),2));},options));await clock.runAllAsync();assert.equal((await p).error,error);
}));
