'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/retry-conformance/node_modules/async-retry'),vpm=require('..');
const values=Array.from({length:256},(_,i)=>({id:i})),errors=values.map(v=>Error('failure-'+v.id));
const check=x=>assert.ok(values.includes(x)),failCheck=x=>assert.ok(errors.includes(x));
const cases=[
 {name:'sync success default policy',async:true,make:lib=>{let i=0;return()=>{const value=values[i++&255];return lib(()=>value);};},validate:check},
 {name:'async success configured policy',async:true,make:lib=>{let i=0;const opts={retries:3,factor:2,minTimeout:10,maxTimeout:100,randomize:false};return()=>{const value=values[i++&255];return lib(async()=>value,opts);};},validate:check},
 {name:'thenable success',async:true,make:lib=>{let i=0;return()=>{const value=values[i++&255];return lib(()=>({then(resolve){resolve(value);}}),{retries:0});};},validate:check},
 {name:'terminal sync failure',async:true,make:lib=>{let i=0;return()=>{const error=errors[i++&255];return lib(()=>{throw error;},{retries:0}).catch(e=>e);};},validate:failCheck},
 {name:'terminal promise rejection',async:true,make:lib=>{let i=0;return()=>{const error=errors[i++&255];return lib(()=>Promise.reject(error),{retries:0}).catch(e=>e);};},validate:failCheck},
 {name:'explicit bail',async:true,make:lib=>{let i=0;return()=>{const error=errors[i++&255];return lib(bail=>bail(error),{retries:3,randomize:false}).catch(e=>e);};},validate:failCheck},
 {name:'one retry including 1ms timer',async:true,make:lib=>{let i=0;return()=>{const n=i++&255;return lib((bail,attempt)=>{if(attempt===1)throw errors[n];return values[n];},{retries:1,minTimeout:1,randomize:false});};},validate:check},
];
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','../vretry/index.js','../vretry/retry-operation.js','bench/compare.cjs','../../scripts/retry-conformance/upstream/retry/SHA256.json','../../scripts/retry-conformance/upstream/async-retry/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
