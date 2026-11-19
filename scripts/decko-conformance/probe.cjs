'use strict';
const assert=require('node:assert/strict'),U=require('../eventemitter3-conformance/node_modules/decko'),V=require(process.env.VDECKO_ENTRY||'../../packages/vdecko');
function probe(D,seed){let state=seed,calls=0;const random=()=>state=(Math.imul(state,1664525)+1013904223)>>>0;const cache={seed:19};const f=D.memoize(function(key,x){calls++;return [String(key),x,this.id]},{cache,caseSensitive:seed%2===0});const keys=['',undefined,null,1,'1','ABC','abc','constructor','toString','seed',false];const trace=[];for(let i=0;i<100;i++)trace.push(f.call({id:random()%5},keys[random()%keys.length],random()%99));return {trace,calls,cache};}
for(let seed=0;seed<512;seed++)assert.deepEqual(probe(V,seed),probe(U,seed));
function timers(D){const old=global.setTimeout,queue=[],trace=[];global.setTimeout=(fn,delay)=>{queue.push([fn,delay]);return queue.length};try{for(const options of [undefined,3,{delay:4}]){const f=D.debounce(function(...a){trace.push([this.id,a])},options);for(let i=0;i<20;i++)f.call({id:i},i,i+1);trace.push(queue[0][1]);queue.shift()[0]();f.call({id:99},0);queue.shift()[0]();}return trace}finally{global.setTimeout=old}}
assert.deepEqual(timers(V),timers(U));
console.log('51,200 generated memoization operations and delayed-call windows match Decko 1.2.0');
