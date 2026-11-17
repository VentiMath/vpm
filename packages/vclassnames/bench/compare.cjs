'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/classnames-conformance/node_modules/classnames');
const cases=[
 {name:'Redoc operation classes',entry:'index',make:c=>()=>c('operation-type',{get:true,deprecated:false}),expected:'operation-type get'},
 {name:'conditional nested classes',entry:'index',make:c=>()=>c('button',['size-sm',[{active:true,disabled:false}]],false,'caller'),expected:'button size-sm active caller'},
 {name:'CSS module binding',entry:'bind',make:c=>{const fn=c.bind({button:'b123',active:'a456'});return()=>fn('button',{active:true,disabled:false},'caller')},expected:'b123 a456 caller'},
 {name:'deduplicated state classes',entry:'dedupe',make:c=>()=>c('button active','button',{active:false},['caller']),expected:'button caller'},
];
for(const item of cases){const make=item.make;item.make=file=>make(require(file+'/'+item.entry+(file===root?'.cjs':'.js')));item.validate=x=>assert.equal(x,item.expected);}
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['runtime.cjs','index.cjs','index.mjs','bind.cjs','dedupe.cjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/classnames-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
