'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{EventEmitter}=require('node:events');
const upstream=require('../../../scripts/consumers/node_modules/https-proxy-agent'),vpm=require('..');
const oldParser=require('../../../scripts/consumers/node_modules/https-proxy-agent/dist/parse-proxy-response').parseProxyResponse;
const newParser=require('../lib/response').readResponse;
const {origin,proxy,request}=require('../test/helpers.cjs');
const calibration=process.env.CALIBRATION==='1',variants={upstream:{...upstream,parse:oldParser},vpm:calibration?{...upstream,parse:oldParser}:{...vpm,parse:newParser}};
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
const retain=new Array(64);let checksum=0;
async function measure(fn,count,async){const start=performance.now();if(async){for(let i=0;i<count;i++)retain[i&63]=await fn();}else for(let i=0;i<count;i++)retain[i&63]=fn();const ns=(performance.now()-start)*1e6/count;for(const result of retain)checksum=(checksum+(result?1:0))>>>0;return ns;}
const cases=[],agents=[],cleanups=[];const lifecycle={after:fn=>cleanups.push(fn)};
function add(name,make,validate,async=true){cases.push({name,make,validate,async});}
for(const [name,url,opts]of [
  ['construct plain agent','http://localhost:8080',{}],
  ['construct authenticated agent','https://alice:p%40ss@localhost:8080',{keepAlive:true}],
  ['construct custom headers','http://localhost:8080',{headers:{'X-Project':'sample','Proxy-Authorization':'Bearer opaque'}}]])
  add(name,lib=>()=>new lib.HttpsProxyAgent(url,opts),a=>assert.equal(a.proxy.hostname,'localhost'),false);
class Input extends EventEmitter{constructor(chunks){super();this.chunks=chunks;this.index=0;}read(){return this.chunks[this.index++]||null;}destroy(){}}
const short=Buffer.from('HTTP/1.1 200 Connection established\r\nProxy-Agent: test\r\n\r\n');
const long=Buffer.from('HTTP/1.1 200 OK\r\nX: '+'a'.repeat(16000)+'\r\n\r\n');
for(const [name,wire,size]of [['short CONNECT headers',short,short.length],['16KiB CONNECT headers',long,long.length],['16KiB headers in 256-byte chunks',long,256],['short headers in one-byte chunks',short,1]]){
  const chunks=[];for(let i=0;i<wire.length;i+=size)chunks.push(wire.subarray(i,i+size));
  add(name,lib=>()=>lib.parse(new Input(chunks),16384),r=>{assert.equal(r.connect.statusCode,200);assert.deepEqual(r.buffered,wire);});
}
(async()=>{
  const plain=await origin(lifecycle),secure=await origin(lifecycle,true),plainProxy=await proxy(lifecycle),secureProxy=await proxy(lifecycle,true);
  for(const [name,p,target,keepAlive]of [
    ['HTTP via HTTP proxy, keep-alive',plainProxy,plain,true],['HTTP via HTTP proxy, fresh tunnel',plainProxy,plain,false],
    ['HTTP via HTTPS proxy, fresh tunnel',secureProxy,plain,false],['HTTPS via HTTP proxy, keep-alive',plainProxy,secure,true],
    ['HTTPS via HTTP proxy, fresh tunnel',plainProxy,secure,false],['HTTPS via HTTPS proxy, fresh tunnel',secureProxy,secure,false]])
    add(name,lib=>{const a=new lib.HttpsProxyAgent(p.url,{keepAlive,rejectUnauthorized:false});agents.push(a);return()=>request(target.url,{agent:a,rejectUnauthorized:false});},r=>{assert.equal(r.status,200);assert.equal(r.body,'ok');});
  add('eight queued HTTP requests',lib=>{const a=new lib.HttpsProxyAgent(plainProxy.url,{keepAlive:true,maxSockets:1});agents.push(a);return()=>Promise.all(Array.from({length:8},()=>request(plain.url,{agent:a})));},r=>{assert.equal(r.length,8);for(const v of r)assert.equal(v.body,'ok');});
  const rows=[];
  try{
    for(const item of cases){
      const fns={};for(const [name,lib]of Object.entries(variants)){fns[name]=item.make(lib);item.validate(await fns[name]());await measure(fns[name],16,item.async);}
      for(const name of ['upstream','vpm']){const estimate=await measure(fns[name],16,item.async);const block=Math.max(1,Math.min(100000,Math.ceil(10e6/estimate)));const until=performance.now()+200;do{await measure(fns[name],block,item.async);}while(performance.now()<until);}
      const pilot=await measure(fns.upstream,32,item.async);const iterations=Math.max(1,Math.min(100000,Math.ceil(20e6/pilot)));
      for(let round=0;round<4;round++)for(const name of round%2?['vpm','upstream']:['upstream','vpm'])await measure(fns[name],iterations,item.async);
      const samples={upstream:[],vpm:[]};for(let round=0;round<12;round++)for(const name of round%2?['vpm','upstream']:['upstream','vpm'])samples[name].push(await measure(fns[name],iterations,item.async));
      for(const name of Object.keys(fns))item.validate(await fns[name]());rows.push({case:item.name,iterations,samples});
    }
  }finally{for(const a of agents)a.destroy();for(const close of cleanups.reverse())await close();}
  const root=path.resolve(__dirname,'..');
  const files=['index.js','index.d.ts','lib/options.js','lib/response.js','package.json','PROVENANCE.json','bench/compare.cjs','test/helpers.cjs','../vagent-base/index.js','../vagent-base/helpers.js','../vagent-base/test/tls-key.pem','../vagent-base/test/tls-cert.pem','../vdebug/index.js','../vms/index.js','../../scripts/consumers/package-lock.json',
    ...['index.js','parse-proxy-response.js'].map(f=>'../../scripts/consumers/node_modules/https-proxy-agent/dist/'+f),'../../scripts/consumers/node_modules/https-proxy-agent/package.json',
    '../../scripts/consumers/node_modules/agent-base/dist/index.js','../../scripts/consumers/node_modules/agent-base/package.json',
    ...['node.js','common.js','index.js'].map(f=>'../../scripts/consumers/node_modules/debug/src/'+f),'../../scripts/consumers/node_modules/ms/index.js'];
  const report={recordedAt:new Date().toISOString(),runtime:process.versions,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,calibration,rounds:12,checksum,
    methodology:'https-proxy-agent 7.0.6 versus vhttps-proxy-agent, including their own base/debug dependencies. 12 alternating paired rounds; 200ms per-variant warmup, four full-block warmups, 20ms upstream pilot target, 1–100000 operations per block. Results retained and validated outside timing. Three fresh processes plus identical-upstream control per runtime. Parser input uses an EventEmitter with one prebuilt chunk per read (no TCP coalescing). Real loopback HTTP/HTTPS proxies tunnel to HTTP/HTTPS destinations; fresh cases disable keep-alive, eight-request batch uses maxSockets=1. TLS fixture verification disabled equally on both sides solely for benchmark certificates. No trimming; ns per operation.',
    hashes:Object.fromEntries(files.sort().map(f=>[f,createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),rows};
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.table(rows.map(r=>({case:r.case,upstream:Math.round(median(r.samples.upstream)),vpm:Math.round(median(r.samples.vpm)),change:(100*(median(r.samples.vpm.map((v,i)=>v/r.samples.upstream[i]))-1)).toFixed(1)+'%'})));
})().catch(e=>{console.error(e);process.exitCode=1;});
