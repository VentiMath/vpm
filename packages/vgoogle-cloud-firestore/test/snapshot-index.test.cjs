'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{SnapshotIndex}=require('../build/src/snapshot-index');
const compare=(a,b)=>a.score-b.score||a.id.localeCompare(b.id);
test('persistent document updates and ranks match a sorted oracle across 4000 changes',()=>{
 let seed=7,index=new SnapshotIndex(compare),oracle=[],versions=[];
 const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n};
 for(let i=0;i<4000;i++){
  if(i%80===0)versions.push([index,oracle.slice()]);
  if(oracle.length&&random(3)===0){const at=random(oracle.length),removed=index.remove(oracle[at]);assert.equal(removed.index,at);index=removed.tree;oracle.splice(at,1)}
  else {const value=Object.freeze({id:String(i),score:random(100)}),at=oracle.findIndex(x=>compare(x,value)>0),rank=at<0?oracle.length:at,added=index.insert(value);assert.equal(added.index,rank);index=added.tree;oracle.splice(rank,0,value)}
  assert.equal(index.length,oracle.length);if(i%31===0)assert.deepEqual(index.keys,oracle);
 }
 assert.deepEqual(index.keys,oracle);for(const [old,values]of versions)assert.deepEqual(old.keys,values);
});
test('ordered large insertions/removals use bounded comparator work and preserve old versions',()=>{
 for(const direction of [1,-1]){
  let calls=0;const compare=(a,b)=>{calls++;return a-b};let index=new SnapshotIndex(compare);
  for(let i=0;i<20000;i++){const before=calls,added=index.insert(i*direction);assert(calls-before<32);assert.equal(added.index,direction===1?i:0);index=added.tree}
  const saved=index;
  for(let i=0;i<20000;i++){const before=calls,removed=index.remove(i*direction);assert(calls-before<32);assert.equal(removed.index,direction===1?0:19999-i);index=removed.tree}
  assert.equal(index.length,0);assert.equal(saved.length,20000);assert.equal(saved.keys.length,20000);
 }
});
test('missing removal, equal-key replacement, throwing comparators and reentrant traversal preserve state',()=>{
 let broken=false;const compare=(a,b)=>{if(broken)throw Error('compare');return a.id-b.id};let index=new SnapshotIndex(compare);
 const first={id:1,value:'first'};index=index.insert(first).tree;const removed=index.remove({id:3});assert.equal(removed.tree,index);assert.equal(removed.index,1);
 const replacement={id:1,value:'second'},next=index.insert(replacement);assert.equal(next.index,0);assert.equal(next.tree.length,1);assert.equal(index.keys[0],first);assert.equal(next.tree.keys[0],replacement);
 broken=true;assert.throws(()=>index.insert({id:2}),/compare/);assert.throws(()=>index.remove({id:1}),/compare/);broken=false;assert.deepEqual(index.keys,[first]);
 index=index.insert({id:2}).tree;const old=index,seen=[];old.forEach(key=>{seen.push(key.id);index=index.remove(key).tree});assert.deepEqual(seen,[1,2]);assert.equal(index.length,0);assert.equal(old.length,2);
 assert.equal(old.forEach(()=> 'stop'),'stop');assert.throws(()=>new SnapshotIndex(null),TypeError);
});
