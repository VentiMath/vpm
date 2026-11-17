"use strict";
const assert=require('node:assert/strict'),path=require('node:path'),root=path.resolve(__dirname,'..'),upstream=path.resolve(root,'../../scripts/camelize-conformance/node_modules/camelize');
const cases=[
 {name:'hyphenated CSS property',make:c=>()=>c('background-color'),validate:x=>assert.equal(x,'backgroundColor')},
 {name:'already camel-cased property',make:c=>()=>c('backgroundColor'),validate:x=>assert.equal(x,'backgroundColor')},
 {name:'vendor CSS property',make:c=>()=>c('-webkit-transform'),validate:x=>assert.equal(x,'WebkitTransform')},
 {name:'nested object keys',make:c=>{const x={font_size:16,style_list:[{background_color:'red',border_width:2},{font_weight:700}]};return()=>c(x)},validate:x=>assert.deepEqual(x,{fontSize:16,styleList:[{backgroundColor:'red',borderWidth:2},{fontWeight:700}]})}
];
for(const item of cases){const make=item.make;item.make=file=>make(require(file));}
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/camelize-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
