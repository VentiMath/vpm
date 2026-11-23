'use strict';
// The app source is read from Git, compiled unchanged, and removed afterward.
// External services and unrelated helpers are explicit local stubs. No account,
// network, Firestore or Discord operation is performed.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const [app,ref='origin/main']=process.argv.slice(2);if(!app)throw Error('Pass the app checkout and optional revision');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-problem-caller-'));
const run=(cmd,args,cwd=temp)=>execFileSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:4e6});
try{
 const commit=run('git',['rev-parse',ref],app).trim(),source=run('git',['show',commit+':functions/src/problemPicture.ts'],app);
 fs.writeFileSync(temp+'/caller.ts',source);
 fs.writeFileSync(temp+'/utils.ts',`export const db={collection(name){if(name!=='problems')throw Error('Unexpected collection');return {doc(id){return {async get(){return {data:()=>({details:globalThis.syntheticProblem})};}};}};}};`);
 fs.writeFileSync(temp+'/problemAuthors.ts',`export const problemAuthorCredit=()=>null;`);
 fs.writeFileSync(temp+'/scoring.ts',`export const asIntegerTemplate=()=>{throw Error('Unexpected template');};export const integerTemplateParts=asIntegerTemplate;`);
 fs.mkdirSync(temp+'/node_modules');fs.symlinkSync(process.env.VPM_VLX_PACKAGE_DIR||path.resolve(__dirname,'../../packages/vlx'),temp+'/node_modules/vlx','dir');
 fs.writeFileSync(temp+'/probe.mjs',`import assert from 'node:assert/strict';import {problemPost} from './caller.mjs';import {pngSize} from 'vlx/problem';globalThis.fetch=()=>{throw Error('Unexpected network');};const phrase='Eight distinct synthetic numbers are arranged in a circular row. ';const results=[];for(const repetitions of [140,150,160,300]){globalThis.syntheticProblem={statement:phrase.repeat(repetitions)};const start=performance.now(),post=await problemPost('synthetic-only'),png=post.files[0];assert.equal(post.files.length,1);assert.equal(png.name,'problem.png');assert.equal(png.contentType,'image/png');assert(png.description.length<=1024);const dimensions=pngSize(png.data);assert.equal(dimensions.width,960);assert.equal(dimensions.height,({140:5509,150:5898,160:6287,300:11736})[repetitions]);results.push({repetitions,characters:globalThis.syntheticProblem.statement.length,...dimensions,bytes:png.data.length,ms:Math.round(performance.now()-start)});}console.log(JSON.stringify({runtime:process.versions.bun?'Bun':'Node',results}));`);
 run('bun',['build','caller.ts','--target=node','--format=esm','--packages=external','--outfile=caller.mjs']);
 const results=[];for(const runtime of ['node','bun'])results.push(JSON.parse(run(runtime,['probe.mjs'])));
 console.log(JSON.stringify({sourceCommit:commit,callerSHA256:createHash('sha256').update(source).digest('hex'),privateSourceExported:false,results},null,2));
}finally{fs.rmSync(temp,{force:true,recursive:true});}
