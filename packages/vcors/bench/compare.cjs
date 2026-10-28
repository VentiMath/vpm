'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const load = require('../test/load.cjs');
const implementations = [load('2.8.5'), load('2.8.6'), require('..')];
const count = Number(process.env.COUNT || 50000), rounds = 12;
const cases = [], orders = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
function getHeader(name) { return this.headers[name.toLowerCase()]; }
function setHeader(name,value) { this.headers[name.toLowerCase()] = value; }
function removeHeader(name) { delete this.headers[name.toLowerCase()]; }
function end() { this.ends++; }
function invoke(middleware, method, headers, existing) {
  const req = { method, headers };
  const res = { statusCode:200, headers: existing ? {vary:existing} : {}, ends:0, nexts:0, getHeader, setHeader, removeHeader, end };
  middleware(req,res,error=>{ if(error)throw error;res.nexts++; });
  assert.equal(res.ends+res.nexts,1);
  return res;
}
function normalized(result) {
  if(typeof result==='function')result=invoke(result,'GET',{origin:'https://ventimath.com'});
  return {status:result.statusCode, headers:result.headers, ends:result.ends, nexts:result.nexts};
}
function add(name, setup, iterations=count, deliberateDifference) {
  const functions=implementations.map(setup);
  const output=functions.map(fn=>normalized(fn(0)));
  assert.deepEqual(output[1],output[0],name);
  assert.deepEqual(output[2],deliberateDifference ? {...output[0],headers:{...output[0].headers,vary:'Origin'}} : output[0],name);
  cases.push({name,functions,iterations,deliberateDifference});
}
const configured={origin:['https://ventimath.com',/example\.test$/],methods:['GET','POST'],allowedHeaders:['Authorization','X-Test'],exposedHeaders:['X-Result'],credentials:true,maxAge:600};
add('create default middleware', C=>()=>C(),10000);
add('create configured middleware', C=>()=>C(configured),10000);
add('create configured and handle first GET', C=>()=>invoke(C(configured),'GET',{origin:'https://ventimath.com'}),10000);
function request(name,options,method='GET',headers={origin:'https://ventimath.com'},existing) {
  add(name,C=>{const middleware=C(options);return()=>invoke(middleware,method,headers,existing);});
}
request('default GET');
request('reflect origin GET',{origin:true});
request('fixed origin GET',{origin:'https://ventimath.com'});
request('four origin allowlist GET',{origin:['https://one.test','https://two.test','https://three.test','https://ventimath.com']});
request('250 origin allowlist GET',{origin:Array.from({length:250},(_,i)=>'https://host'+i+'.test')},'GET',{origin:'https://host249.test'});
request('RegExp origin GET',{origin:/^https:\/\/ventimath\.com$/});
request('disabled GET',{origin:false});
request('origin callback GET',{origin(_origin,callback){callback(null,true);}});
add('origin callback denial GET', C=>{const middleware=C({origin(_origin,callback){callback(null,false);}});return()=>invoke(middleware,'GET',{origin:'https://denied.test'});},count,'vcors additionally emits Vary: Origin for denied dynamic decisions');
request('options delegate GET',(_req,callback)=>callback(null,{origin:true,credentials:true}));
request('default OPTIONS',undefined,'OPTIONS');
request('reflected headers OPTIONS',{origin:true,credentials:true,maxAge:600},'OPTIONS',{origin:'https://ventimath.com','access-control-request-headers':'Authorization, X-Test'});
request('configured OPTIONS',configured,'OPTIONS');
request('continued OPTIONS',{...configured,preflightContinue:true},'OPTIONS');
request('existing Vary GET',{origin:true},'GET',{origin:'https://ventimath.com'},'Accept, Origin');
request('missing origin GET',{origin:true},'GET',{});
let checksum=0;
function measure(fn,iterations){const retained=new Array(256);const start=performance.now();for(let i=0;i<iterations;i++)retained[i&255]=fn(i);const elapsed=performance.now()-start;for(let result of retained)if(result){if(typeof result==='function')result=invoke(result,'GET',{origin:'https://ventimath.com'});checksum+=result.statusCode+result.ends+result.nexts+Object.keys(result.headers).length;}return elapsed*1e6/iterations;}
for(const entry of cases)for(const fn of entry.functions)measure(fn,Math.min(entry.iterations,5000));
const rows=[];
for(const entry of cases){for(const fn of entry.functions)measure(fn,Math.min(entry.iterations,20000));const samples=[[],[],[]];for(let round=0;round<rounds;round++)for(const i of orders[round%6])samples[i].push(measure(entry.functions[i],entry.iterations));const medians=samples.map(values=>{const s=values.slice().sort((a,b)=>a-b);return(s[5]+s[6])/2;});rows.push({case:entry.name,iterations:entry.iterations,deliberateDifference:entry.deliberateDifference,upstream285Ns:medians[0],upstream286Ns:medians[1],vpmNs:medians[2],samples});}
const root=path.resolve(__dirname,'../../..'),hashes={};
for(const file of ['packages/vcors/index.js','packages/vcors/PROVENANCE.json','packages/vcors/package.json','packages/vvary/index.js','packages/vcors/bench/compare.cjs','packages/vcors/test/load.cjs','packages/vcors/test/fixtures/cors-2.8.5.cjs','packages/vcors/test/fixtures/cors-2.8.6.cjs','packages/vcors/test/fixtures/object-assign-4.1.1.cjs','packages/vvary/test/fixtures/vary-1.1.2.cjs'])hashes[file]=createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const report={recordedAt:new Date().toISOString(),runtime:process.versions,platform:process.platform,arch:process.arch,count,rounds,implementations:['cors 2.8.5','cors 2.8.6','vcors'],sampleOrder:'all six permutations, twice',corpusWarmup:'min(iterations, 5000)',caseWarmup:'min(iterations, 20000)',units:'nanoseconds/call; synthetic HTTP objects, completion assertion and retention included; no network I/O',hashes,checksum,rows};
if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');
console.table(rows.map(r=>({case:r.case,'2.8.5':Math.round(r.upstream285Ns),'2.8.6':Math.round(r.upstream286Ns),VPM:Math.round(r.vpmNs)})));
console.log('Consumed checksum:',checksum);
