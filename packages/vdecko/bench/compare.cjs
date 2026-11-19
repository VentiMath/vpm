'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/eventemitter3-conformance/node_modules/decko');
const cases=[
 {name:'bind function and invoke',make:file=>{const {bind}=require(file),ctx={id:4};function fn(n){return this.id+n}return()=>bind(fn,ctx)(3)},validate:x=>assert.equal(x,7)},
 {name:'lazy bound method construction and invoke',make:file=>{const {bind}=require(file),proto={m(n){return this.id+n}};Object.defineProperty(proto,'m',bind(proto,'m',Object.getOwnPropertyDescriptor(proto,'m')));return()=>{const o=Object.create(proto);o.id=4;return o.m(3)}},validate:x=>assert.equal(x,7)},
 {name:'memoized hit across 16 keys',make:file=>{const {memoize}=require(file),f=memoize(x=>x.length),keys=Array.from({length:16},(_,i)=>'key-'+String(i).padStart(2,'0'));for(const k of keys)f(k);let i=0;return()=>f(keys[i++&15])},validate:x=>assert.equal(x,6)},
 {name:'memoized construction and miss',make:file=>{const {memoize}=require(file);function f(x){return x.length}return()=>memoize(f)('contest')},validate:x=>assert.equal(x,7)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/eventemitter3-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
