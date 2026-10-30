'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/retry-conformance/node_modules/retry'),vpm=require('..');
const configs=Array.from({length:16},(_,i)=>({retries:5,factor:2,minTimeout:100+i,maxTimeout:1000}));
const errors=Array.from({length:32},(_,i)=>Error('failure-'+i%5));
const cases=[
 {name:'default ten-delay schedule',make:lib=>()=>lib.timeouts(),validate:x=>assert.deepEqual(x,[1000,2000,4000,8000,16000,32000,64000,128000,256000,512000])},
 {name:'capped five-delay schedule',make:lib=>{let i=0;return()=>lib.timeouts(configs[i++&15]);},validate:x=>{assert.equal(x.length,5);assert.equal(x[4],1000);}},
 {name:'configured operation creation',make:lib=>{let i=0;return()=>lib.operation(configs[i++&15]);},validate:x=>{assert.equal(x.attempts(),1);assert.equal(x.errors().length,0);}},
 {name:'reset reusable operation',make:lib=>{const op=lib.operation(configs[0]);return()=>{op.reset();return op;};},validate:x=>assert.equal(x.attempts(),1)},
 {name:'count 32 error messages',make:lib=>{const op=lib.operation();op.errors().push(...errors);return()=>op.mainError();},validate:x=>assert.equal(x,errors[31])},
 {name:'wrap one callback method',make:lib=>{let i=0;return()=>{const obj={read(cb){cb(null,i++);}};lib.wrap(obj,configs[i&15]);return obj.read;};},validate:x=>assert.equal(typeof x,'function')},
 {name:'wrapped successful call',make:lib=>{let i=0,output;const obj={read(value,cb){cb(null,value);}};lib.wrap(obj,configs[0]);const done=(e,v)=>{if(e)throw e;output=v;};return()=>{obj.read(i++&255,done);return output;};},validate:x=>assert.ok(Number.isInteger(x)&&x>=0&&x<256)},
];
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','retry-operation.js','bench/compare.cjs','../../scripts/retry-conformance/upstream/retry/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
