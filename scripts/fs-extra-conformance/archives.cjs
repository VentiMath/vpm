'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vfs-extra-archives-'));
function run(bin,args,cwd=tmp,extra={}){return execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:tmp+'/npm-cache',BUN_INSTALL_CACHE_DIR:tmp+'/bun-cache',npm_config_audit:'false',npm_config_fund:'false',...extra}})}
try{
  const jsonPack=JSON.parse(run('npm',['pack',root+'/packages/vjsonfile','--ignore-scripts','--json']))[0];
  const pack=JSON.parse(run('npm',['pack',root+'/packages/vfs-extra','--ignore-scripts','--json']))[0];
  for(const file of ['README.md','PROVENANCE.json','index.d.cts','esm.d.mts'])assert(pack.files.some(f=>f.path===file));
  assert(pack.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));
  for(const manager of ['npm','bun']){
    const cwd=tmp+'/'+manager;fs.mkdirSync(cwd);
    fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies:{'fs-extra':'file:../'+pack.filename,'vjsonfile':'file:../'+jsonPack.filename},overrides:{vjsonfile:'file:../'+jsonPack.filename}}));
    run(manager,['install','--ignore-scripts'],cwd);
    run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--ignore-scripts','--frozen-lockfile'],cwd);
    const packageDir=cwd+'/node_modules/fs-extra';
    const manifest=JSON.parse(fs.readFileSync(packageDir+'/package.json','utf8'));assert.equal(manifest.name,'vfs-extra');assert.deepEqual(manifest.dependencies,{vjsonfile:'6.2.1'});assert(!manifest.optionalDependencies);
    fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import io,{copy,readFile} from 'fs-extra';import extras,{outputJSON} from 'fs-extra/esm';const require=createRequire(import.meta.url);assert.equal(io,require('fs-extra'));assert.equal(extras.copy,copy);assert.equal(extras.readFile,undefined);await outputJSON('scratch/config.json',{ok:true},{spaces:'\\t'});assert.deepEqual(await io.readJSON('scratch/config.json'),{ok:true});await copy('scratch','copied');assert.equal(await readFile('copied/config.json','utf8'),JSON.stringify({ok:true},null,String.fromCharCode(9))+String.fromCharCode(10));await io.remove('scratch');await io.remove('copied');`);
    for(const runtime of ['node','bun']){
      run(runtime,['check.mjs'],cwd);
      process.stdout.write(run(runtime,[__dirname+'/callers.cjs'],cwd,{VPM_FS_EXTRA_PACKAGE:packageDir}));
    }
    const types=fs.readFileSync(root+'/packages/vfs-extra/test/types.ts','utf8').replaceAll("'../index.cjs'","'fs-extra'");
    for(const ext of ['cts','mts'])fs.writeFileSync(cwd+'/check.'+ext,types);
    fs.writeFileSync(cwd+'/extras.mts',"import extras from 'fs-extra/esm'; extras.copySync('a','b');\n// @ts-expect-error The convenience entry excludes native fs APIs.\nextras.readFile('file');\n");
    const platform=require('../platform-types.cjs'),config=platform.configuration([cwd+'/check.cts',cwd+'/check.mts',cwd+'/extras.mts']);platform.clean(platform.compile(config));
    config.files=[cwd+'/check.mts',cwd+'/extras.mts'];config.compilerOptions.module='ESNext';config.compilerOptions.moduleResolution='Bundler';platform.clean(platform.compile(config));
  }
  console.log('Fresh/frozen npm+Bun two-package archives, original fs-extra alias, CJS/ESM/convenience-only entry, unchanged callers and TS7 consumers pass.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
