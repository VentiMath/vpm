'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ChannelzRegistry}=require('../build/src/channelz-registry');
test('numeric ordering, replacement, sparse pages and cleanup match a sorted Map oracle',()=>{
 const registry=new ChannelzRegistry(),oracle=new Map();let state=5731;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state};
 for(let i=0;i<2500;i++){
  const id=random()%400;
  if(random()%3){const value={i};registry.set(id,value);oracle.set(id,value)}else assert.equal(registry.delete(id),oracle.delete(id));
  const sorted=[...oracle].sort((a,b)=>a[0]-b[0]);assert.deepEqual([...registry],sorted);assert.equal(registry.size(),oracle.size);
  const start=random()%450,limit=random()%12,expected=sorted.filter(([id])=>id>=start);
  const page=registry.page(start,limit,value=>value);assert.deepEqual(page,{values:expected.slice(0,limit).map(([,v])=>v),end:expected.length<=limit});
 }
 registry.clear();assert.equal(registry.size(),0);assert.deepEqual([...registry],[]);
});
test('page callbacks can remove the current entry without skipping its successor',()=>{
 const registry=new ChannelzRegistry();for(const id of [1,3,5,7])registry.set(id,id);
 assert.deepEqual(registry.page(0,3,value=>{registry.delete(value);return value}),{values:[1,3,5],end:false});
 assert.deepEqual([...registry],[[7,7]]);
});
test('iteration handles inserts before and after its current ID and returns detached pairs',()=>{
 const registry=new ChannelzRegistry();registry.set(2,'two').set(4,'four');const iterator=registry.entriesFrom();const first=iterator.next().value;first[0]=99;first[1]='changed';
 registry.set(1,'one').set(3,'three');assert.deepEqual([...iterator],[[3,'three'],[4,'four']]);assert.equal(registry.get(2),'two');
 const active=registry.entriesFrom();active.next();registry.clear();assert.equal(active.next().done,true);
});
test('iteration, forEach and NaN starts retain the Channelz read contract',()=>{
 const registry=new ChannelzRegistry().set(8,'eight').set(2,'two');const values=[];registry.forEach((pair,index,owner)=>{assert.equal(owner,registry);values.push([pair,index])});
 assert.deepEqual(values,[[[2,'two'],0],[[8,'eight'],1]]);assert.equal(registry.getElementByKey(8),'eight');
 assert.deepEqual(registry.page(NaN,1,x=>x),{values:['two'],end:false});assert.deepEqual(registry.page(9,5,x=>x),{values:[],end:true});
});
test('ordered bulk insertion and deletion stay bounded in both directions',()=>{
 for(const descending of [false,true]){
  const registry=new ChannelzRegistry();for(let i=0;i<20000;i++){const id=descending?19999-i:i;registry.set(id,id)}
  assert.equal(registry.size(),20000);assert.deepEqual(registry.page(19995,10,x=>x),{values:[19995,19996,19997,19998,19999],end:true});
  for(let i=0;i<20000;i+=2)assert.equal(registry.delete(i),true);
  assert.deepEqual([...registry].map(([id])=>id),Array.from({length:10000},(_,i)=>2*i+1));
  for(let i=19999;i>=1;i-=2)assert.equal(registry.delete(i),true);assert.equal(registry.size(),0);
 }
});
test('invalid registration IDs fail before mutation; undefined is a valid stored value',()=>{
 const registry=new ChannelzRegistry().set(3,undefined);assert.equal(registry.size(),1);
 for(const id of [NaN,Infinity,-1,1.2,'3',2**53])assert.throws(()=>registry.set(id,'bad'),RangeError);
 assert.equal(registry.size(),1);assert.deepEqual([...registry],[[3,undefined]]);assert.equal(registry.delete(NaN),false);assert.equal(registry.get(NaN),undefined);assert.equal(registry.delete(3),true);
});
