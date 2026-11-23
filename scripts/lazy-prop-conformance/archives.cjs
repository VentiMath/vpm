'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-lazy-archives-'));
const run=(bin,args,cwd=temp,env={})=>execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:temp+'/npm-cache',BUN_INSTALL_CACHE_DIR:temp+'/bun-cache',...env}});
try{
 const packed=JSON.parse(run('npm',['pack',root+'/packages/vdefine-lazy-prop','--json','--ignore-scripts']))[0];assert(packed.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));
 for(const manager of ['npm','bun']){
  const dir=temp+'/'+manager;fs.mkdirSync(dir);fs.writeFileSync(dir+'/package.json',JSON.stringify({private:true,type:'module',dependencies:{'define-lazy-prop':'file:../'+packed.filename}}));
  run(manager,['install','--ignore-scripts'],dir);run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],dir);
  const pkg=dir+'/node_modules/define-lazy-prop';assert.equal(require(pkg+'/package.json').name,'vdefine-lazy-prop');assert.equal(require(pkg+'/package.json').dependencies,undefined);
  fs.writeFileSync(dir+'/entry.mjs',`import define from 'define-lazy-prop';import {createRequire} from 'node:module';import assert from 'node:assert/strict';assert.equal(define,createRequire(import.meta.url)('define-lazy-prop'));assert.equal(define({},'v',()=>3).v,3);`);
  for(const runtime of ['node','bun']){run(runtime,['entry.mjs'],dir);for(const file of ['contract.cjs','callers.cjs'])process.stdout.write(run(runtime,[__dirname+'/'+file],dir,{VPM_LAZY_PACKAGE:pkg}));process.stdout.write(run(runtime,[runtime==='node'?'--test':'test',root+'/packages/vdefine-lazy-prop/test/lazy.test.cjs'],dir,{VPM_LAZY_PACKAGE:pkg}));}
  const types=fs.readFileSync(root+'/packages/vdefine-lazy-prop/test/types.ts','utf8').replace("'../index.cjs'","'define-lazy-prop'");for(const suffix of ['cts','mts'])fs.writeFileSync(dir+'/check.'+suffix,types);
  const platform=require('../platform-types.cjs'),config=platform.configuration([dir+'/check.cts',dir+'/check.mts']);platform.clean(platform.compile(config));config.files=[dir+'/check.mts'];config.compilerOptions.module='ESNext';config.compilerOptions.moduleResolution='Bundler';platform.clean(platform.compile(config));
 }
 console.log('Lazy property: fresh/frozen npm+Bun alias installs, CJS/ESM identity, upstream/app callers and strict TS7 pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
