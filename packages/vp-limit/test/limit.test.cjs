'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {AsyncLocalStorage} = require('node:async_hooks');
const pLimit = require('..');
const tick = () => new Promise(resolve => setImmediate(resolve));

test('validates concurrency and options without coercion', () => {
  for (const value of [0,-1,1.1,NaN,-Infinity,undefined,null,true,'2',{},2n,Symbol()]) assert.throws(() => pLimit(value), TypeError);
  for (const value of [0,1,null,'true']) assert.throws(() => pLimit({concurrency:2,rejectOnClear:value}), TypeError);
  assert.equal(pLimit(Infinity).concurrency, Infinity);
});
test('tasks always start asynchronously with synchronous slot accounting', async () => {
  const limit = pLimit(2), calls = [];
  const promises = [0,1,2].map(i => limit(() => { calls.push(i); return i; }));
  assert.deepEqual(calls, []); assert.equal(limit.activeCount, 2); assert.equal(limit.pendingCount, 1);
  assert.deepEqual(await Promise.all(promises), [0,1,2]); assert.deepEqual(calls, [0,1,2]);
  assert.equal(limit.activeCount, 0); assert.equal(limit.pendingCount, 0);
});
test('FIFO dispatch obeys a bounded number of active tasks', async () => {
  const limit = pLimit(3), started = [], releases = []; let active = 0, peak = 0;
  const promises = Array.from({length:20}, (_, i) => limit(async () => {
    started.push(i); peak = Math.max(peak, ++active); await new Promise(resolve => releases.push(resolve)); active--; return i;
  }));
  await tick(); assert.deepEqual(started, [0,1,2]);
  while (started.length < 20 || active) { releases.splice(0).forEach(resolve => resolve()); await tick(); }
  assert.deepEqual(await Promise.all(promises), Array.from({length:20}, (_,i)=>i)); assert.equal(peak, 3);
});
test('slot failures propagate identity and do not stall later work', async () => {
  const limit = pLimit(1), error = Error('failure');
  const tasks = [limit(() => {throw error;}), limit(() => Promise.reject(error)), limit(() => 3)];
  const results = await Promise.allSettled(tasks);
  assert.equal(results[0].reason, error); assert.equal(results[1].reason, error); assert.equal(results[2].value, 3); assert.equal(limit.activeCount, 0);
});
test('thenables are assimilated once, including throwing then getters', async () => {
  const limit = pLimit(1); let calls = 0; const error = Error('then');
  assert.equal(await limit(() => ({then(resolve,reject){calls++;resolve(8);reject(error);}})), 8);
  assert.equal(calls, 1); await assert.rejects(limit(() => ({get then(){throw error;}})), e=>e===error);
  assert.equal(await limit(() => 9), 9);
});
test('preserves submission async context for immediate and queued work', async () => {
  const storage = new AsyncLocalStorage(), limit = pLimit(3);
  await Promise.all(Array.from({length:100}, (_, id) => storage.run({id}, () => limit(async () => {
    assert.equal(storage.getStore().id, id); await tick(); assert.equal(storage.getStore().id, id);
  }))));
});
test('changing concurrency preserves FIFO and never cancels active tasks', async () => {
  const limit = pLimit(1), releases = [], started = [];
  const promises = Array.from({length:6}, (_,i)=>limit(async()=>{started.push(i);await new Promise(r=>releases.push(r));return i;}));
  await tick(); limit.concurrency = 3; assert.equal(started.length, 1);
  // A new submission must not jump the already queued work before the setter's microtask.
  promises.push(limit(()=>{started.push(6);return 6;}));
  await tick(); assert.deepEqual(started, [0,1,2]); limit.concurrency = 1;
  releases.splice(0).forEach(r=>r()); await tick(); assert.deepEqual(started, [0,1,2,3]);
  while (limit.activeCount) { releases.splice(0).forEach(r=>r()); await tick(); }
  assert.deepEqual(await Promise.all(promises), [0,1,2,3,4,5,6]); assert.deepEqual(started, [0,1,2,3,4,5,6]);
});
test('invalid concurrency setter is atomic', () => {
  const limit = pLimit(2); assert.throws(()=>{limit.concurrency=0;},TypeError); assert.equal(limit.concurrency,2);
});
test('clearQueue compatibility leaves discarded promises pending', async () => {
  const limit=pLimit(1); let release, ran=false, settled=false;
  const active=limit(()=>new Promise(r=>release=r)), pending=limit(()=>{ran=true;}); pending.then(()=>settled=true,()=>settled=true);
  limit.clearQueue(); await tick(); release(1); await active; await tick();
  assert.equal(ran,false); assert.equal(settled,false); assert.equal(limit.pendingCount,0); assert.equal(await limit(()=>2),2);
});
test('rejectOnClear aborts all pending work with one reason, preserving active work', async () => {
  const limit=pLimit({concurrency:1,rejectOnClear:true}); let release;
  const active=limit(()=>new Promise(r=>release=r)), pending=[limit(()=>assert.fail()),limit(()=>assert.fail())];
  const outcomes=Promise.allSettled(pending); limit.clearQueue(); limit.clearQueue();
  const results=await outcomes; assert.equal(results[0].reason.name,'AbortError'); assert.equal(results[0].reason,results[1].reason);
  assert.equal(limit.activeCount,1); release(7); assert.equal(await active,7); assert.equal(await limit(()=>8),8);
});
test('map supports detached use, array-like input and stable indexes', async () => {
  const {map}=pLimit(2); assert.deepEqual(await map({0:'a',1:'b',length:2}, async(v,i)=>{await tick();return v+i;}), ['a0','b1']);
  assert.deepEqual(await map(new Set([2,4]), (v,i)=>v+i), [2,5]); assert.deepEqual(await map([],()=>assert.fail()),[]);
});
test('failed iteration rejects immediately but observes all scheduled failures', async () => {
  const limit=pLimit(1), error=Error('iterator'), completed=[];
  function* values(){yield 1;yield 2;throw error;}
  await assert.rejects(limit.map(values(), async v=>{await tick();completed.push(v);throw Error('mapper');}), e=>e===error);
  assert.deepEqual(completed,[]); await limit(()=>{}); assert.deepEqual(completed,[1,2]);
});
test('limitFunction forwards sync/async results, args and queue clearing', async () => {
  const fn=pLimit.limitFunction((a,b)=>a+b,{concurrency:1}); assert.deepEqual(await Promise.all([fn(1,2),fn(3,4)]),[3,7]);
  const limited=pLimit.limitFunction(async v=>{await tick();return v;},{concurrency:1,rejectOnClear:true});
  const first=limited(1), second=limited(2); const outcome=assert.rejects(second,{name:'AbortError'});limited.clearQueue();await outcome;assert.equal(await first,1);
});
test('invalid task becomes a rejected promise without leaking a slot', async () => {
  const limit=pLimit(1);await assert.rejects(limit(null),TypeError);assert.equal(await limit(()=>4),4);
});
test('thousands of queued immediate results do not recurse', async () => {
  const limit=pLimit(1), result=await limit.map(Array.from({length:10000},(_,i)=>i),v=>v+1);
  assert.equal(result.length,10000);assert.equal(result[9999],10000);assert.equal(limit.activeCount,0);
});
