'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),fixture=require('./fixture.cjs');
const control=fixture(),own=fixture(process.env.VPM_PATH_SCURRY_PACKAGE||path.resolve(__dirname,'../../packages/vpath-scurry'));
const cwd=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vpm-scurry-glob-')));
const norm=rows=>Array.from(rows,x=>typeof x==='string'?x:x.fullpath()).sort();
(async()=>{try{
 for(let i=0;i<90;i++){const file=cwd+`/src/dir${i%7}/file${i}.${i%2?'ts':'js'}`;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'data');}
 fs.writeFileSync(cwd+'/.hidden','hidden');fs.symlinkSync('src/dir1',cwd+'/link');fs.symlinkSync('..',cwd+'/src/cycle');fs.symlinkSync('absent',cwd+'/broken');
 let checks=0;const a=control.req('glob/raw'),b=own.req('glob/raw');
 for(const pattern of ['**/*','src/**/*.ts','src/dir{1,3}/*.js','link/*','**/FILE*.TS'])for(const options of [{},{dot:true},{nodir:true},{withFileTypes:true},{ignore:'**/dir1/**'},{maxDepth:2},{follow:true},{realpath:true},{stat:true},{absolute:true},{nocase:true}]){
  const opts={cwd,...options},expected=norm(a.globSync(pattern,opts));
  assert.deepEqual(norm(b.globSync(pattern,opts)),expected,JSON.stringify([pattern,options,'sync']));checks++;
  assert.deepEqual(norm(await b.glob(pattern,opts)),expected,JSON.stringify([pattern,options,'async']));checks++;
  assert.deepEqual(norm(await b.globStream(pattern,opts).collect()),expected,JSON.stringify([pattern,options,'stream']));checks++;
  assert.deepEqual(norm(await b.globStreamSync(pattern,opts).collect()),expected,JSON.stringify([pattern,options,'streamSync']));checks++;
  assert.deepEqual(norm([...b.globIterateSync(pattern,opts)]),expected);checks++;
 }
 const slow=b.globStream('**/*',{cwd}),rows=[];for await(const row of slow){rows.push(row);await new Promise(r=>setImmediate(r));}assert.deepEqual(norm(rows),norm(a.globSync('**/*',{cwd})));checks++;
 for(const g of [a,b]){const abort=new AbortController(),s=g.globStream('**/*',{cwd,signal:abort.signal}),p=s.collect(),error=new Error('stop traversal');abort.abort(error);await assert.rejects(p,e=>e===error);checks++;}
 assert(own.calls()>=276,'replacement constructors must be used, including glob/raw');
 console.log(`${checks} unchanged glob 13.0.6 caller checks pass; ${own.calls()} replacement constructions.`);
}finally{control.close();own.close();fs.rmSync(cwd,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
