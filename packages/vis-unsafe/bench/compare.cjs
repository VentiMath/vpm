'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const upstream=await import('../../../scripts/xml-helpers-conformance/node_modules/is-unsafe/src/index.js'),vpm=require('..');
 const cases=[
  ['HTML/XML plain entity','isUnsafe','hello world',false],
  ['HTML/XML script entity','isUnsafe','<script>alert(1)</script>',true],
  ['HTML/XML XML comment','isUnsafe','<!-- comment -->',true],
  ['HTML/XML long plain text','isUnsafe','ordinary text 123 '.repeat(240),false],
  ['HTML/XML first reason','whyUnsafe','<script>alert(1)</script>','html-script-open'],
  ['HTML/XML all matches','allUnsafe','<script onclick="run()">',true],
 ].map(([name,method,value,expected])=>({name,make:lib=>{const contexts=[lib.HTML,lib.XML];return()=>lib[method](value,contexts);},validate:output=>assert.equal(method==='whyUnsafe'?output.id:method==='allUnsafe'?output.length>0:output,expected)}));
 cases.push({name:'custom nonstateful regex',make:lib=>{const pattern=/danger/i;return()=>lib.isUnsafe('danger',pattern);},validate:v=>assert.equal(v,true)});
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js',...fs.readdirSync(path.join(__dirname,'../contexts')).map(f=>'contexts/'+f),'bench/compare.cjs','../../scripts/xml-helpers-conformance/upstream/SHA256.json']});
})().catch(e=>{console.error(e);process.exitCode=1;});
