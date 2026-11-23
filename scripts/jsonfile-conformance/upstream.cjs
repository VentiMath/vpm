'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const Mocha=require('mocha'),manifest=require('./upstream.json'),tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vjsonfile-upstream-')));
const load=Module._load;
try {
  for(const [name,hash] of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'upstream',name))).digest('hex'),hash,name);
  fs.cpSync(path.join(__dirname,'upstream/test'),tmp+'/test',{recursive:true});
  const library=process.env.VPM_JSONFILE_PACKAGE||path.resolve(__dirname,'../../packages/vjsonfile');
  fs.writeFileSync(tmp+'/index.js','module.exports=require('+JSON.stringify(library)+');');
  // Keep every upstream test byte unchanged; relocate its scratch directory and
  // replace only its test-fixture rimraf cleanup with native recursive removal.
  Module._load=function(name,parent,...rest){
    if(parent?.filename.startsWith(tmp+path.sep)){
      if(name==='os')return {...os,tmpdir:()=>tmp};
      if(name==='rimraf')return {sync(file){assert(path.resolve(file).startsWith(tmp+path.sep));fs.rmSync(file,{recursive:true,force:true})}};
    }
    return load.call(this,name,parent,...rest);
  };
  const mocha=new Mocha({reporter:'dot',timeout:5000});
  for(const name of fs.readdirSync(tmp+'/test').sort())mocha.addFile(tmp+'/test/'+name);
  mocha.run(failures=>{Module._load=load;fs.rmSync(tmp,{recursive:true,force:true});if(failures)process.exitCode=1;});
}catch(e){Module._load=load;fs.rmSync(tmp,{recursive:true,force:true});throw e;}
