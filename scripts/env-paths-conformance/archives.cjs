'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'venv-paths-archive-'));
const run=(bin,args,cwd=tmp,extra={})=>execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:tmp+'/npm-cache',BUN_INSTALL_CACHE_DIR:tmp+'/bun-cache',npm_config_audit:'false',npm_config_fund:'false',...extra}});
try{
 const pack=JSON.parse(run('npm',['pack',root+'/packages/venv-paths','--ignore-scripts','--json']))[0];assert(pack.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));
 for(const manager of ['npm','bun']){
  const cwd=tmp+'/'+manager;fs.mkdirSync(cwd);fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies:{'env-paths':'file:../'+pack.filename}}));
  run(manager,['install','--ignore-scripts'],cwd);run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
  const packageDir=cwd+'/node_modules/env-paths',metadata=JSON.parse(fs.readFileSync(packageDir+'/package.json'));assert.equal(metadata.name,'venv-paths');assert(!metadata.dependencies&&!metadata.optionalDependencies);
  fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import envPaths from 'env-paths';const require=createRequire(import.meta.url);assert.equal(envPaths,require('env-paths'));assert.equal(envPaths.default,envPaths);assert(envPaths('capacitor',{suffix:''}).config.endsWith('capacitor'));assert.throws(()=>envPaths('../escape'));`);
  for(const runtime of ['node','bun']){run(runtime,['check.mjs'],cwd);process.stdout.write(run(runtime,[__dirname+'/callers.cjs'],cwd,{VPM_ENV_PATHS_PACKAGE:packageDir}));}
  const types=fs.readFileSync(root+'/packages/venv-paths/test/types.ts','utf8').replaceAll("'../index.cjs'","'env-paths'");
  fs.writeFileSync(cwd+'/check.cts',types);fs.writeFileSync(cwd+'/check.mts',types.replace('envPaths.Options','Options').replace('envPaths.Paths','Paths').replace("import envPaths from 'env-paths';","import envPaths, {type Options,type Paths} from 'env-paths';"));
  const platform=require('../platform-types.cjs'),config=platform.configuration([cwd+'/check.cts',cwd+'/check.mts']);platform.clean(platform.compile(config));config.files=[cwd+'/check.mts'];config.compilerOptions.module='ESNext';config.compilerOptions.moduleResolution='Bundler';platform.clean(platform.compile(config));
 }
 console.log('Fresh/frozen npm+Bun original-name archive, zero dependencies, CJS/ESM, Capacitor callers and TS7 NodeNext/Bundler pass.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
