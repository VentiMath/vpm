'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/css-native-conformance/node_modules/postcss-value-parser');
const cases=[
 {name:'short shorthand parse',make:file=>{const p=require(file);return()=>p('1px solid #123').nodes},validate:x=>assert.equal(x.length,5)},
 {name:'nested CSS value parse',make:file=>{const p=require(file);return()=>p('linear-gradient(45deg, rgba(12, 34, 56, .5), var(--color, #fff))').nodes},validate:x=>assert.equal(x[0].type,'function')},
 {name:'parse walk and serialize',make:file=>{const p=require(file);return()=>p('translate(10px, 20px) scale(2)').walk(n=>{if(n.type==='word'&&n.value==='2')n.value='3'}).toString()},validate:x=>assert.equal(x,'translate(10px, 20px) scale(3)')},
 {name:'dimension decomposition',make:file=>{const p=require(file);return()=>p.unit('-1.5e2px')},validate:x=>assert.deepEqual(x,{number:'-1.5e2',unit:'px'})}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/css-native-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
