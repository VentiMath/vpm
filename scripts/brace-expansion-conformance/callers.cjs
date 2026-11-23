'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),fixture=require('./fixture.cjs');
const replacement=process.env.VPM_BRACE_PACKAGE||path.resolve(__dirname,'../../packages/vbrace-expansion');
const patterns=['{src,functions}/{api,ui}/**/*.{ts,tsx}','**/*.{js,ts,tsx}','src/{**,.hidden}/file.{js,ts}','{01..05..2}.txt','{a,b}{1..3}','x{a,{b,c}}z','x\\{y,z\\}','{{a,b}','{a,b}}','${a,b}{x,y}','{src,functions}/**/{index,main}.{ts,tsx}','{a..Z..3}'];
const files=['src/ui/a.tsx','functions/api/a.ts','src/.hidden/file.js','src/api/index.ts','src/api/main.tsx','src/a.js','01.txt','03.txt','05.txt','a1','b2','xbz','README.md'];
(async()=>{const control=fixture(),vpm=fixture(replacement);let comparisons=0;
 try{
  for(const name of ['minimatch','minimatch-app','minimatch-nine']){
   const a=control.req(name),b=vpm.req(name),matchA=a.minimatch||a,matchB=b.minimatch||b;
   for(const pattern of patterns)for(const options of [{},{dot:true},{nocase:true},{nobrace:true}]){
    assert.deepEqual(b.braceExpand(pattern,options),a.braceExpand(pattern,options),name+' '+pattern);comparisons++;
    for(const file of files){assert.equal(matchB(file,pattern,options),matchA(file,pattern,options),name+' '+file+' '+pattern);comparisons++;}
   }
  }
  for(const file of files){const target=path.join(control.root,'files',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'fixture');}
  const cwd=path.join(control.root,'files'),a=control.req('glob'),b=vpm.req('glob/raw');
  // glob's default archive entry bundles its dependencies. Its published raw
  // entry exercises the real source caller with external package resolution.
  const brace=vpm.req('brace-expansion'),original=brace.expand;let calls=0;
  brace.expand=(...args)=>{calls++;return original(...args);};
  for(const pattern of patterns)for(const dot of [false,true]){
   const options={cwd,dot,nodir:true};assert.deepEqual(b.globSync(pattern,options).sort(),a.globSync(pattern,options).sort());
   assert.deepEqual((await b.glob(pattern,options)).sort(),(await a.glob(pattern,options)).sort());comparisons+=2;
  }
  brace.expand=original;assert(calls>0,'glob/raw must actually invoke the replacement');
  // Confirm replacement really lies under the unchanged caller.
  const resolution=vpm.req.resolve('brace-expansion');assert(fs.readFileSync(resolution,'utf8').includes(replacement));
  console.log(comparisons+' unchanged minimatch 5/9/10 and glob 13 source sync/async comparisons pass.');
 }finally{control.close();vpm.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
