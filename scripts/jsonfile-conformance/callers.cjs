'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const vpmPath=process.env.VPM_JSONFILE_PACKAGE||path.resolve(__dirname,'../../packages/vjsonfile');
const callback=call=>new Promise((resolve,reject)=>call((err,v)=>err?reject(err):resolve(v)));
function fsExtra(name,json,utils){
  const entry=require.resolve(name),root=path.dirname(entry)+path.sep,cache=new Map();
  function load(file){
    if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}},local=createRequire(file);cache.set(file,module);
    function resolve(name){
      if(name==='jsonfile')return json;
      if(name==='jsonfile/utils')return utils;
      const target=local.resolve(name);
      return target.startsWith(root)&&target.endsWith('.js')?load(target):local(name);
    }
    vm.runInThisContext('(function(require,exports,module,__filename,__dirname){'+fs.readFileSync(file,'utf8')+'\n})',{filename:file})(resolve,module.exports,module,file,path.dirname(file));
    return module.exports;
  }
  return load(entry);
}
const sources={sys:require.resolve('@capacitor/cli/dist/sysconfig.js'),ios:require.resolve('@capacitor/cli/dist/util/iosplugin.js')};
function capacitor(file,stubs){
  const module={exports:{}};
  vm.runInThisContext('(function(require,exports,module){'+fs.readFileSync(file,'utf8')+'\n})',{filename:file})(name=>{assert(Object.hasOwn(stubs,name),'Unexpected import '+name);return stubs[name]},module.exports,module);
  return module.exports;
}
async function probe(io){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vjsonfile-callers-'));
  try{
    const file=tmp+'/nested/config.json',value={enabled:true,plugins:['A','B']};
    await io.outputJSON(file,value,{spaces:'\t'});assert.equal(fs.readFileSync(file,'utf8'),JSON.stringify(value,null,'\t')+'\n');assert.deepEqual(await io.readJSON(file),value);
    await callback(cb=>io.writeJSON(file,value,cb));assert.deepEqual(await callback(cb=>io.readJSON(file,cb)),value);
    io.outputJSONSync(tmp+'/sync/deep.json',value,{EOL:'\r\n',spaces:2});assert.deepEqual(io.readJSONSync(tmp+'/sync/deep.json'),value);
    await callback(cb=>io.outputJSON(tmp+'/callback/deep.json',value,cb));assert.deepEqual(io.readJSONSync(tmp+'/callback/deep.json'),value);
    const configDir=tmp+'/config',id='00000000-0000-4000-8000-000000000001';
    const sys=capacitor(sources.sys,{'fs-extra':io,path,tslib:require('tslib'),debug:()=>()=>{},'./util/cli':{ENV_PATHS:{config:configDir}},'./util/uuid':{uuidv4:()=>id}});
    assert.deepEqual(await sys.readConfig(),{machine:id});assert.equal(fs.readFileSync(configDir+'/sysconfig.json','utf8'),JSON.stringify({machine:id},null,'\t')+'\n');
    const updated={machine:id,telemetry:false};await sys.writeConfig(updated);assert.deepEqual(await sys.readConfig(),updated);
    fs.writeFileSync(configDir+'/sysconfig.json','{');await assert.rejects(sys.readConfig(),SyntaxError);assert.equal(fs.readFileSync(configDir+'/sysconfig.json','utf8'),'{');
    const unexpected=new Proxy({}, {get(_t,key){throw Error('Unexpected plugin operation '+String(key))}});
    const ios=capacitor(sources.ios,{'fs-extra':io,path,'../cordova':unexpected,'../plugin':unexpected,'./fs':unexpected});
    fs.writeFileSync(tmp+'/capacitor.config.json',JSON.stringify({appId:'example.test',webDir:'dist'}));
    await ios.writePluginJSON({ios:{nativeTargetDirAbs:tmp}},['FilesystemPlugin','KeyboardPlugin']);
    const expected={appId:'example.test',webDir:'dist',packageClassList:['FilesystemPlugin','KeyboardPlugin']};
    assert.equal(fs.readFileSync(tmp+'/capacitor.config.json','utf8'),JSON.stringify(expected,null,'\t')+'\n');
    return 9;
  }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
(async()=>{
  let count=0;
  for(const library of ['jsonfile',vpmPath])for(const extra of ['fs-extra','fs-extra-nine']){
    const local=createRequire(require.resolve(library));
    const utils=library==='jsonfile'?require('jsonfile/utils'):local('./utils.cjs');
    count+=await probe(fsExtra(extra,require(library),utils));
  }
  console.log(`${count} unchanged fs-extra 11.3.4/9.1.0 + Capacitor 8.2.0 JSON caller checks pass; all files temporary.`);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(sources).map(([k,file])=>[k,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))));
})().catch(e=>{console.error(e);process.exitCode=1});
