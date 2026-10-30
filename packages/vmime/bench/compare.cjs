'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const upstream=await import('../../../scripts/mime-conformance/node_modules/mime/dist/src/index.js'),vpm=require('..');
 const standard=require('../types/standard'),other=require('../types/other');
 const makeCases=[
  ['bare extension','txt','text/plain'],['Storage object','exports/2026/summary.JSON','application/json'],['Windows path','C:\\files\\images\\PHOTO.JPG','image/jpeg'],['long object path','folder/'.repeat(200)+'photo.jpg','image/jpeg'],['unknown extension','reports/no.such-extension',null],['extensionless path','folder/README',null]
 ].map(([name,input,expected])=>({name,make:lib=>()=>lib.mime.getType(input),validate:v=>assert.equal(v,expected)}));
 makeCases.push(
  {name:'reverse plain',make:lib=>()=>lib.mime.getExtension('application/json'),validate:v=>assert.equal(v,'json')},
  {name:'reverse parameters',make:lib=>()=>lib.mime.getExtension(' TEXT/HTML ; charset=utf-8'),validate:v=>assert.equal(v,'html')},
  {name:'all extensions copy',make:lib=>()=>lib.mime.getAllExtensions('image/jpeg'),validate:v=>assert.deepEqual(v,new Set(['jpeg','jpg','jpe']))},
  {name:'custom constructor',make:lib=>()=>new lib.Mime({'text/a':['a','a1'],'text/b':['b']}),validate:v=>assert.equal(v.getType('a1'),'text/a')},
  {name:'custom redefine',make:lib=>{const m=new lib.Mime({'text/a':['a']});return()=>m.define({'text/a':['a','a1']});},validate:v=>assert.equal(v.getType('a1'),'text/a')},
  {name:'full table construction',make:lib=>()=>new lib.Mime(standard,other),validate:v=>assert.equal(v.getType('docx'),'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
 );
 const runtime=['index.js','index.mjs','lite.js','lite.mjs','lib/Mime.js',...['standard','other'].flatMap(n=>['types/'+n+'.js','types/'+n+'.mjs'])];
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream:{mime:upstream.default,Mime:upstream.Mime},vpm:{mime:vpm,Mime:vpm.Mime},cases:makeCases,files:[...runtime,'bench/compare.cjs','../../scripts/mime-conformance/upstream/SHA256.json']});
})().catch(e=>{console.error(e);process.exitCode=1;});
