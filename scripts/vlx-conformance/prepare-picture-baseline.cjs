'use strict';
// Reconstruct the published 0.2.0 source in ignored fixture storage.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),commit='98b7ad6baf3a244a0b5b51c7b43c98e03764eedb',dest=path.join(__dirname,'node_modules/.vlx-before-picture-fixes');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-picture-baseline-'));
try{
 fs.writeFileSync(path.join(temp,'source.tar'),execFileSync('git',['archive','--format=tar',commit,'packages/vlx'],{cwd:root,maxBuffer:32e6}));
 execFileSync('tar',['-xf',path.join(temp,'source.tar'),'-C',temp]);
 fs.mkdirSync(dest,{recursive:true});for(const name of fs.readdirSync(path.join(temp,'packages/vlx'))){
  const file=path.join(temp,'packages/vlx',name);if(fs.statSync(file).isDirectory()&&name!=='font')continue;
  fs.cpSync(file,path.join(dest,name),{recursive:true});
 }
 const modules=path.join(dest,'node_modules');fs.mkdirSync(modules,{recursive:true});
 if(!fs.existsSync(path.join(modules,'vpngjs')))fs.symlinkSync(path.join(root,'packages/vpngjs'),path.join(modules,'vpngjs'),'dir');
 fs.writeFileSync(path.join(dest,'baseline.json'),JSON.stringify({sourceCommit:commit}));console.log('Prepared VLX 0.2.0 baseline '+commit);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
