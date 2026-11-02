'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
function frame(size){const b=Buffer.alloc(size+5,42);b[0]=0;b.writeUInt32BE(size,1);return b}
const small=frame(128),large=frame(16384),single=frame(4096);
const cases=[['complete 128B',[small]],['complete 16KiB',[large]],['coalesced 16 x 128B',[Buffer.concat(Array(16).fill(small))]],['fragmented 16KiB / 1KiB writes',Array.from({length:17},(_,i)=>large.subarray(i*1024,(i+1)*1024))],['fragmented 4KiB / one-byte writes',Array.from(single,(_,i)=>single.subarray(i,i+1))]].map(([name,chunks])=>({name,make:file=>{const {StreamDecoder}=require(file),d=new StreamDecoder(1024*1024);return()=>{let bytes=0;for(const c of chunks)for(const result of d.write(c))bytes+=result.length;return bytes}},validate:n=>assert.equal(n,chunks.reduce((a,b)=>a+b.length,0))}));
const harness=require('../../../scripts/bench-process.cjs'),options={root,upstream:path.resolve(root,'../../scripts/grpc-conformance/node_modules/@grpc/grpc-js/build/src/stream-decoder.js'),vpm:path.join(root,'build/src/stream-decoder.js'),files:['build/src/stream-decoder.js','bench/decoder.cjs','../../scripts/grpc-conformance/package-lock.json','../../scripts/grpc-conformance/node_modules/@grpc/grpc-js/build/src/stream-decoder.js']};
(async()=>{
 if(process.env.VPM_BENCH_WORKER){const i=Number(process.env.VPM_CASE);assert(Number.isInteger(i)&&i>=0&&i<cases.length);await harness.run({...options,cases:[cases[i]]});return}
 const dir=process.env.RESULT_DIR||path.join(__dirname,'decoder-results');require('node:fs').mkdirSync(dir,{recursive:true});
 for(let i=0;i<cases.length;i++){process.env.VPM_CASE=String(i);process.env.OUTPUT=path.join(dir,`${process.versions.bun?'bun':'node'}-${i}.json`);await harness.run({...options,cases:[cases[i]]})}
})().catch(e=>{console.error(e);process.exitCode=1});
