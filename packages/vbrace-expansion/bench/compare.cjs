'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/brace-expansion-conformance'),upstream=path.join(fixture,'node_modules/brace-expansion');
const api=file=>{const value=require(file);return value.expand||value;};
const cases=[
 {name:'Literal build path',make(file){const expand=api(file);return()=>expand('src/components/calendar.tsx');},validate:r=>assert.deepEqual(r,['src/components/calendar.tsx'])},
 {name:'File extension alternatives',make(file){const expand=api(file);return()=>expand('src/**/*.{ts,tsx,js,jsx}');},validate:r=>assert.equal(r.length,4)},
 {name:'Nested build pattern',make(file){const expand=api(file);return()=>expand('{src,functions}/{api,ui,{shared,test}}/*.{ts,tsx}');},validate:r=>assert.equal(r.length,16)},
 {name:'Padded numeric range',make(file){const expand=api(file);return()=>expand('case-{001..099..2}.json');},validate:r=>{assert.equal(r.length,50);assert.equal(r[49],'case-099.json');}},
 {name:'Unchanged minimatch caller',make(file){const f=require(path.join(fixture,'fixture.cjs'))(file);process.once('exit',f.close);const m=f.req('minimatch').minimatch;return()=>m('src/ui/panel.tsx','{src,functions}/**/*.{ts,tsx}');},validate:r=>assert.equal(r,true)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','../vbalanced-match/index.cjs','bench/compare.cjs','../../scripts/brace-expansion-conformance/fixture.cjs','../../scripts/brace-expansion-conformance/package-lock.json',path.relative(root,path.join(upstream,'dist/commonjs/index.js'))]}).catch(e=>{console.error(e);process.exitCode=1;});
