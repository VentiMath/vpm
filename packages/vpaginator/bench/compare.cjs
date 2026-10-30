'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const upstream=require('../../../scripts/paginator-conformance/node_modules/@google-cloud/paginator'),vpm=require('..');
const cases=[];
for(const [name,query]of [['small query',{prefix:'reports/',maxResults:100}],['nested query',{prefix:'reports/',filter:{labels:{a:1,b:2},fields:['a','b','c']},maxApiCalls:5,highWaterMark:4}]])cases.push({name,async:false,make:lib=>()=>lib.paginator.parseArguments_([query]),validate:a=>{assert.equal(a.query.prefix,'reports/');assert.notEqual(a.query,query);}});
cases.push({name:'manual delegation',async:false,make:lib=>{const a=lib.paginator.parseArguments_([{autoPaginate:false}]);return()=>lib.paginator.run_(a,query=>query.autoPaginate);},validate:value=>assert.equal(value,false)});
for(const [name,pages,size,callback]of [['one-page promise',1,16,false],['one-page callback',1,16,true],['ten-page promise',10,16,false]])cases.push({name,async:true,make:lib=>()=>{
 let n=0;const request=(_q,cb)=>cb(null,Array.from({length:size},(_,i)=>i),++n<pages?{page:n}:null,{page:n});
 if(callback)return new Promise((resolve,reject)=>lib.paginator.run_(lib.paginator.parseArguments_([{},(e,...values)=>e?reject(e):resolve(values)]),request));
 return lib.paginator.run_(lib.paginator.parseArguments_([{}]),request);
},validate:result=>{assert.equal(result[0].length,pages*size);assert.equal(result[2].page,pages);}});
for(const [name,hwm]of [['stream 128 objects',16],['stream HWM 1',1]])cases.push({name,async:true,make:lib=>()=>new Promise((resolve,reject)=>{
 let count=0,sum=0;const stream=new lib.ResourceStream({query:{},maxResults:-1,maxApiCalls:-1,streamOptions:{highWaterMark:hwm}},(_q,cb)=>cb(null,Array.from({length:128},(_,i)=>i),null));
 stream.on('error',reject);stream.on('data',x=>{count++;sum+=x;if(hwm===1){stream.pause();setImmediate(()=>stream.resume());}});stream.on('end',()=>resolve([count,sum]));
}),validate:result=>assert.deepEqual(result,[128,8128])});
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','resource-stream.js','bench/compare.cjs','../vextend/index.js','../../scripts/paginator-conformance/upstream/SHA256.json']}).catch(e=>{console.error(e);process.exitCode=1;});
