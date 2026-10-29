'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const http=require('node:http'),https=require('node:https'),net=require('node:net'),tls=require('node:tls');
const {once}=require('node:events');
const {Readable}=require('node:stream');
const upstream=require('../../../scripts/consumers/node_modules/agent-base'),vpm=require('..');
const calibration=process.env.CALIBRATION==='1',variants={upstream,vpm:calibration?upstream:vpm};
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return (a[(a.length-1)>>1]+a[a.length>>1])/2;};
const retain=new Array(64);let checksum=0;
function consume(){for(const result of retain)checksum=(checksum+(typeof result==='string'?result.length:result?1:0))>>>0;}
async function measure(fn,count,async){const start=performance.now();if(async){for(let i=0;i<count;i++)retain[i&63]=await fn();}else{for(let i=0;i<count;i++)retain[i&63]=fn();}const ns=(performance.now()-start)*1e6/count;consume();return ns;}

const cases=[],agents=[];
function add(name,make,validate,async=true){cases.push({name,make,validate,async});}
add('agent construction',lib=>()=>new lib.Agent({keepAlive:true}),a=>assert(a instanceof http.Agent),false);
add('protocol inference',lib=>{const a=new lib.Agent();return()=>a.protocol;},v=>assert.equal(v,'http:'),false);
add('HTTP pool name',lib=>{const a=new lib.Agent();const o={host:'localhost',port:80,protocol:'http:'};return()=>a.getName(o);},v=>assert.equal(v,'localhost:80:'),false);
add('TLS pool name',lib=>{const a=new lib.Agent();const o={host:'localhost',port:443,protocol:'https:',rejectUnauthorized:false};return()=>{const result=a.getName(o);return result;};},v=>assert(v.includes('localhost:443:')),false);
const chunk=Buffer.alloc(16384,65),chunks=Array(32).fill(Buffer.alloc(512,65));
add('collect one 16KiB chunk',lib=>()=>lib.toBuffer([chunk]),b=>assert.deepEqual(b,chunk));
add('collect 32 chunks',lib=>()=>lib.toBuffer(chunks),b=>assert.deepEqual(b,chunk));
add('collect 16KiB Readable',lib=>()=>lib.toBuffer(Readable.from([chunk])),b=>assert.deepEqual(b,chunk));
add('collect 32-chunk Readable',lib=>()=>lib.toBuffer(Readable.from(chunks)),b=>assert.deepEqual(b,chunk));
const valid=Buffer.from(JSON.stringify({value:'hello',numbers:[1,2,3]}));
add('parse JSON',lib=>()=>lib.json([valid]),v=>assert.deepEqual(v,{value:'hello',numbers:[1,2,3]}));
add('reject malformed JSON',lib=>async()=>{try{await lib.json([Buffer.from('{invalid')]);return false;}catch(e){return e instanceof SyntaxError;}},v=>assert.equal(v,true));
(async()=>{
  const ssl={key:fs.readFileSync(path.join(__dirname,'../test/tls-key.pem')),cert:fs.readFileSync(path.join(__dirname,'../test/tls-cert.pem'))};
  const plain=http.createServer((q,s)=>s.end('ok')),secure=https.createServer(ssl,(q,s)=>s.end('ok'));
  for(const server of [plain,secure]){server.listen(0,'127.0.0.1');await once(server,'listening');}
  function transfer(server,scheme,agent){return new Promise((resolve,reject)=>{(scheme==='https'?https:http).get(scheme+'://127.0.0.1:'+server.address().port,{agent,rejectUnauthorized:false},response=>{let body='';response.on('data',c=>body+=c);response.on('error',reject);response.on('end',()=>resolve(body));}).on('error',reject);});}
  for(const [name,server,scheme,keepAlive,async]of [
    ['HTTP keep-alive',plain,'http',true,false],['HTTP fresh sync connect',plain,'http',false,false],
    ['HTTP fresh async connect',plain,'http',false,true],['HTTPS keep-alive',secure,'https',true,false]]){
    add(name,lib=>{class Direct extends lib.Agent{connect(q,o){const socket=(o.secureEndpoint?tls:net).connect(o);return async?Promise.resolve(socket):socket;}}const a=new Direct({keepAlive});agents.push(a);return()=>transfer(server,scheme,a);},v=>assert.equal(v,'ok'));
  }
  add('eight queued HTTP requests',lib=>{class Direct extends lib.Agent{async connect(q,o){return net.connect(o);}}const a=new Direct({keepAlive:true,maxSockets:1});agents.push(a);return()=>Promise.all(Array.from({length:8},()=>transfer(plain,'http',a)));},v=>assert.deepEqual(v,Array(8).fill('ok')));
  const rows=[];
  try{
    for(const item of cases){
      const fns={};for(const [name,lib]of Object.entries(variants)){fns[name]=await item.make(lib);item.validate(await fns[name]());await measure(fns[name],16,item.async);}
      for(const name of ['upstream','vpm']){
        const estimate=await measure(fns[name],16,item.async);
        const block=Math.max(1,Math.min(100000,Math.ceil(10e6/estimate)));
        const until=performance.now()+200;
        do{await measure(fns[name],block,item.async);}while(performance.now()<until);
      }
      const pilot=await measure(fns.upstream,64,item.async);
      const iterations=Math.max(1,Math.min(100000,Math.ceil(20e6/pilot)));
      for(let round=0;round<4;round++)for(const name of round%2?['vpm','upstream']:['upstream','vpm'])await measure(fns[name],iterations,item.async);
      const samples={upstream:[],vpm:[]};
      for(let round=0;round<12;round++)for(const name of round%2?['vpm','upstream']:['upstream','vpm'])samples[name].push(await measure(fns[name],iterations,item.async));
      for(const name of Object.keys(fns))item.validate(await fns[name]());
      rows.push({case:item.name,iterations,samples});
    }
  }finally{for(const a of agents)a.destroy();for(const server of [plain,secure]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}

  const root=path.resolve(__dirname,'..');
  const files=['index.js','helpers.js','package.json','PROVENANCE.json','bench/compare.cjs','test/tls-key.pem','test/tls-cert.pem','../../scripts/consumers/package-lock.json',
    ...['index.js','helpers.js'].map(f=>'../../scripts/consumers/node_modules/agent-base/dist/'+f),'../../scripts/consumers/node_modules/agent-base/package.json'];
  const report={recordedAt:new Date().toISOString(),runtime:process.versions,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,calibration,rounds:12,checksum,
    methodology:'agent-base 7.1.4 versus vagent-base; 12 alternating paired rounds, 200ms per-variant warmup and four full-block warmups, 20ms upstream pilot target; 1–100000 operations per block. Outputs retained and validated outside timing. Three fresh processes plus identical-upstream control per runtime. Native local HTTP/TLS transfers use equivalent connection options; fresh cases disable keep-alive. Eight queued requests share a warm connection with maxSockets=1. Collection and JSON use identical iterable byte chunks. No trimming; nanoseconds per operation.',
    hashes:Object.fromEntries(files.sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),rows};
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.table(rows.map(r=>({case:r.case,upstream:Math.round(median(r.samples.upstream)),vpm:Math.round(median(r.samples.vpm)),change:(100*(median(r.samples.vpm.map((v,i)=>v/r.samples.upstream[i]))-1)).toFixed(1)+'%'})));
})().catch(error=>{console.error(error);process.exitCode=1;});
