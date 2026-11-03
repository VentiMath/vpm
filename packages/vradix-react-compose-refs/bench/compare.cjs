'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const upstream=path.resolve(__dirname,'../../../scripts/compose-refs-conformance/node_modules/@radix-ui/react-compose-refs'),vpm=path.resolve(__dirname,'..');
function load(file){if(file===upstream)return require(file);return require('../../../scripts/compose-refs-conformance/load.cjs')('vpm')}
const cases=[
 {name:'compose two refs',make:file=>{const {composeRefs}=load(file),ref={current:null},callback=()=>{};return()=>composeRefs(ref,callback)},validate:value=>assert.equal(typeof value,'function')},
 {name:'attach object and plain callback',make:file=>{const {composeRefs}=load(file),ref={current:null},node={},composed=composeRefs(ref,()=>{});return()=>{const returned=composed(node);return returned===undefined&&ref.current===node}},validate:value=>assert.equal(value,true)},
 {name:'mixed refs / attach and cleanup',make:file=>{const {composeRefs}=load(file),ref={current:null},node={};let count=0;const composed=composeRefs(ref,()=>()=>count++,()=>{});return()=>{const cleanup=composed(node);cleanup();return ref.current===null&&count>0}},validate:value=>assert.equal(value,true)},
];
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/compose-refs-conformance/load.cjs','../../scripts/compose-refs-conformance/package-lock.json','../../scripts/compose-refs-conformance/node_modules/@radix-ui/react-compose-refs']}).catch(e=>{console.error(e);process.exitCode=1});
