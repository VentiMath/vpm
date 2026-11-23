'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createRequire}=require('node:module');
module.exports=function fixture(replacement){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-minimatch-callers-')),modules=path.join(root,'node_modules');
 fs.cpSync(path.join(__dirname,'node_modules'),modules,{recursive:true});const bridges=[];
 if(replacement){
  function patch(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   if(!entry.isDirectory())continue;const folder=path.join(dir,entry.name),metadata=path.join(folder,'package.json');
   if(fs.existsSync(metadata)&&JSON.parse(fs.readFileSync(metadata)).name==='minimatch'){
    fs.rmSync(folder,{recursive:true});fs.mkdirSync(folder);fs.writeFileSync(metadata,JSON.stringify({name:'minimatch',main:'index.cjs'}));
    const bridge=path.join(folder,'index.cjs');bridges.push(bridge);
    fs.writeFileSync(bridge,`const api=require(${JSON.stringify(path.resolve(replacement))});let calls=0;function fn(...args){calls++;return api(...args)}Object.assign(fn,api);fn.minimatch=fn;fn.Minimatch=class extends api.Minimatch{constructor(...args){calls++;super(...args)}};fn.__calls=()=>calls;module.exports=fn;`);
   }else if(entry.name==='node_modules'||entry.name.startsWith('@')||fs.existsSync(path.join(folder,'node_modules')))patch(folder);
  }}patch(modules);
 }
 const req=createRequire(path.join(root,'caller.cjs'));
 return {root,req,calls:()=>bridges.reduce((n,p)=>n+(require.cache[require.resolve(p)]?.exports.__calls()??0),0),close:()=>fs.rmSync(root,{recursive:true,force:true})};
};
