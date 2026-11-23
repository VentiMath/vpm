'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const Mocha=require('mocha'),manifest=require('./upstream.json'),tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vfs-extra-upstream-'))),oldCwd=process.cwd(),load=Module._load;
const library=require(process.env.VPM_FS_EXTRA_PACKAGE||'../../packages/vfs-extra');
function clean(){Module._load=load;process.chdir(oldCwd);fs.rmSync(tmp,{recursive:true,force:true})}
try{
 for(const [file,hash] of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(fs.readFileSync(__dirname+'/upstream/'+file)).digest('hex'),hash);
 fs.cpSync(__dirname+'/upstream',tmp,{recursive:true});
 const packagePath=process.env.VPM_FS_EXTRA_PACKAGE||path.resolve(__dirname,'../../packages/vfs-extra');
 fs.writeFileSync(tmp+'/lib/index.js','module.exports=require('+JSON.stringify(packagePath)+');');
 fs.writeFileSync(tmp+'/lib/copy/index.js',"module.exports=require('../');");
 fs.writeFileSync(tmp+'/lib/copy/copy-sync.js',"module.exports=require('../').copySync;");
 fs.mkdirSync(tmp+'/lib/util',{recursive:true});
 fs.writeFileSync(tmp+'/lib/util/utimes.js',"exports.utimesMillisSync=require('node:fs').utimesSync;");
 fs.symlinkSync(path.join(__dirname,'node_modules'),tmp+'/node_modules','dir');
 Module._load=function(name,parent,...rest){
  if(parent?.filename.startsWith(tmp+path.sep)){
   if(name==='os')return {...os,tmpdir:()=>tmp};
   if(['../..','../../','../','..'].includes(name))return library;
   if(name==='../copy-sync')return library.copySync;
   if(name==='../../util/utimes')return {utimesMillisSync:fs.utimesSync};
   if(!name.startsWith('.')&&!Module.isBuiltin(name))return require(name);
  }
  return load.call(this,name,parent,...rest);
 };
 const mocha=new Mocha({reporter:'dot',timeout:2000,bail:true});
 for(const file of Object.keys(manifest.sha256).filter(p=>p.endsWith('.test.js')).sort())mocha.addFile(path.join(tmp,file));
 mocha.run(failures=>{clean();if(failures)process.exitCode=1});
}catch(error){clean();throw error}
