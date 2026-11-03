'use strict';
// The private caller suite is read from Git into a temporary directory. Only
// the import boundary changes; no test expectations or sources ship in VPM.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const app=process.argv[2],ref=process.argv[3]||'origin/main';if(!app)throw Error('Pass the local app repository');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-app-'));
try{
 const source=execFileSync('git',['show',ref+':functions/src/problemImage.test.ts'],{cwd:app});
 fs.writeFileSync(path.join(temp,'problemImage.test.ts'),source);
 fs.writeFileSync(path.join(temp,'problemImage.ts'),'export {};');
 fs.symlinkSync(path.resolve(__dirname,'../png-conformance/node_modules'),path.join(temp,'node_modules'),'dir');
 fs.writeFileSync(path.join(temp,'preload.cjs'),`const {mock,afterAll}=require('bun:test');const api=require(${JSON.stringify(path.join(__dirname,'load.cjs'))})('problem');let calls=0;mock.module('./problemImage',()=>({...api,renderProblemPng(...args){calls++;return api.renderProblemPng(...args)}}));afterAll(()=>{if(calls<28)throw Error('Substitution was not exercised');console.log('VLX problem calls: '+calls)});`);
 const result=spawnSync('bun',['test','--preload','./preload.cjs','./problemImage.test.ts'],{cwd:temp,encoding:'utf8',timeout:120000});
 if(result.status!==0)process.stderr.write(result.stdout+result.stderr);
 assert.equal(result.status,0,'Unchanged application picture tests failed');
 console.log((result.stdout+result.stderr).split('\n').filter(l=>/pass|fail|Ran |VLX problem calls:/.test(l)&&!l.startsWith('(pass)')).join('\n'));
 console.log(JSON.stringify({appCommit:execFileSync('git',['rev-parse',ref],{cwd:app,encoding:'utf8'}).trim(),testSHA256:createHash('sha256').update(source).digest('hex')}));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
