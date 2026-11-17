'use strict';process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/css-native-conformance/node_modules/css-to-react-native');
const cases=[
 {name:'simple declarations',make:file=>{const p=require(file).default,a=[['color','red'],['font-size','16px'],['opacity','.8']];return()=>p(a)},validate:x=>assert.equal(x.fontSize,16)},
 {name:'box and border shorthands',make:file=>{const p=require(file).default,a=[['margin','4px 8px'],['padding','2px'],['border','1px solid #123']];return()=>p(a)},validate:x=>assert.equal(x.marginRight,8)},
 {name:'native component style',make:file=>{const p=require(file).default,a=[['flex','1 0 auto'],['font','bold 16px/20px "Arial"'],['box-shadow','1px 2px 3px rgba(0,0,0,.5)'],['transform','translate(2px, 3px) scale(1.2)']];return()=>p(a)},validate:x=>assert.equal(x.fontFamily,'Arial')}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','../vpostcss-value-parser/index.cjs','../vcamelize/index.cjs','../vcss-color-keywords/index.json','bench/compare.cjs','../../scripts/css-native-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
