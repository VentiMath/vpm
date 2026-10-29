'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/consumers/node_modules/json-bigint'),vpm=require('..'),cases=[];
function parse(name,text,options,check){cases.push({name,async:false,make:lib=>{const codec=lib(options);return()=>codec.parse(text);},validate:check});}
parse('metadata object','{"projectId":"test-project","numericProjectId":1234567890123456789,"zones":["us-west1-a","us-west1-b"]}',{},v=>{assert.equal(v.numericProjectId.toString(),'1234567890123456789');assert.equal(v.projectId,'test-project');});
parse('small ordinary object','{"ok":true,"count":42,"name":"hello","nested":{"value":null}}',{},v=>assert.equal(v.count,42));
parse('native bigint event','{"id":1234567890123456789,"data":{"total":9223372036854775807}}',{useNativeBigInt:true},v=>assert.equal(v.data.total,9223372036854775807n));
const list='['+Array.from({length:40},(_,i)=>'12345678901234567'+String(i).padStart(2,'0')).join(',')+']';
parse('large integer array',list,{},v=>assert.equal(v.length,40));
parse('escaped strings',JSON.stringify({a:'quoted "value"\n'.repeat(16),b:'😀\t\\'.repeat(12)}),{},v=>assert.equal(v.a.length,240));
cases.push({name:'exact number stringify',async:false,make:lib=>{const v=lib.parse('{"id":1234567890123456789,"fraction":1.234567890123456789}');return()=>lib.stringify(v);},validate:v=>assert.equal(v,'{"id":1234567890123456789,"fraction":1.234567890123456789}')});
cases.push({name:'ordinary stringify',async:false,make:lib=>{const v={ok:true,count:42,name:'hello',nested:{value:null}};return()=>lib.stringify(v);},validate:v=>assert.equal(JSON.parse(v).count,42)});
cases.push({name:'native bigint stringify',async:false,make:lib=>{const v={id:1234567890123456789n,data:{total:9223372036854775807n}};return()=>lib.stringify(v);},validate:v=>assert.equal(v,'{"id":1234567890123456789,"data":{"total":9223372036854775807}}')});
cases.push({name:'malformed JSON',async:false,make:lib=>()=>{try{lib.parse('{"id":1234567890123456789,"data":}');}catch(e){return e.name;}},validate:v=>assert.equal(v,'SyntaxError')});
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/consumers/node_modules/json-bigint/index.js','../../scripts/consumers/node_modules/json-bigint/lib/parse.js','../../scripts/consumers/node_modules/json-bigint/lib/stringify.js','../../scripts/consumers/node_modules/bignumber.js/bignumber.js','../../scripts/consumers/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1;});
