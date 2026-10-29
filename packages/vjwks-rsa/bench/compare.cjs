'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {createHash,createPublicKey}=require('node:crypto');
const {createRequire}=require('node:module');
const http=require('node:http');
const {once}=require('node:events');
const upstream=require('../../../scripts/consumers/node_modules/jwks-rsa');
const vpm=require('..');
const {keys}=require('../../vjwa/test/helpers.cjs');
const calibration=process.env.CALIBRATION==='1';
const variants={upstream,vpm:calibration?upstream:vpm};
const rsa={...keys.RSA.publicKey.export({format:'jwk'}),kid:'rsa',alg:'RS256'};
const ec={...keys.ES256.publicKey.export({format:'jwk'}),kid:'ec',alg:'ES256'};
const mixed=Array.from({length:8},(_,i)=>({...(i%2?ec:rsa),kid:'key-'+i}));
const rsaPem=keys.RSA.publicPem,ecPem=keys.ES256.publicPem;
const expectedMixed=mixed.map((_,i)=>i%2?ecPem:rsaPem);
function assertPem(actual,expected){assert.deepEqual(createPublicKey(actual).export({format:'der',type:'spki'}),createPublicKey(expected).export({format:'der',type:'spki'}));}
function assertMixed(values){assert.equal(values.length,8);values.forEach((pem,i)=>assertPem(pem,expectedMixed[i]));}
const median=xs=>{const a=xs.slice().sort((a,b)=>a-b);return (a[(a.length-1)>>1]+a[a.length>>1])/2;};
const retain=new Array(64);let checksum=0;
function consume(){for(const result of retain)checksum=(checksum+(typeof result==='string'?result.length:result?1:0))>>>0;}
async function measure(fn,count,async){const start=performance.now();if(async){for(let i=0;i<count;i++)retain[i&63]=await fn();}else{for(let i=0;i<count;i++)retain[i&63]=fn();}const ns=(performance.now()-start)*1e6/count;consume();return ns;}
const cases=[];
function add(name,make,validate,async=true){cases.push({name,make,validate,async});}
add('client creation',lib=>()=>lib({jwksUri:'https://example.invalid/keys'}),c=>assert.equal(typeof c.getSigningKey,'function'),false);
add('cached key Promise',async lib=>{const c=lib({fetcher:async()=>({keys:[rsa]})});await c.getSigningKey('rsa');return ()=>c.getSigningKey('rsa');},key=>assert.equal(key.kid,'rsa'));
add('cached key callback',async lib=>{const c=lib({fetcher:async()=>({keys:[rsa]})});await c.getSigningKey('rsa');return ()=>new Promise((resolve,reject)=>c.getSigningKey('rsa',(e,k)=>e?reject(e):resolve(k)));},key=>assert.equal(key.kid,'rsa'));
for(const [label,jwk]of [['RSA',rsa],['EC',ec]]){
  add(label+' import and PEM',lib=>{const c=lib({cache:false,fetcher:async()=>({keys:[jwk]})});return async()=> (await c.getSigningKey(jwk.kid)).getPublicKey();},pem=>assertPem(pem,label==='RSA'?rsaPem:ecPem));
}
add('eight-key import and PEM',lib=>{const c=lib({cache:false,fetcher:async()=>({keys:mixed})});return async()=> (await c.getSigningKeys()).map(k=>k.getPublicKey());},assertMixed);
add('repeated PEM export',async lib=>{const c=lib({fetcher:async()=>({keys:[rsa]})});const k=await c.getSigningKey('rsa');k.getPublicKey();return ()=>k.getPublicKey();},pem=>assertPem(pem,rsaPem),false);
add('concurrent eight-kid misses',lib=>async()=>{
  let requests=0;const c=lib({fetcher:async()=>{requests++;await new Promise(setImmediate);return {keys:mixed};}});
  const result=await Promise.all(mixed.map(k=>c.getSigningKey(k.kid)));
  assert.equal(requests,lib===upstream?8:1);return result.map(k=>k.getPublicKey());
},assertMixed);
add('missing-kid rejection',lib=>{const c=lib({cache:false,fetcher:async()=>({keys:[rsa]})});return async()=>{try{await c.getSigningKey('missing');return 'accepted';}catch(error){return error.name;}};},name=>assert.equal(name,'SigningKeyNotFoundError'));
add('Express cached key provider',lib=>{const provider=lib.expressJwtSecret({fetcher:async()=>({keys:[rsa]})});return ()=>provider({}, {header:{alg:'RS256',kid:'rsa'}});},pem=>assertPem(pem,rsaPem));
(async()=>{
  const payload=JSON.stringify({keys:mixed});
  const server=http.createServer((_req,res)=>{res.setHeader('content-type','application/json');res.end(payload);});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const uri='http://127.0.0.1:'+server.address().port+'/keys';
  const agents=[];
  add('HTTP sequential key miss',lib=>{const agent=new http.Agent({keepAlive:true});agents.push(agent);const c=lib({cache:false,jwksUri:uri,requestAgent:agent});return async()=> (await c.getSigningKey('key-0')).getPublicKey();},pem=>assertPem(pem,rsaPem));
  add('HTTP concurrent eight-kid misses',lib=>{const agent=new http.Agent({keepAlive:true});agents.push(agent);return async()=>{const c=lib({jwksUri:uri,requestAgent:agent});return (await Promise.all(mixed.map(k=>c.getSigningKey(k.kid)))).map(k=>k.getPublicKey());};},assertMixed);
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
  }finally{for(const a of agents)a.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  const root=path.resolve(__dirname,'..'),files=new Set(['index.js','package.json','PROVENANCE.json','bench/compare.cjs','../vjwa/test/fixtures/keys.json','../vdebug/index.js','../vms/index.js','../../scripts/consumers/package-lock.json']);
  for(const f of fs.readdirSync(path.join(root,'lib')))files.add('lib/'+f);
  const seen=new Set();function record(manifest){if(seen.has(manifest))return;seen.add(manifest);const dir=path.dirname(manifest),p=JSON.parse(fs.readFileSync(manifest));for(const f of fs.readdirSync(dir,{recursive:true})){if(f.startsWith('node_modules/')||!/(?:\.js|package\.json)$/.test(f))continue;files.add(path.relative(root,path.join(dir,f)));}const from=createRequire(manifest);for(const name of Object.keys(p.dependencies||{})){let child;try{child=from.resolve(name+'/package.json');}catch{for(const folder of from.resolve.paths(name)){const candidate=path.join(folder,name,'package.json');if(fs.existsSync(candidate)){child=candidate;break;}}}assert(child);record(child);}}
  record(path.resolve(root,'../../scripts/consumers/node_modules/jwks-rsa/package.json'));
  const report={recordedAt:new Date().toISOString(),runtime:process.versions,cpu:os.cpus()[0].model,platform:process.platform,arch:process.arch,calibration,rounds:12,checksum,
    methodology:'jwks-rsa 3.2.2 and vjwks-rsa; 12 alternating paired rounds, 200 ms per-variant warmup plus 4 full-block warmups after 16 initial calls, 20 ms upstream pilot target, 1–100000 operations per block. Outputs retained, consumed and validated; PEMs compared by SPKI bytes outside timing because upstream Bun omits the trailing newline. Three fresh processes plus one identical-upstream control per runtime. PEM cases include native import and actual export; repeated export starts warm. Eight-key JWKS alternates one RSA and one EC public key with eight distinct IDs. Concurrent cases create fresh clients; custom-fetch case asserts eight upstream fetches versus one VPM fetch. Local HTTP uses equivalent keep-alive agents. No trimming; nanoseconds per operation.',
    hashes:Object.fromEntries([...files].sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),rows};
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');
  console.table(rows.map(r=>({case:r.case,upstream:Math.round(median(r.samples.upstream)),vpm:Math.round(median(r.samples.vpm)),change:(100*(median(r.samples.vpm.map((v,i)=>v/r.samples.upstream[i]))-1)).toFixed(1)+'%'})));
})().catch(error=>{console.error(error);process.exitCode=1;});
