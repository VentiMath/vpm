'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {performance}=require('node:perf_hooks');
const upstream=require('../test/fixtures/minimist-1.2.8.cjs');
const vpm=require('..');
const count=Number(process.env.COUNT||20000), rounds=10;
const framework=['node','server.js','--port=8080','--target=api','--source=functions','--signature-type=http','--timeout=60','--log-execution-id'];
const frameworkOptions={string:['port','target','signature-type','source','timeout','ignored-routes']};
const cases=[
 ['empty',[],undefined],
 ['Functions Framework arguments',framework,frameworkOptions],
 ['simple long flags',['--port','8080','--name','app','--verbose'],undefined],
 ['grouped short flags',['-abc','-n5','-x=word','file'],undefined],
 ['numeric values',['--a=1.5','--b=0xff','--c=1e5','--d=+3','--e=text'],undefined],
 ['repeated values',Array.from({length:30},(_,i)=>'--tag='+i),undefined],
 ['dotted values',Array.from({length:20},(_,i)=>'--config.field'+i+'='+i),undefined],
 ['aliases and booleans',['-v','--port','8080','file'],{alias:{verbose:'v',port:'p'},boolean:'verbose',string:'port',default:{name:'app'}}],
 ['unknown filter',['--known=1','--drop=2','word'],{string:'known',unknown:arg=>arg!=='--drop=2'}],
 ['stopEarly 1000 arguments',['file',...Array(999).fill('raw')],{stopEarly:true}],
];
let checksum=0;
const retained=new Array(256);
function consume(){for(const result of retained)if(result)checksum=(checksum+JSON.stringify(result).length)>>>0;}
const median=values=>{const sorted=values.slice().sort((a,b)=>a-b);return (sorted[(sorted.length-1)>>1]+sorted[sorted.length>>1])/2;};
function measure(fn,args,options,iterations){const start=performance.now();for(let i=0;i<iterations;i++)retained[i&255]=fn(args,options);const ns=(performance.now()-start)*1e6/iterations;consume();return ns;}
for(const [,args,options]of cases)assert.deepEqual(vpm(args,options),upstream(args,options));
for(const fn of [upstream,vpm])for(const [,args,options]of cases)for(let i=0;i<2000;i++)retained[i&255]=fn(args,options);
consume();
const rows=cases.map(([name,args,options])=>{
 const iterations=name.startsWith('stopEarly')?Math.max(1000,Math.floor(count/10)):count;
 for(const fn of [upstream,vpm])for(let i=0;i<Math.min(iterations,10000);i++)retained[i&255]=fn(args,options);
 const samples={upstream:[],vpm:[]};
 for(let i=0;i<rounds;i++)for(const key of i%2?['vpm','upstream']:['upstream','vpm'])samples[key].push(measure(key==='vpm'?vpm:upstream,args,options,iterations));
 return {case:name,iterations,upstreamNs:median(samples.upstream),vpmNs:median(samples.vpm),samples};
});
const root=path.resolve(__dirname,'../../..');
const files=['packages/vminimist/index.js','packages/vminimist/package.json','packages/vminimist/PROVENANCE.json','packages/vminimist/test/fixtures/minimist-1.2.8.cjs','packages/vminimist/bench/compare.cjs'];
const result={recordedAt:new Date().toISOString(),runtime:process.versions,platform:process.platform,arch:process.arch,count,rounds,sampleOrder:'alternating, five of each order',corpusWarmup:2000,caseWarmup:'min(iterations, 10000)',units:'nanoseconds/parse, including output allocation and retention; no process launch or I/O',hashes:Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),checksum,rows};
if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
console.table(rows.map(r=>({case:r.case,upstream:Math.round(r.upstreamNs),vpm:Math.round(r.vpmNs),change:(100*(r.vpmNs/r.upstreamNs-1)).toFixed(1)+'%'})));
