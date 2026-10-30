'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const upstream=await import('../../../scripts/xml-helpers-conformance/node_modules/xml-naming/src/index.js'),vpm=require('..');
 const names=['PartNumber','ETag','UploadId','CompleteMultipartUpload','svg:circle','xlink:href','Item_12','soap:Envelope'];
 const cases=[
  {name:'direct ASCII QName',make:lib=>{let i=0;return()=>lib.qName(names[i++%names.length]);},validate:v=>assert.equal(v,true)},
  {name:'direct BMP QName',make:lib=>{let i=0;const values=['café','élève','αβ:雪','über:名字'];return()=>lib.qName(values[i++%values.length]);},validate:v=>assert.equal(v,true)},
  {name:'factory plus first check',make:lib=>()=>lib.createValidator('qName')('PartNumber'),validate:v=>assert.equal(v,true)},
  {name:'cached QName vocabulary',make:lib=>{let i=0;const check=lib.createValidator('qName');names.forEach(check);return()=>check(names[i++%names.length]);},validate:v=>assert.equal(v,true)},
  {name:'unique QName after cache cap',make:lib=>{let i=0;const check=lib.createValidator('qName',{maxCacheSize:16});for(let n=0;n<16;n++)check('seed'+n);return()=>check('tag'+i++);},validate:v=>assert.equal(v,true)},
  {name:'diagnostic invalid local start',make:lib=>()=>lib.validate('1bad','qName'),validate:v=>assert.equal(v.valid,false)},
  {name:'sanitize valid ASCII name',make:lib=>()=>lib.sanitize('PartNumber','qName'),validate:v=>assert.equal(v,'PartNumber')},
  {name:'sanitize invalid ASCII name',make:lib=>()=>lib.sanitize('bad name!','name'),validate:v=>assert.equal(v,'bad_name_')},
 ];
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','bench/compare.cjs','../../scripts/xml-helpers-conformance/upstream/SHA256.json']});
})().catch(e=>{console.error(e);process.exitCode=1;});
