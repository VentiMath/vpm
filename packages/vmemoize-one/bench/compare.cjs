'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const cases=[
 {name:'four-argument cache hit',make:dir=>{const fn=require(dir)((a,b,c,d)=>a+b+c+d);fn(1,2,3,4);return()=>fn(1,2,3,4);},validate:v=>assert.equal(v,10)},
 {name:'alternating misses',make:dir=>{const fn=require(dir)(a=>a+1);let i=0;return()=>fn(i++%2);},validate:v=>assert([1,2].includes(v))},
 {name:'receiver changes',make:dir=>{const fn=require(dir)(function(a){return this.n+a;}),receivers=[{n:1},{n:2}];let i=0;return()=>fn.call(receivers[i++%2],3);},validate:v=>assert([4,5].includes(v))},
 {name:'custom comparator hits',make:dir=>{const fn=require(dir)(x=>x.a,(a,b)=>a[0].a===b[0].a);fn({a:2});return()=>fn({a:2});},validate:v=>assert.equal(v,2)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/memoize-conformance/node_modules/memoize-one'),vpm:root,cases,files:['package.json','runtime.mjs','index.cjs','bench/compare.cjs','../../scripts/memoize-conformance/package-lock.json','../../scripts/memoize-conformance/node_modules/memoize-one']}).catch(e=>{console.error(e);process.exitCode=1;});
