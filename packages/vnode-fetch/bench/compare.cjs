'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib'),{Readable}=require('node:stream'),{once}=require('node:events');
const upstream=require('../../../scripts/consumers/node_modules/node-fetch'),vpm=require('..'),cases=[],payload=Buffer.from(JSON.stringify({ok:true,message:'x'.repeat(1024)}));
function add(name,make,validate,async=true){cases.push({name,make,validate,async});}
add('Response construction',lib=>()=>new lib.Response('hello',{headers:{'content-type':'text/plain'}}),r=>assert.equal(r.status,200),false);
add('JSON body',lib=>()=>new lib.Response(payload).json(),r=>assert.equal(r.ok,true));
add('malformed JSON',lib=>async()=>{try{await new lib.Response('{invalid').json();return false;}catch(e){return e.type==='invalid-json';}},v=>assert(v));
const chunk=Buffer.alloc(16384,65),chunks=Array(32).fill(Buffer.alloc(512,65));
add('32-chunk 16KiB body',lib=>()=>new lib.Response(Readable.from(chunks)).buffer(),v=>assert.deepEqual(v,chunk));
(async()=>{
 const gzip=zlib.gzipSync(payload),server=http.createServer((q,s)=>{if(q.url==='/redirect'){s.writeHead(302,{location:'/json'});s.end();return;}if(q.method==='POST'){q.pipe(s);return;}s.setHeader('content-type','application/json');if(q.url==='/gzip')s.setHeader('content-encoding','gzip');s.end(q.url==='/gzip'?gzip:payload);});server.listen(0,'127.0.0.1');await once(server,'listening');const url='http://127.0.0.1:'+server.address().port,agents=[];
 for(const route of ['/json','/gzip'])add('HTTP '+route,lib=>{const agent=new http.Agent({keepAlive:true});agents.push(agent);return async()=>{const r=await lib(url+route,{agent});return r.json();};},v=>assert.equal(v.ok,true));
 add('HTTP streamed POST',lib=>{const agent=new http.Agent({keepAlive:true});agents.push(agent);return async()=>{const r=await lib(url,{agent,method:'POST',body:Readable.from([payload])});return r.json();};},v=>assert.equal(v.ok,true));
 await require('../../../scripts/bench-paired.cjs').run({root:path.resolve(__dirname,'..'),upstream,vpm,cases,files:['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/consumers/node_modules/node-fetch/lib/index.js','../../scripts/consumers/package-lock.json'],cleanup:async()=>{for(const a of agents)a.destroy();server.closeAllConnections();await new Promise(r=>server.close(r));}});
})().catch(e=>{console.error(e);process.exitCode=1;});
