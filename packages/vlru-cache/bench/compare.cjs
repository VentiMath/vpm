"use strict";
const path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),upstream=path.resolve(__dirname,"../../../scripts/source-map-conformance/node_modules/lru-current");
const cases=[
 {name:"Create bounded cache",make:file=>{const C=require(file).LRUCache;return()=>new C({max:256})},validate:c=>assert.equal(c.max,256)},
 {name:"Warm Babel-sized lookup",make:file=>{const C=require(file).LRUCache,c=new C({max:64});for(let i=0;i<64;i++)c.set("target"+i,i);let i=0;return()=>c.get("target"+(i++%64))},validate:v=>assert.equal(typeof v,"number")},
 {name:"DOM key cache churn",make:file=>{const C=require(file).LRUCache,c=new C({max:4096});let i=0;for(let n=0;n<4096;n++)c.set("selector"+n,n);return()=>{for(let n=0;n<16;n++)c.set("selector"+(i++%8192),i);return c.size}},validate:v=>assert.equal(v,4096)},
 {name:"Sized child-list updates",make:file=>{const C=require(file).LRUCache,c=new C({maxSize:1024,sizeCalculation:v=>v.length+1});let i=0;const v=["a","b","c"];for(let n=0;n<256;n++)c.set(n,v);return()=>{c.set(i++%512,v);return c.calculatedSize}},validate:v=>assert.equal(v,1024)}
];
require("../../../scripts/bench-process.cjs").run({root,upstream,vpm:root,cases,files:["index.cjs","index.mjs","package.json","bench/compare.cjs","../../scripts/source-map-conformance/node_modules/lru-current/dist/commonjs/index.js","../../scripts/source-map-conformance/package-lock.json"]}).catch(e=>{console.error(e);process.exitCode=1});
