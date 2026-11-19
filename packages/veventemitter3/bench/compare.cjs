'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/eventemitter3-conformance/node_modules/eventemitter3');
const cases=[
 ...[1,8].map(listeners=>({name:listeners+' listeners, two-argument dispatch',make:file=>{const C=require(file),e=new C;let sum=0;for(let i=0;i<listeners;i++)e.on('value',(a,b)=>{sum+=a+b});return()=>{sum=0;e.emit('value',2,3);return sum}},validate:x=>assert.equal(x,5*listeners)})),
 {name:'seven-argument dispatch',make:file=>{const C=require(file),e=new C;let value;e.on('value',(...a)=>{value=a.join(',')});return()=>{e.emit('value',1,2,3,4,5,6,7);return value}},validate:x=>assert.equal(x,'1,2,3,4,5,6,7')},
 {name:'once registration and dispatch',make:file=>{const C=require(file),e=new C;let value=0;function f(x){value=x}return()=>{e.once('value',f);e.emit('value',7);return value+e.listenerCount('value')}},validate:x=>assert.equal(x,7)},
 {name:'subscribe, emit and unsubscribe',make:file=>{const C=require(file),e=new C;let value;function cb(x){value=x}return()=>{e.on('hashchange',cb);e.emit('hashchange','contests');e.off('hashchange',cb);return value+e.listenerCount('hashchange')}},validate:x=>assert.equal(x,'contests0')},
 {name:'construct and clear three subscriptions',make:file=>{const C=require(file);function f(){}return()=>{const e=new C;e.on('alpha',f).on('beta',f).on('gamma',f);e.removeAllListeners();return e.eventNames().length}},validate:x=>assert.equal(x,0)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/eventemitter3-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
