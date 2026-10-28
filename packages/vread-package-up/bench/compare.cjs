'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {pathToFileURL}=require('node:url');
const {spawnSync}=require('node:child_process');
const vpm=require('..');
const {baseline}=require('../test/comparison.cjs');
const root=path.resolve(__dirname,'../../..');
const count=Number(process.env.COUNT||500),rounds=8;
assert.ok(Number.isSafeInteger(count)&&count>0,'COUNT must be a positive safe integer');
const median=values=>{const s=values.slice().sort((a,b)=>a-b);return(s[(s.length-1)>>1]+s[s.length>>1])/2;};
const retained=new Array(64);let checksum=0;
function consume(){for(const value of retained)if(value)checksum=(checksum+JSON.stringify(value).length)>>>0;}
function callSync(fn,options,diagnostic){try{return fn(options);}catch(error){if(!diagnostic)throw error;return error.message.length;}}
async function callAsync(fn,options,diagnostic){try{return await fn(options);}catch(error){if(!diagnostic)throw error;return error.message.length;}}
(async()=>{
 const upstream=await baseline();
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vread-package-up-bench-'));
 try {
  const manifest={name:'benchmark',type:'module',custom:{enabled:true}};
  function make(name,data=manifest,depth=0){const start=path.join(directory,name);let cwd=start;for(let i=0;i<depth;i++)cwd=path.join(cwd,'level'+i);fs.mkdirSync(cwd,{recursive:true});if(data!==undefined)fs.writeFileSync(path.join(start,'package.json'),JSON.stringify(data));return{cwd,stopAt:start,normalize:false};}
  const adjacent=make('adjacent'),four=make('four',manifest,4),twelve=make('twelve',manifest,12);
  const absent=make('absent',manifest,4);fs.unlinkSync(path.join(absent.stopAt,'package.json'));
  const skipped=make('skip-directory',manifest,1);fs.mkdirSync(path.join(skipped.cwd,'package.json'));
  const large=make('large',{name:'large',text:'雪'.repeat(22000)});
  const invalid=make('invalid');fs.writeFileSync(path.join(invalid.cwd,'package.json'),'{"secret":"payload", broken}');
  const cases=[['adjacent manifest',adjacent],['four ancestors',four],['twelve ancestors',twelve],['absent within boundary',absent],['file URL',{...adjacent,cwd:pathToFileURL(adjacent.cwd)}],['skip directory',skipped],['66 KB UTF-8 manifest',large],['malformed diagnostic',invalid,true]];
  for(const [,options,diagnostic]of cases)if(!diagnostic){assert.deepEqual(vpm.readPackageUpSync(options),upstream.readPackageUpSync(options));assert.deepEqual(await vpm.readPackageUp(options),await upstream.readPackageUp(options));}
  assert.throws(()=>vpm.readPackageUpSync(invalid),vpm.PackageJsonError);
  assert.throws(()=>upstream.readPackageUpSync(invalid));
  await assert.rejects(vpm.readPackageUp(invalid),vpm.PackageJsonError);
  await assert.rejects(upstream.readPackageUp(invalid));
  for(const api of [upstream,vpm])for(const [,options,diagnostic]of cases)for(let i=0;i<100;i++){
   callSync(api.readPackageUpSync,options,diagnostic);await callAsync(api.readPackageUp,options,diagnostic);
  }
  const rows=[];
  for(const mode of ['sync','async'])for(const [name,options,diagnostic=false]of cases){
   const implementations={upstream:upstream[mode==='sync'?'readPackageUpSync':'readPackageUp'],vpm:vpm[mode==='sync'?'readPackageUpSync':'readPackageUp']};
   const iterations=diagnostic?Math.max(50,Math.floor(count/3)):count;
   const invoke=mode==='sync'?callSync:callAsync;
   for(const fn of Object.values(implementations))for(let i=0;i<Math.min(iterations,100);i++)await invoke(fn,options,diagnostic);
   const samples={upstream:[],vpm:[]};
   for(let round=0;round<rounds;round++)for(const key of round%2?['vpm','upstream']:['upstream','vpm']){
    const start=performance.now();
    if(mode==='sync')for(let i=0;i<iterations;i++)retained[i&63]=callSync(implementations[key],options,diagnostic);
    else for(let i=0;i<iterations;i++)retained[i&63]=await callAsync(implementations[key],options,diagnostic);
    samples[key].push((performance.now()-start)*1e6/iterations);consume();
   }
   rows.push({case:name,mode,iterations,observableDifference:diagnostic?'Both reject; VPM emits a bounded path/position diagnostic instead of a JSON code frame.':undefined,upstreamNs:median(samples.upstream),vpmNs:median(samples.vpm),samples});
  }
  const entries={upstream:path.join(root,'scripts/consumers/node_modules/read-package-up/index.js'),vpm:path.join(__dirname,'../index.js')};
  const childSource=`const {performance}=require('node:perf_hooks');(async()=>{const start=performance.now();const api=await import(process.argv[1]);const result=await api.readPackageUp({cwd:process.argv[2],normalize:false});const ms=performance.now()-start;if(result.packageJson.name!=='benchmark')throw Error('bad output');process.stdout.write(JSON.stringify({ns:ms*1e6,name:result.packageJson.name}));})().catch(error=>{console.error(error);process.exitCode=1;});`;
  const startup={upstream:[],vpm:[]};
  for(let i=0;i<rounds;i++)for(const key of i%2?['vpm','upstream']:['upstream','vpm']){
   const child=spawnSync(process.execPath,['-e',childSource,pathToFileURL(entries[key]).href,adjacent.cwd],{encoding:'utf8',timeout:30000});assert.equal(child.status,0,child.stderr);startup[key].push(JSON.parse(child.stdout).ns);
  }
  rows.push({case:'fresh-process import and first async read',mode:'fresh-process',iterations:1,upstreamNs:median(startup.upstream),vpmNs:median(startup.vpm),samples:startup});
  const files=['packages/vread-package-up/index.js','packages/vread-package-up/package.json','packages/vread-package-up/PROVENANCE.json','packages/vread-package-up/test/fixtures/read-package-up-11.0.0.mjs','packages/vread-package-up/test/comparison.cjs','packages/vread-package-up/bench/compare.cjs','scripts/consumers/package-lock.json'];
  const result={recordedAt:new Date().toISOString(),runtime:process.versions,platform:process.platform,arch:process.arch,count,rounds,sampleOrder:'alternating, four samples in each order',warmup:'100 corpus calls per case/implementation/mode, then min(iterations,100) per case/implementation; no in-process warmup for fresh-process row',fixture:'Temporary local filesystem; OS cache is warm. No result cache. All parity cases use normalize:false.',units:'nanoseconds/call; includes filesystem I/O, parsing, output retention; fresh-process row excludes process launch',checksum,hashes:Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),rows};
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
  console.table(rows.map(r=>({case:r.mode+' '+r.case,upstream:Math.round(r.upstreamNs),vpm:Math.round(r.vpmNs),change:(100*(r.vpmNs/r.upstreamNs-1)).toFixed(1)+'%'})));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
