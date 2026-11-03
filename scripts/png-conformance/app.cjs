'use strict';
// Read-only local app verification; private application sources stay in a
// temporary directory and are never committed into this public repository.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const app=process.argv[2],ref=process.argv[3]||'origin/main';if(!app)throw Error('Usage: node app.cjs /path/to/ventimath-private [ref]');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-png-app-'));
try{
 const hashes={};
 for(const name of ['problemImage.ts','problemImage.test.ts']){const data=execFileSync('git',['show',ref+':functions/src/'+name],{cwd:app});hashes[name]=createHash('sha256').update(data).digest('hex');fs.writeFileSync(path.join(directory,name),data);}
 fs.symlinkSync(path.join(__dirname,'node_modules'),path.join(directory,'node_modules'),'dir');
 for(const variant of ['upstream','vpm']){
  const file=variant==='upstream'?require.resolve('pngjs'):path.resolve(__dirname,'../../packages/vpngjs/index.cjs');
  fs.writeFileSync(path.join(directory,'preload.cjs'),"const {mock,afterAll}=require('bun:test');const api=require("+JSON.stringify(file)+");let reads=0;mock.module('pngjs',()=>({PNG:{sync:{read(...args){reads++;return api.PNG.sync.read(...args)}}}}));afterAll(()=>{if(reads===0)throw Error('PNG substitution was not exercised');console.log('PNG substituted reads: '+reads)});\n");
  const result=spawnSync('bun',['test','--preload','./preload.cjs','./problemImage.test.ts'],{cwd:directory,encoding:'utf8',timeout:120000});assert.equal(result.status,0,result.stdout+result.stderr);console.log(variant, (result.stdout+result.stderr).split('\n').filter(l=>/pass|fail|Ran |PNG substituted reads:/.test(l)&&!l.startsWith('(pass)')).join('\n'));
 }
 console.log(JSON.stringify({appCommit:execFileSync('git',['rev-parse',ref],{cwd:app,encoding:'utf8'}).trim(),sourceSHA256:hashes}));
}finally{fs.rmSync(directory,{recursive:true,force:true});}
