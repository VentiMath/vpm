'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createRequire}=require('node:module');
module.exports=function fixture(library,legacy=false){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-balanced-caller-')),modules=path.join(root,'node_modules');fs.mkdirSync(modules);
 const copy=(from,to)=>fs.cpSync(path.join(__dirname,'node_modules',from),path.join(modules,to),{recursive:true,filter:file=>!file.slice(path.join(__dirname,'node_modules',from).length).split(path.sep).includes('node_modules')});
 copy(legacy?'brace-app':'brace-expansion','brace-expansion');if(!legacy)copy('minimatch','minimatch');
 const balanced=path.join(modules,'balanced-match');fs.mkdirSync(balanced);
 fs.writeFileSync(path.join(balanced,'package.json'),JSON.stringify({name:'balanced-match',main:'index.cjs'}));
 fs.writeFileSync(path.join(balanced,'index.cjs'),'module.exports=require('+JSON.stringify(path.resolve(library))+');');
 const req=createRequire(path.join(root,'consumer.cjs')),brace=req('brace-expansion');
 return {expand:brace.expand||brace,minimatch:legacy?null:req('minimatch').minimatch,close:()=>fs.rmSync(root,{recursive:true,force:true})};
};
