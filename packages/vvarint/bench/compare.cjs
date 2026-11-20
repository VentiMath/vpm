'use strict';
const path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), upstream=require.resolve('../../../scripts/varint-conformance/node_modules/varint');
const ids=[1,7,126,127,128,129,257,4095,8192,32767,65535,2**32+1,Number.MAX_SAFE_INTEGER];
const reference=require(upstream), frames=ids.map(id=>Buffer.from(reference.encode(id)));
const cases=[
  {name:'write compilation ID to Buffer',make(file){const api=require(file), buf=Buffer.alloc(8);let i=0;return()=>{api.encode(ids[i++%ids.length],buf);return buf[0]+api.encode.bytes;};},
   validate:n=>assert.ok(n>0&&n<264)},
  {name:'read compilation ID from Buffer',make(file){const api=require(file);let i=0;return()=>api.decode(frames[i++%frames.length]);},validate:n=>assert.ok(ids.includes(n))},
  {name:'size outgoing compilation ID',make(file){const api=require(file);let i=0;return()=>api.encodingLength(ids[i++%ids.length]);},validate:n=>assert.ok(n>=1&&n<=8)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/varint-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1;});
