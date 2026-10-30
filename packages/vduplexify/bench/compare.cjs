'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const {PassThrough, Writable} = require('node:stream');
const upstream = require('../../../scripts/duplexify-conformance/node_modules/duplexify'), vpm = require('..');
const cases = [
  {name:'unattached construction', async:false, make:lib=>()=>lib(), validate:stream=>assert.equal(stream.destroyed,false)},
  {name:'object construction', async:false, make:lib=>()=>lib.obj(), validate:stream=>assert.equal(stream._readableState.objectMode,true)},
];
for (const mode of ['binary','objects','delayed','backpressure']) cases.push({name:mode+' transfer',async:true,make:lib=>{
  const objectMode=mode==='objects', chunk=objectMode?{value:1}:Buffer.alloc(512,42), count=32;
  return ()=>new Promise((resolve,reject)=>{
    const child=new PassThrough({objectMode,highWaterMark:mode==='backpressure'?1:undefined});
    const stream=lib(undefined,undefined,{objectMode}); let size=0, finished=false, ended=false;
    stream.on('error',reject); stream.on('data',value=>{size+=objectMode?1:value.length;});
    const complete=()=>{if(finished&&ended){stream.destroy(); resolve(size);}};
    stream.on('finish',()=>{finished=true;complete();}); stream.on('end',()=>{ended=true;complete();});
    const attach=()=>{stream.setWritable(child);stream.setReadable(child);};
    if(mode!=='delayed')attach();
    for(let i=0;i<count;i++)stream.write(chunk); stream.end();
    if(mode==='delayed')attach();
  });
},validate:value=>assert.equal(value,mode==='objects'?32:16384)});
cases.push({name:'replace sink and finish',async:true,make:lib=>()=>new Promise((resolve,reject)=>{
  let count=0; const sink=()=>new Writable({write(c,e,cb){count+=c.length;cb();}}), first=sink(), second=sink();
  const stream=lib(first,null,{readable:false}); stream.on('error',reject);
  stream.on('finish',()=>{stream.destroy(); first.destroy();resolve(count);});
  stream.write('first');stream.setWritable(second);stream.end('second');
}),validate:value=>assert.equal(value,11)});
cases.push({name:'google-gax bidirectional stream',async:true,make:lib=>{
  const entry=require.resolve('../../../scripts/retry-request-conformance/node_modules/duplexify');
  const gax=require.resolve('../../../scripts/retry-request-conformance/node_modules/google-gax/build/src/streamingCalls/streaming.js');
  const previous=require(entry), previousGax=require.cache[gax]; require.cache[entry].exports=lib; delete require.cache[gax];
  const {StreamProxy,StreamType}=require(gax);
  require.cache[entry].exports=previous;
  if(previousGax)require.cache[gax]=previousGax;else delete require.cache[gax];
  return async()=>{
    const source=new PassThrough({objectMode:true});source.cancel=()=>source.destroy();
    const proxy=new StreamProxy(StreamType.BIDI_STREAMING,()=>{},false,false);proxy.setStream(()=>source,{});
    for(let i=0;i<32;i++)proxy.write({value:i});proxy.end();
    let sum=0;for await(const value of proxy)sum+=value.value;proxy.destroy();return sum;
  };
},validate:value=>assert.equal(value,496)});
require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,
  files:['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/duplexify-conformance/package-lock.json','../../scripts/duplexify-conformance/node_modules/duplexify/index.js','../../scripts/retry-request-conformance/package-lock.json','../../scripts/retry-request-conformance/node_modules/google-gax/build/src/streamingCalls/streaming.js']
}).catch(error=>{console.error(error);process.exitCode=1;});
