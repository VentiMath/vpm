'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const createHost=require('../../../scripts/scheduler-conformance/host.cjs');
const entry=process.env.VPM_SCHEDULER_ENTRY || path.resolve(__dirname,'../index.cjs');
const host=mode=>createHost(entry,mode);
test('import owns no timers or message channels',()=>{
 const h=host();assert.deepEqual(h.pending,{messages:0,timers:0});assert.equal(h.api.unstable_now(),0);
});
test('priority deadlines, FIFO peers, delay and expiration are distinct',()=>{
 const h=host(),s=h.api,out=[];
 for(const p of [5,4,3,2,1,3]) s.unstable_scheduleCallback(p,expired=>out.push([p,expired,s.unstable_getCurrentPriorityLevel()]));
 h.flush();assert.deepEqual(out,[[1,true,1],[2,false,2],[3,false,3],[3,false,3],[4,false,4],[5,false,5]]);
 s.unstable_scheduleCallback(2,expired=>out.push(['delayed',expired]),{delay:10});
 h.advance(9);h.flush();assert.equal(out.length,6);h.advance(261);h.flush();assert.deepEqual(out.at(-1),['delayed',true]);
});
test('cancel removes ready and delayed work and clears obsolete host timers',()=>{
 const h=host(),s=h.api;const tasks=[];
 for(let i=0;i<500;i++)tasks.push(s.unstable_scheduleCallback(3,()=>assert.fail('cancelled ran'),{delay:i%2?i:0}));
 for(const i of [...tasks.keys()].sort((a,b)=>(a*137%503)-(b*137%503)))s.unstable_cancelCallback(tasks[i]);
 assert.equal(h.pending.timers,0);h.flush();h.advance(1000);h.flush();assert.deepEqual(h.pending,{messages:0,timers:0});
 for(const t of tasks)s.unstable_cancelCallback(t);
});
test('self cancellation also suppresses a returned continuation',()=>{
 const h=host(),s=h.api,out=[];
 const task=s.unstable_scheduleCallback(3,()=>{out.push('first');s.unstable_cancelCallback(task);return()=>out.push('stale');});
 h.flush();assert.deepEqual(out,['first']);
});
test('continuations preserve priority and deadline and yield a host turn',()=>{
 const h=host(),s=h.api,out=[];
 s.unstable_scheduleCallback(2,expired=>{out.push([h.turns,expired]);h.advance(251);return expired=>out.push([h.turns,expired,s.unstable_getCurrentPriorityLevel()]);});
 s.unstable_scheduleCallback(3,()=>out.push(['normal',h.turns]));h.flush();
 assert.deepEqual(out,[[1,false],[2,true,2],['normal',2]]);
});
test('paint yields unexpired tasks but does not starve expired work',()=>{
 const h=host(),s=h.api,out=[];
 s.unstable_scheduleCallback(3,()=>{out.push(h.turns);s.unstable_requestPaint();s.unstable_scheduleCallback(1,()=>out.push(h.turns));});
 s.unstable_scheduleCallback(3,()=>out.push(h.turns));h.flush();assert.deepEqual(out,[1,1,2]);
});
test('callback failures retain unrelated work and restore the outer priority',()=>{
 const h=host(),s=h.api,out=[];
 s.unstable_scheduleCallback(2,()=>{s.unstable_scheduleCallback(1,()=>out.push('nested'));throw null;});
 s.unstable_scheduleCallback(3,()=>out.push('after'));
 let caught=false;try{h.tick()}catch(e){caught=true;assert.equal(e,null)}assert.equal(caught,true);
 assert.equal(s.unstable_getCurrentPriorityLevel(),3);h.flush();assert.deepEqual(out,['nested','after']);
});
test('wrappers preserve this, arguments, return values and priority through throws',()=>{
 const h=host(),s=h.api;let wrapped;
 s.unstable_runWithPriority(2,()=>{wrapped=s.unstable_wrapCallback(function(a,b){assert.equal(s.unstable_getCurrentPriorityLevel(),2);return this.x+a+b;});});
 assert.equal(s.unstable_runWithPriority(5,()=>wrapped.call({x:10},2,3)),15);
 assert.equal(s.unstable_getCurrentPriorityLevel(),3);
 assert.throws(()=>s.unstable_runWithPriority(1,()=>{throw Error('x')}),/x/);
 assert.equal(s.unstable_getCurrentPriorityLevel(),3);
});
test('large delays are capped per host wait instead of overflowing host timers',()=>{
 const h=host(),s=h.api;let ran=false;
 s.unstable_scheduleCallback(3,()=>{ran=true},{delay:2147483647+100});
 h.advance(2147483647);h.flush();assert.equal(ran,false);assert.equal(h.pending.timers,1);
 h.advance(100);h.flush();assert.equal(ran,true);
});
test('rescheduling an earlier delayed task cancels and replaces the wakeup',()=>{
 const h=host(),s=h.api,out=[];
 const late=s.unstable_scheduleCallback(3,()=>out.push('late'),{delay:50});
 const early=s.unstable_scheduleCallback(3,()=>out.push('early'),{delay:5});
 assert.equal(h.pending.timers,1);s.unstable_cancelCallback(early);assert.equal(h.pending.timers,1);
 h.advance(5);h.flush();assert.deepEqual(out,[]);h.advance(45);h.flush();assert.deepEqual(out,['late']);s.unstable_cancelCallback(late);
});
test('invalid work fails before it can acquire a host callback',()=>{
 const h=host(),s=h.api;
 assert.throws(()=>s.unstable_scheduleCallback(3,null),/function/);
 assert.throws(()=>s.unstable_scheduleCallback(3,()=>{},{delay:Infinity}),/finite/);
 assert.deepEqual(h.pending,{messages:0,timers:0});
 s.unstable_forceFrameRate(NaN);assert.equal(h.warnings.length,1);
 s.unstable_cancelCallback(null);s.unstable_cancelCallback({});
});
test('all available host fallbacks run and release ordinary work',()=>{
 for(const mode of ['immediate','channel','timeout']){const h=host(mode);let n=0;h.api.unstable_scheduleCallback(3,()=>{n++});h.flush();assert.equal(n,1);assert.deepEqual(h.pending,{messages:0,timers:0});}
});
