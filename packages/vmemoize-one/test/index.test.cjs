'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const memoize=require('..'),upstream=require('../../../scripts/memoize-conformance/node_modules/memoize-one');
test('single-result cache retains receiver, argument count, NaN and promise identity',()=>{
 let calls=0;const fn=memoize(function(...args){calls++;return {receiver:this,args};});
 const receiver={};const first=fn.call(receiver,NaN,0);assert.equal(fn.call(receiver,NaN,-0),first);
 assert.notEqual(fn(NaN,0),first);fn(NaN);assert.equal(calls,3);
 const promise=Promise.resolve(1),asyncMemo=memoize(()=>promise);assert.equal(asyncMemo(),promise);assert.equal(asyncMemo(),promise);
});
test('clear during evaluation cannot repopulate the invalidated cache',()=>{
 function probe(make){let calls=0,fn=make(()=>{calls++;fn.clear();return calls;});fn();fn();return calls;}
 assert.equal(probe(upstream),1);assert.equal(probe(memoize),2);
});
test('clear inside a comparator computes fresh rather than dereferencing a cleared entry',()=>{
 function probe(make){let calls=0,fn=make(()=>++calls,()=>{fn.clear();return true;});fn('x');return fn('x');}
 assert.throws(()=>probe(upstream),TypeError);assert.equal(probe(memoize),2);
});
test('reentrant comparison keeps the result paired with the compared arguments',()=>{
 function probe(make){let nested=false;const fn=make(x=>x,(a,b)=>{if(!nested){nested=true;fn('inner');nested=false;}return a[0]===b[0];});fn('outer');return fn('outer');}
 assert.equal(probe(upstream),'inner');assert.equal(probe(memoize),'outer');
});
test('exceptions preserve the previous successful entry and original error identity',()=>{
 const error=new Error('fixture');let calls=0;const fn=memoize(x=>{calls++;if(x==='bad')throw error;return {x};});
 const first=fn('ok');assert.throws(()=>fn('bad'),e=>e===error);assert.equal(fn('ok'),first);assert.equal(calls,2);
});
test('ordinary deterministic sequences match upstream, including custom comparators',()=>{
 for(const custom of [undefined,(a,b)=>a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))]){
  let ca=0,cb=0;const a=memoize((...values)=>[...values,++ca],custom),b=upstream((...values)=>[...values,++cb],custom);const obj={};
  const values=[undefined,null,0,-0,NaN,1,'text',obj];let state=3;
  for(let i=0;i<2000;i++){state=(state*1664525+1013904223)>>>0;const input=[values[state%8],values[(state>>>7)%8]];assert.deepEqual(a(...input),b(...input));if(i%13===0){a.clear();b.clear();}}
 }
 assert.throws(()=>memoize(null),TypeError);assert.throws(()=>memoize(()=>0,1),TypeError);
});
