'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),schedule=require('..');
function frames(fn) {
 const before=[global.requestAnimationFrame,global.cancelAnimationFrame];let id=0;const queued=new Map(),all=new Map();
 global.requestAnimationFrame=cb=>{const key=id++;queued.set(key,cb);all.set(key,cb);return key};
 global.cancelAnimationFrame=key=>queued.delete(key);
 const step=()=>{const work=[...queued.values()];queued.clear();for(const cb of work)cb(0)};
 try{fn({queued,all,step})}finally{[global.requestAnimationFrame,global.cancelAnimationFrame]=before;}
}
test('latest args, zero frame id, cancellation and reuse',()=>frames(({queued,step})=>{
 const calls=[],fn=schedule((...args)=>calls.push(args));fn(1);fn(2,3);assert.equal(queued.size,1);step();assert.deepEqual(calls,[[2,3]]);
 fn(4);fn.cancel();fn.cancel();step();assert.equal(calls.length,1);fn();step();assert.deepEqual(calls,[[2,3],[]]);
}));
test('reentrant scheduling belongs to the next frame',()=>frames(({step,queued})=>{
 const calls=[],fn=schedule(value=>{calls.push(value);if(value===1)fn(2)});fn(1);step();assert.deepEqual(calls,[1]);assert.equal(queued.size,1);step();assert.deepEqual(calls,[1,2]);
}));
test('callback errors leave the scheduler reusable',()=>frames(({step})=>{
 let calls=0;const fn=schedule(()=>{if(++calls===1)throw Error('callback')});fn();assert.throws(step,/callback/);fn();step();assert.equal(calls,2);
}));
test('stale canceled callbacks cannot consume a newer request',()=>frames(({step,all})=>{
 const calls=[],fn=schedule(value=>calls.push(value));fn('old');const stale=all.get(0);fn.cancel();fn('new');stale();assert.deepEqual(calls,[]);step();assert.deepEqual(calls,['new']);
}));
test('a failed frame request can be retried',()=>frames(({step})=>{
 const request=global.requestAnimationFrame;global.requestAnimationFrame=()=>{throw Error('request')};const calls=[],fn=schedule(value=>calls.push(value));
 assert.throws(()=>fn('old'),/request/);global.requestAnimationFrame=request;fn('new');step();assert.deepEqual(calls,['new']);
}));
test('ESM default and CJS share one implementation',async()=>assert.equal((await import('../index.mjs')).default,schedule));
