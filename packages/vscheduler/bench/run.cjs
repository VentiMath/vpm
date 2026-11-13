'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/scheduler-conformance');
const createHost=require(fixture+'/host.cjs');
const cases=[
 {name:'schedule and drain 32 mixed-priority callbacks',make(file){const h=createHost(file,'immediate','native'),s=h.api;let count=0;const callback=()=>{count++};return()=>{count=0;for(let i=0;i<32;i++)s.unstable_scheduleCallback(i%5+1,callback);h.flush();return count;};},validate:n=>assert.equal(n,32)},
 {name:'schedule and cancel 32 delayed callbacks',make(file){const h=createHost(file,'immediate','native'),s=h.api,tasks=[];let count=0;const callback=()=>{count++};return()=>{for(let i=0;i<32;i++)tasks[i]=s.unstable_scheduleCallback(3,callback,{delay:10+i});for(let i=31;i>=0;i--)s.unstable_cancelCallback(tasks[i]);h.advance(50);h.flush();return count;};},validate:n=>assert.equal(n,0)},
 {name:'drain 16 two-stage continuations',make(file){const h=createHost(file,'immediate','native'),s=h.api;let count=0;const end=()=>{count++},begin=()=>{count++;return end};return()=>{count=0;for(let i=0;i<16;i++)s.unstable_scheduleCallback(3,begin);h.flush();return count;};},validate:n=>assert.equal(n,32)},
 {name:'real host batch of 32 callbacks',async:true,make(file){const s=require(file);return()=>new Promise(resolve=>{let count=0;const callback=()=>{if(++count===32)resolve(count)};for(let i=0;i<32;i++)s.unstable_scheduleCallback(3,callback);});},validate:n=>assert.equal(n,32)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream:fixture+'/node_modules/scheduler',vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/run.cjs','../../scripts/scheduler-conformance/host.cjs','../../scripts/scheduler-conformance/package-lock.json','../../scripts/scheduler-conformance/node_modules/scheduler']}).catch(e=>{console.error(e);process.exitCode=1});
