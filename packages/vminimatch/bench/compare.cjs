'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/minimatch-conformance/node_modules/minimatch');
const cases=[
 {name:'Distinct pattern construction and match',make(file){const {minimatch}=require(file);let i=0;return()=>{const id=++i;return minimatch('src/item-'+id+'.ts','src/item-'+id+'.{ts,tsx}');};},validate:r=>assert.equal(r,true)},
 {name:'Repeated literal public call',make(file){const {minimatch}=require(file);return()=>minimatch('src/ui/card.tsx','src/ui/card.tsx');},validate:r=>assert.equal(r,true)},
 {name:'Repeated build-glob public call',make(file){const {minimatch}=require(file);return()=>minimatch('src/ui/card.tsx','{src,functions}/**/*.{ts,tsx}');},validate:r=>assert.equal(r,true)},
 {name:'Reused build matcher',make(file){const {Minimatch}=require(file),m=new Minimatch('{src,functions}/**/*.{ts,tsx}');let i=0;const paths=['src/a.ts','functions/src/a.ts','src/ui/card.tsx','src/deep/ui/a.tsx'];return()=>m.match(paths[i++&3]);},validate:r=>assert.equal(r,true)},
 {name:'Reused URL header matcher',make(file){const {Minimatch}=require(file),m=new Minimatch('api.example.org/**');return()=>m.match('api.example.org/v1/schema.json');},validate:r=>assert.equal(r,true)},
 {name:'Negated extglob test exclusion',make(file){const {Minimatch}=require(file),m=new Minimatch('**/!(*.test).tsx');let i=0;const paths=['src/ui/card.test.tsx','src/ui/panel.test.tsx','src/api.test.tsx','other/deep/data.test.tsx'];return()=>m.match(paths[i++&3]);},validate:r=>assert.equal(r,false)},
 {name:'Compact numeric range',make(file){const {Minimatch}=require(file),m=new Minimatch('src/a{0..1000000}.js');let i=0;const paths=['src/a950001.js','src/a12.js','src/a1000000.js','src/a1200.js'];return()=>m.match(paths[i++&3]);},validate:r=>assert.equal(r,true)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','matcher.cjs','../vbrace-expansion/index.cjs','../vbalanced-match/index.cjs','bench/compare.cjs','../../scripts/minimatch-conformance/package-lock.json',path.relative(root,path.join(upstream,'dist/commonjs/index.js'))]}).catch(e=>{console.error(e);process.exitCode=1;});
