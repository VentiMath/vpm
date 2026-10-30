'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/cloud-utils-conformance/node_modules/@google-cloud/promisify'),vpm=require('..');
const cases=[
 {name:'wrapper creation',async:false,make:lib=>{const fn=(value,cb)=>cb(null,value);return()=>lib.promisify(fn);},validate:fn=>assert.equal(typeof fn,'function')},
 {name:'callback pass-through',async:false,make:lib=>{const fn=lib.promisify((value,cb)=>{cb(null,value);return value;}),cb=()=>{};return()=>fn(42,cb);},validate:x=>assert.equal(x,42)},
 {name:'single-result promise',async:true,make:lib=>{const fn=lib.promisify((value,cb)=>cb(null,value));return()=>fn(42);},validate:x=>assert.deepEqual(x,[42])},
 {name:'multi-result promise',async:true,make:lib=>{const fn=lib.promisify((value,cb)=>cb(null,value,'response',false));return()=>fn(42);},validate:x=>assert.deepEqual(x,[42,'response',false])},
 {name:'singular promise',async:true,make:lib=>{const fn=lib.promisify((value,cb)=>cb(null,value),{singular:true});return()=>fn(42);},validate:x=>assert.equal(x,42)},
 {name:'promise to callback',async:true,make:lib=>{const fn=lib.callbackify(async value=>[value,'response']);return()=>new Promise((resolve,reject)=>fn(42,(e,n,text)=>e?reject(e):resolve([n,text])));},validate:x=>assert.deepEqual(x,[42,'response'])},
 {name:'wrap 20 class methods',async:false,make:lib=>()=>{class C{}for(let i=0;i<20;i++)Object.defineProperty(C.prototype,'method'+i,{value:cb=>cb(null,i),writable:true,configurable:true});lib.promisifyAll(C);return C;},validate:C=>assert.equal(C.prototype.method19.promisified_,true)}
];
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','bench/compare.cjs','../../scripts/cloud-utils-conformance/upstream/promisify/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
