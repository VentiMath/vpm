'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createRequire}=require('node:module');
module.exports=function(replacement){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-scurry-caller-')),modules=root+'/node_modules';fs.mkdirSync(modules);
 for(const name of ['glob','path-scurry','lru-cache','minipass','minimatch','brace-expansion','balanced-match'])fs.cpSync(__dirname+'/node_modules/'+name,modules+'/'+name,{recursive:true});
 let bridge;
 if(replacement){
  for(const dir of [modules+'/path-scurry',modules+'/glob/node_modules/path-scurry']){
   fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
   fs.writeFileSync(dir+'/package.json',JSON.stringify({name:'path-scurry',main:'index.cjs'}));
   if(!bridge){bridge=dir+'/index.cjs';fs.writeFileSync(bridge,`const api=require(${JSON.stringify(path.resolve(replacement))});let count=0;const exposed={...api};for(const name of ['PathScurry','PathScurryPosix','PathScurryDarwin','PathScurryWin32'])exposed[name]=class extends api[name]{constructor(...args){super(...args);count++}};module.exports={...exposed,__calls:()=>count};`);}
   else fs.writeFileSync(dir+'/index.cjs',`module.exports=require(${JSON.stringify(bridge)});`);
  }
 }
 const req=createRequire(root+'/caller.cjs');return {req,root,calls:()=>bridge?req(bridge).__calls():0,close:()=>fs.rmSync(root,{recursive:true,force:true})};
};
