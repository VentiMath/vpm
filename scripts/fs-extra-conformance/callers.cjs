'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sources={},trace={};
function load(name,stubs){
 const file=require.resolve('@capacitor/cli/dist/'+name+'.js'),source=fs.readFileSync(file,'utf8');sources[name]=createHash('sha256').update(source).digest('hex');
 const module={exports:{}};vm.runInThisContext('(function(require,exports,module){'+source+'\n})',{filename:file})(key=>{assert(Object.hasOwn(stubs,key),'Unexpected '+name+' import '+key);return stubs[key]},module.exports,module);return module.exports;
}
const noop=()=>{},color=x=>x,logger={info:noop,warn:noop,error:noop,debug:noop};Object.assign(color,{success:color,strong:color,input:color});
function instrument(io){return new Proxy(io,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return (...args)=>{trace[key]=(trace[key]||0)+1;return value(...args)}}})}
async function probe(library,platform){
 const io=instrument(library),tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vfs-extra-capacitor-')));
 try{
  const web=tmp+'/dist',native=tmp+'/native',hooks=[];fs.mkdirSync(web+'/icons',{recursive:true});fs.writeFileSync(web+'/index.html','<html>test</html>');fs.writeFileSync(web+'/icons/a.svg','<svg/>');fs.symlinkSync('icons/a.svg',web+'/logo.svg');
  fs.mkdirSync(native+'/public',{recursive:true});fs.writeFileSync(native+'/public/stale','remove me');
  const config={app:{rootDir:tmp,webDirAbs:web,extConfig:{appId:'test.app',webDir:'dist',ios:{buildOptions:{dummy:true}},android:{buildOptions:{dummy:true}}}},ios:{name:'ios',webDirAbs:native+'/public',nativeTargetDirAbs:native,nativeProjectDirAbs:tmp+'/project',platformDirAbs:tmp+'/ios'},android:{name:'android',webDirAbs:native+'/public',assetsDirAbs:native},web:{name:'web'},cli:{assetsDirAbs:tmp+'/assets'}};
  const cordova={getCordovaPlugins:async()=>[],handleCordovaPluginsJS:async()=>{},writeCordovaAndroidManifest:async()=>{}};
  const iosplugin=load('util/iosplugin',{'fs-extra':io,path,'../cordova':cordova,'../plugin':{},'./fs':{}});
  const task=load('tasks/copy',{tslib:require('tslib'),'fs-extra':io,path,'../colors':color,'../common':{runTask:async(_name,fn)=>fn(),checkWebDir:async()=>{assert(fs.existsSync(web+'/index.html'));return null},runHooks:async(_config,_platform,_root,name)=>hooks.push(name)},'../cordova':cordova,'../errors':{},'../ios/common':{getIOSPlugins:async()=>[]},'../log':{logger},'../plugin':{getPlugins:async()=>[]},'../util/iosplugin':iosplugin,'../util/promise':{},'./sourcemaps':{}});
  await task.copy(config,platform);
  assert.equal(fs.readFileSync(native+'/public/index.html','utf8'),'<html>test</html>');assert.equal(fs.readlinkSync(native+'/public/logo.svg'),'icons/a.svg');assert(!fs.existsSync(native+'/public/stale'));
  const saved=JSON.parse(fs.readFileSync(native+'/capacitor.config.json','utf8'));assert.equal(saved.appId,'test.app');assert(!saved.ios.buildOptions);assert(!saved.android.buildOptions);if(platform==='ios')assert.deepEqual(saved.packageClassList,[]);
  assert.deepEqual(hooks,['capacitor:copy:before','capacitor:copy:after']);
  const sys=load('sysconfig',{tslib:require('tslib'),debug:()=>noop,'fs-extra':io,path,'./util/cli':{ENV_PATHS:{config:tmp+'/config'}},'./util/uuid':{uuidv4:()=> 'fixture-id'}});
  assert.deepEqual(await sys.readConfig(),{machine:'fixture-id'});await sys.writeConfig({machine:'fixture-id',telemetry:false});assert.equal((await sys.readConfig()).telemetry,false);
  const spm=load('util/spm',{'fs-extra':io,os:{...os,tmpdir:()=>tmp},path,plist:{},tar:{extract:async({cwd})=>{fs.mkdirSync(cwd+'/App/CapApp-SPM',{recursive:true});fs.writeFileSync(cwd+'/App/CapApp-SPM/Package.swift','fixture swift');fs.writeFileSync(cwd+'/debug.xcconfig','DEBUG = YES')}},'../common':{},'../errors':{fatal(message){throw Error(message)}},'../ios/common':{},'../log':{logger},'../plugin':{},'../util/subprocess':{}});
  await spm.extractSPMPackageDirectory(config);assert.equal(fs.readFileSync(config.ios.nativeProjectDirAbs+'/CapApp-SPM/Package.swift','utf8'),'fixture swift');assert.equal(fs.readFileSync(config.ios.platformDirAbs+'/debug.xcconfig','utf8'),'DEBUG = YES');
  assert.equal(await spm.checkPackageManager(config),'SPM');
  for(const name of ['Podfile','Podfile.lock'])fs.writeFileSync(config.ios.nativeProjectDirAbs+'/'+name,'old');fs.mkdirSync(config.ios.nativeProjectDirAbs+'/App.xcworkspace');
  await spm.removeCocoapodsFiles(config);assert(!fs.existsSync(config.ios.nativeProjectDirAbs+'/Podfile'));assert(fs.existsSync(config.ios.nativeProjectDirAbs+'/CapApp-SPM/Package.swift'));
  return 4;
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
(async()=>{
 let count=0;for(const name of ['fs-extra','fs-extra-app','fs-extra-nine',process.env.VPM_FS_EXTRA_PACKAGE||'../../packages/vfs-extra'])for(const platform of ['ios','android'])count+=await probe(require(name),platform);
 console.log(`${count} unchanged Capacitor 8.2.0 asset-copy/config/Swift-setup/cleanup workflows pass on current, app, Ionic and VPM implementations.`);
 console.log(JSON.stringify({sources,calls:trace}));
})().catch(error=>{console.error(error);process.exitCode=1});
