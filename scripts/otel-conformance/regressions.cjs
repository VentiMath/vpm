'use strict';
const assert=require('node:assert/strict'),upstream=require('api-current'),vpm=require('../../packages/vopentelemetry-api');
let seed=0x12345678,checks=0;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
let a=upstream.createTraceState(),b=vpm.createTraceState();
for(let i=0;i<10000;i++) {
 const key='k'+random()%35,value=String(random());if(random()%4===0){a=a.unset(key);b=b.unset(key);}else{a=a.set(key,value);b=b.set(key,value);}
 assert.equal(b.serialize(),a.serialize());for(const k of ['k0','k10',key])assert.equal(b.get(k),a.get(k));checks++;
}
for(let i=0;i<1000;i++) {
 const entries=Object.fromEntries(Array.from({length:random()%12},(_,j)=>['k'+j,{value:String(random())}]));let a=upstream.propagation.createBaggage(entries),b=vpm.propagation.createBaggage(entries);for(const key of ['k0','k4']){assert.deepEqual(b.getEntry(key),a.getEntry(key));a=a.removeEntry(key);b=b.removeEntry(key);}assert.deepEqual(b.getAllEntries(),a.getAllEntries());checks++;
}
const record={value:'original'},old=upstream.propagation.createBaggage({x:record}),safe=vpm.propagation.createBaggage({x:record});record.value='changed';assert.equal(old.getEntry('x').value,'changed');assert.equal(safe.getEntry('x').value,'original');old.getAllEntries()[0][1].value='leaked';assert.equal(old.getEntry('x').value,'leaked');
assert.equal(upstream.createTraceState().set('key','bad\r\nvalue').serialize(),'key=bad\r\nvalue');assert.equal(vpm.createTraceState().set('key','bad\r\nvalue').serialize(),'');
const parts=Array.from({length:33},(_,i)=>`a${i}=${i}`);assert.equal(upstream.createTraceState(parts.join(',')).serialize(),parts.slice(0,32).reverse().join(','));assert.equal(vpm.createTraceState(parts.join(',')).serialize(),parts.slice(0,32).join(','));
console.log(`${checks} exact valid-input comparisons; upstream controls reproduce input/output baggage mutation, invalid trace-state updates and reversed overflow ordering.`);
