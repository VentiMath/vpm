'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/queue-limit-conformance/node_modules/yocto-queue').default,vpm=require('..');
const values=Array.from({length:256},(_,i)=>({id:i}));
const check=value=>assert.ok(values.includes(value));
const cases=[
 {name:'queue creation',async:false,make:Queue=>()=>new Queue(),validate:q=>assert.equal(q.size,0)},
 {name:'reused enqueue/dequeue',async:false,make:Queue=>{const q=new Queue();let i=0;return()=>{q.enqueue(values[i++&255]);return q.dequeue();};},validate:check},
 {name:'64-item FIFO burst',async:false,make:Queue=>{const q=new Queue();let i=0;return()=>{for(let n=0;n<64;n++)q.enqueue(values[i++&255]);let last;while(q.size)last=q.dequeue();return last;};},validate:check},
 {name:'rotate and iterate 64',async:false,make:Queue=>{const q=new Queue();for(let i=0;i<64;i++)q.enqueue(values[i]);let i=64;return()=>{q.dequeue();q.enqueue(values[i++&255]);let sum=0;for(const value of q)sum+=value.id;return sum;};},validate:x=>assert.ok(Number.isInteger(x)&&x>0&&x<16384)},
 {name:'drain 64 items',async:false,make:Queue=>{const q=new Queue();let i=0;return()=>{for(let n=0;n<64;n++)q.enqueue(values[i++&255]);let last;for(const value of q.drain())last=value;return last;};},validate:check},
 {name:'clear 64 and reuse',async:false,make:Queue=>{const q=new Queue();let i=0;return()=>{for(let n=0;n<64;n++)q.enqueue(values[i++&255]);q.clear();q.enqueue(values[i++&255]);return q.dequeue();};},validate:check},
];
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','bench/compare.cjs','../../scripts/queue-limit-conformance/upstream/yocto-queue/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
