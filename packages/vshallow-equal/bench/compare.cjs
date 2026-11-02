'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const cases=[
 {name:'equal suggestion arrays',make:dir=>{const {shallowEqualArrays:equal}=require(dir),item={},a=[item,1,2,3,4],b=[item,1,2,3,4];return()=>equal(a,b)},validate:v=>assert.equal(v,true)},
 {name:'changed suggestion arrays',make:dir=>{const {shallowEqualArrays:equal}=require(dir),a=[1,2,3,4,5],b=[1,2,3,4,6];return()=>equal(a,b)},validate:v=>assert.equal(v,false)},
 {name:'equal props objects',make:dir=>{const {shallowEqualObjects:equal}=require(dir),a={a:1,b:2,c:3,d:4},b={d:4,c:3,b:2,a:1};return()=>equal(a,b)},validate:v=>assert.equal(v,true)},
 {name:'generic mixed kinds',make:dir=>{const {shallowEqual:equal}=require(dir),a=[],b={};return()=>equal(a,b)},validate:v=>assert.equal(v,false)},
];
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/shallow-equal-conformance/node_modules/shallow-equal'),vpm:root,cases,files:['package.json','index.cjs','bench/compare.cjs','../../scripts/shallow-equal-conformance/package-lock.json','../../scripts/shallow-equal-conformance/node_modules/shallow-equal']}).catch(e=>{console.error(e);process.exitCode=1});
