'use strict';
// Reconstruct the prior runtime from Git history in ignored fixture storage.
// No second implementation snapshot is committed to the repository.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),commit='235846009f114f0f34189dc8ea4d76e4aa87dc7c',dest=path.join(__dirname,'node_modules/.vlx-before-equations');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-equation-baseline-'));
try{
 fs.writeFileSync(path.join(temp,'source.tar'),execFileSync('git',['archive','--format=tar',commit,'packages/vlx'],{cwd:root,maxBuffer:32e6}));
 execFileSync('tar',['-xf',path.join(temp,'source.tar'),'-C',temp]);
 fs.mkdirSync(dest,{recursive:true});for(const name of fs.readdirSync(path.join(temp,'packages/vlx'))){
  const file=path.join(temp,'packages/vlx',name);if(fs.statSync(file).isDirectory()&&name!=='font')continue;
  fs.cpSync(file,path.join(dest,name),{recursive:true});
 }
 fs.writeFileSync(path.join(dest,'baseline.json'),JSON.stringify({sourceCommit:commit}));console.log('Prepared committed pre-feature VLX baseline '+commit);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
