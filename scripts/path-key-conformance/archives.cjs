'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-path-key-archives-'));
const run=(bin,args,cwd=temp,env={})=>execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:temp+'/npm-cache',BUN_INSTALL_CACHE_DIR:temp+'/bun-cache',...env}});
try{
 const packed=JSON.parse(run('npm',['pack',root+'/packages/vpath-key','--json','--ignore-scripts']))[0];assert(packed.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));
 for(const manager of ['npm','bun']){
  const dir=temp+'/'+manager;fs.mkdirSync(dir);fs.writeFileSync(dir+'/package.json',JSON.stringify({private:true,type:'module',dependencies:{'vpath-key':'file:../'+packed.filename}}));
  run(manager,['install','--ignore-scripts'],dir);run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],dir);
  const pkg=dir+'/node_modules/vpath-key';assert.equal(require(pkg+'/package.json').name,'vpath-key');assert.equal(require(pkg+'/package.json').dependencies,undefined);
  fs.writeFileSync(dir+'/entry.mjs',`import pathKey from 'vpath-key';import {createRequire} from 'node:module';import assert from 'node:assert/strict';assert.equal(pathKey,createRequire(import.meta.url)('vpath-key'));assert.equal(pathKey({platform:'win32',env:{PATH:'bin'}}),'PATH');`);
  for(const runtime of ['node','bun']){run(runtime,['entry.mjs'],dir);for(const file of ['callers.cjs'])process.stdout.write(run(runtime,[__dirname+'/'+file],dir,{VPM_PATH_KEY_ENTRY:pkg+"/index.cjs"}));process.stdout.write(run(runtime,[runtime==='node'?'--test':'test',root+'/packages/vpath-key/test/lookup.test.cjs'],dir,{VPM_PATH_KEY_ENTRY:pkg+"/index.cjs"}));}
  const types=fs.readFileSync(root+'/packages/vpath-key/test/types.ts','utf8').replace("'../index.cjs'","'vpath-key'");for(const suffix of ['cts','mts'])fs.writeFileSync(dir+'/check.'+suffix,suffix==='mts'?types.replace("import pathKey = require('vpath-key');","import pathKey from 'vpath-key';"):types);
  const platform=require('../platform-types.cjs'),config=platform.configuration([dir+'/check.cts',dir+'/check.mts']);platform.clean(platform.compile(config));config.files=[dir+'/check.mts'];config.compilerOptions.module='ESNext';config.compilerOptions.moduleResolution='Bundler';platform.clean(platform.compile(config));
 }
 console.log('vpath-key: fresh/frozen npm+Bun installs, CJS/ESM identity, upstream/app callers and strict TS7 pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
