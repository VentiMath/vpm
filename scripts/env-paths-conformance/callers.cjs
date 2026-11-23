'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const {load}=require('./load.cjs'),metadata=require('./callers.json');
const base=path.join(__dirname,'node_modules/@capacitor/cli'),native=createRequire(base+'/package.json');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'venv-paths-capacitor-'));
const file=process.env.VPM_ENV_PATHS_PACKAGE?path.join(process.env.VPM_ENV_PATHS_PACKAGE,'index.cjs'):path.resolve(__dirname,'../../packages/venv-paths/index.cjs');
const context={platform:process.platform,home:path.join(temporary,'home'),temp:path.join(temporary,'tmp'),env:{XDG_CONFIG_HOME:path.join(temporary,'config'),XDG_STATE_HOME:path.join(temporary,'state'),APPDATA:path.join(temporary,'roaming'),LOCALAPPDATA:path.join(temporary,'local')}};
const own=load(file,context).fn,upstream=load(__dirname+'/node_modules/env-paths-app/index.js',context).fn;
const modules={},forks=[],descriptors=[];
function app(relative){
 if(modules[relative])return modules[relative].exports;
 const source=fs.readFileSync(path.join(base,relative),'utf8');assert.equal(createHash('sha256').update(source).digest('hex'),metadata.files[relative]);
 const module=modules[relative]={exports:{}};
 const require=name=>{
  if(name==='env-paths')return own;
  if(name==='./util/cli')return app('dist/util/cli.js');
  if(name==='../errors')return {isFatal:()=>false};
  if(name==='../log')return {logger:{error(){throw Error('Unexpected logger')}}};
  if(name==='debug')return ()=>()=>{};
  if(name==='./util/uuid')return {uuidv4:()=> 'synthetic-machine'};
  if(name==='fs-extra')return requireFs;
  if(name==='@ionic/utils-subprocess')return {fork:(entry,args,options)=>{forks.push({entry,args,options});descriptors.push(options.stdio[1]);return {send:message=>forks.at(-1).message=message,disconnect:()=>forks.at(-1).disconnected=true,unref:()=>forks.at(-1).unreferenced=true}}};
  if(name==='https')return {request(){throw Error('Unexpected network')}};
  return native(name);
 };
 vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename:path.join(base,relative)})(require,module,module.exports);
 return module.exports;
}
const requireFs=require('../../packages/vfs-extra');
(async()=>{try{
 const paths=app('dist/util/cli.js').ENV_PATHS;assert.deepEqual(JSON.parse(JSON.stringify(paths)),JSON.parse(JSON.stringify(upstream('capacitor',{suffix:''}))));
 for(const location of Object.values(paths))assert(location.startsWith(temporary+path.sep));
 const config=app('dist/sysconfig.js');assert.deepEqual(await config.readConfig(),{machine:'synthetic-machine'});
 const stored=path.resolve(paths.config,'sysconfig.json');assert.equal(fs.readFileSync(stored,'utf8'),'{\n\t"machine": "synthetic-machine"\n}\n');
 await config.writeConfig({machine:'synthetic-machine',telemetry:false});assert.deepEqual(await config.readConfig(),{machine:'synthetic-machine',telemetry:false});
 await app('dist/ipc.js').send({type:'test-only'});assert.equal(forks.length,1);assert.deepEqual(forks[0].message,{type:'test-only'});assert(forks[0].disconnected&&forks[0].unreferenced);assert.equal(forks[0].options.stdio[1],forks[0].options.stdio[2]);assert(fs.statSync(path.join(paths.log,'ipc.log')).isFile());
 console.log('Unchanged Capacitor 8.2.0 ENV_PATHS, first/existing system-config reads, writes and IPC log opening pass; real scratch filesystem, fork/network stubbed.');
}finally{for(const fd of descriptors)fs.closeSync(fd);fs.rmSync(temporary,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
