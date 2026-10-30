'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const imported=require('../../../scripts/queue-limit-conformance/node_modules/p-limit'),upstream=Object.assign(imported.default,{limitFunction:imported.limitFunction}),vpm=require('..');
const values=Array.from({length:256},(_,i)=>({id:i}));
const sync=value=>value,asyncFn=async value=>{await Promise.resolve();return value;};
const check=value=>assert.ok(values.includes(value));
const cases=[
 {name:'limiter creation',async:false,make:lib=>()=>lib(4),validate:x=>assert.equal(x.concurrency,4)},
 {name:'serial sync task',async:true,make:lib=>{const limit=lib(4);let i=0;return()=>limit(sync,values[i++&255]);},validate:check},
 {name:'serial async task',async:true,make:lib=>{const limit=lib(4);let i=0;return()=>limit(asyncFn,values[i++&255]);},validate:check},
 {name:'32 tasks at concurrency 4',async:true,make:lib=>{const limit=lib(4);let i=0;return()=>Promise.all(Array.from({length:32},()=>limit(asyncFn,values[i++&255])));},validate:x=>{assert.equal(x.length,32);x.forEach(check);}},
 {name:'map 32 at concurrency 4',async:true,make:lib=>{const limit=lib(4);let i=0;return()=>limit.map(Array.from({length:32},()=>values[i++&255]),sync);},validate:x=>{assert.equal(x.length,32);x.forEach(check);}},
 {name:'limited function wrapper',async:true,make:lib=>{const fn=lib.limitFunction(asyncFn,{concurrency:4});let i=0;return()=>fn(values[i++&255]);},validate:check},
 {name:'rejection and recovery',async:true,make:lib=>{const limit=lib(1);let i=0;const fail=value=>Promise.reject(value);return async()=>{const value=values[i++&255];try{await limit(fail,value);}catch(e){if(e!==value)throw e;}return limit(sync,value);};},validate:check},
];
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','../vyocto-queue/index.js','bench/compare.cjs','../../scripts/queue-limit-conformance/upstream/p-limit/SHA256.json','../../scripts/queue-limit-conformance/upstream/yocto-queue/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
