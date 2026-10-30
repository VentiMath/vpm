'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=require('..'),upstream=require('../../../scripts/object-hash-conformance/node_modules/object-hash');
const {probes}=require('../../../scripts/object-hash-conformance/regressions.cjs');
for(const[name,probe]of Object.entries(probes))test(name,()=>probe(hash));
test('JSON string fast path preserves exact gax cache keys and UTF-16 length framing',()=>{
 for(const value of ['', 'ascii', 'é漢🦄', '\ud800', '\udfff', 'a'.repeat(65536),JSON.stringify({nested:{Message:{fields:{name:{type:'string',id:1}}}}})]){
  assert.equal(hash(value),upstream(value));assert.equal(hash(value),crypto.createHash('sha1').update('string:'+value.length+':').update(value).digest('hex'));
 }
});
test('ordinary generated values and all supported options preserve upstream digests',()=>{
 let seed=81421;const next=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function value(depth){const n=Math.floor(next()*(depth?8:5));if(n===0)return null;if(n===1)return next()<.5;if(n===2)return Math.floor(next()*100000)-50000;if(n===3)return ['é','🍎','plain','a:b,\0'][Math.floor(next()*4)];if(n===4)return undefined;if(n===5)return Array.from({length:Math.floor(next()*5)},()=>value(depth-1));if(n===6)return {z:value(depth-1),a:value(depth-1)};return new Set([1,'b',false]);}
 const options=[undefined,{respectType:false},{excludeValues:true},{unorderedObjects:false},{unorderedSets:false},{unorderedArrays:true},{respectFunctionNames:false,respectFunctionProperties:false},{algorithm:'SHA256',encoding:'base64'},{algorithm:'MD5',encoding:'buffer'},{algorithm:'passthrough',encoding:'utf8'},{excludeKeys:key=>key==='a'},{replacer:v=>v===null?'nil':v}];
 for(let i=0;i<1200;i++){const v=value(3);if(v===undefined)continue;for(const optionsForCase of options)assert.deepEqual(hash(v,optionsForCase),upstream(v,optionsForCase));}
});
test('streamed serialization matches one-shot bytes and never ends caller streams',()=>{
 for(const value of [{x:[1,'é']},new Set([Buffer.from([255]),Buffer.from([254])]),new DataView(new Uint8Array([2,3]).buffer),[,1],new Map([['a','b']])]){
  const chunks=[];let ended=false;hash.writeToStream(value,{write:x=>chunks.push(Buffer.from(x)),end:()=>{ended=true;}});const bytes=Buffer.concat(chunks);assert.equal(ended,false);
  assert.equal(crypto.createHash('sha1').update(bytes).digest('hex'),hash(value));assert.deepEqual(hash(value,{algorithm:'passthrough',encoding:'buffer'}),bytes);
  const digest=crypto.createHash('sha256');hash.writeToStream(value,{algorithm:'sha256'},digest);assert.equal(digest.digest('hex'),hash(value,{algorithm:'sha256'}));
 }
});
test('cycles and shared-reference graphs preserve ordinary behavior',()=>{
 const a={name:'a'},b={name:'b'};a.self=a;a.other=b;b.other=a;
 for(const value of [a,[a,b,a],new Set([a,b]),new Map([['a',a],['b',b]])])assert.equal(hash(value),upstream(value));
 const arr=[1];arr.push(arr);assert.equal(hash(arr,{unorderedArrays:true}),upstream(arr,{unorderedArrays:true}));
});
test('bigint typed arrays retain type and byte-window semantics',()=>{
 const a=new BigInt64Array([1n,-2n,3n]);assert.equal(hash(a.subarray(1)),hash(new BigInt64Array([-2n,3n])));assert.notEqual(hash(new BigInt64Array([1n])),hash(new BigUint64Array([1n])));assert.notEqual(hash(new BigInt64Array([1n])),hash(new BigInt64Array([2n])));
});
test('file metadata works on native Node and Bun File objects',()=>{
 const make=(content,time)=>new File([content],'name',{lastModified:time,type:'text/plain'});
 assert.equal(hash(make('aa',1)),hash(make('bb',1)));assert.notEqual(hash(make('aa',1)),hash(make('aa',2)));
 assert.throws(()=>hash(new Blob(['aa'])),/not supported/);assert.equal(hash(new Blob(['aa']),{ignoreUnknown:true}),hash(new Blob(['bb']),{ignoreUnknown:true}));
});
test('options are snapshotted once, validated and never mutated',()=>{
 const options=Object.freeze({algorithm:'SHA256',encoding:'BASE64',excludeValues:false});assert.equal(hash({a:1},options),upstream({a:1},options));
 let reads=0;assert.equal(hash('x',{get algorithm(){reads++;return 'sha1';}}),hash('x'));assert.equal(reads,1);
 for(const option of [{algorithm:''},{algorithm:'not-an-algorithm'},{encoding:'rot13'},{encoding:32},{replacer:12},{excludeKeys:null},{respectType:0}])assert.throws(()=>hash('x',option));
 assert.throws(()=>hash(undefined),/Object argument required/);assert.throws(()=>hash('x',[]),TypeError);
});
test('unordered binary collections remain order-independent and nonmutating',()=>{
 const a=Buffer.from([0,255]),b=Buffer.from([254,0]),list=[{a}, {b},'text'];const before=list.slice();assert.equal(hash(list,{unorderedArrays:true}),hash(list.slice().reverse(),{unorderedArrays:true}));assert.deepEqual(list,before);assert.deepEqual(a,Buffer.from([0,255]));
 const map=new Map([['a',[2,1]],['b',[4,3]]]);assert.equal(hash(map,{unorderedArrays:true}),hash(new Map([['b',[3,4]],['a',[1,2]]]),{unorderedArrays:true}));
});
test('CJS/ESM helpers and encoded outputs agree',async()=>{
 const esm=await import('../index.js');assert.equal(esm.default,hash);for(const name of ['sha1','keys','MD5','keysMD5','writeToStream'])assert.equal(esm[name],hash[name]);
 const v={a:1};assert.equal(hash.sha1(v),hash(v));assert.equal(hash.keys(v),upstream.keys(v));assert.equal(hash.MD5(v),upstream.MD5(v));assert.equal(hash.keysMD5(v),upstream.keysMD5(v));
 for(const encoding of ['hex','base64','binary','buffer'])assert.deepEqual(hash(v,{encoding}),upstream(v,{encoding}));
});
