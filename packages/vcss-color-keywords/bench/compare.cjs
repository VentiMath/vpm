'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/css-colors-conformance/node_modules/css-color-keywords');
const cases=[
 {name:'mixed caller color lookups',make:file=>{const c=require(file),names=['red','aliceblue','rebeccapurple','aqua','darkslategrey','unknown'];let i=0;return()=>c[names[i++%names.length]]},validate:x=>assert(x===undefined||/^#[a-f0-9]{6}$/.test(x))},
 {name:'own color membership',make:file=>{const c=require(file),names=['red','constructor','rebeccapurple','unknown'];let i=0;return()=>Object.hasOwn(c,names[i++%names.length])},validate:x=>assert.equal(typeof x,'boolean')}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.json','index.cjs','index.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/css-colors-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
