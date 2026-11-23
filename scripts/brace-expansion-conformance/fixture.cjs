'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createRequire}=require('node:module');
module.exports=function fixture(replacement){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-brace-callers-')),modules=path.join(root,'node_modules');
 fs.cpSync(path.join(__dirname,'node_modules'),modules,{recursive:true});
 if(replacement){
  function patch(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   if(!entry.isDirectory())continue;const folder=path.join(dir,entry.name),metadata=path.join(folder,'package.json');
   if(fs.existsSync(metadata)&&JSON.parse(fs.readFileSync(metadata)).name==='brace-expansion'){
    fs.rmSync(folder,{recursive:true});fs.mkdirSync(folder);fs.writeFileSync(metadata,JSON.stringify({name:'brace-expansion',main:'index.cjs'}));
    fs.writeFileSync(path.join(folder,'index.cjs'),'module.exports=require('+JSON.stringify(path.resolve(replacement))+');');
   }else if(entry.name==='node_modules'||entry.name.startsWith('@')||fs.existsSync(path.join(folder,'node_modules')))patch(folder);
  }}patch(modules);
 }
 const req=createRequire(path.join(root,'caller.cjs'));
 return {root,req,close:()=>fs.rmSync(root,{recursive:true,force:true})};
};
