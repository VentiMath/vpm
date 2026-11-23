'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vjsonfile-archives-'));
function run(bin,args,cwd=tmp,extra={}){return execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:tmp+'/npm-cache',BUN_INSTALL_CACHE_DIR:tmp+'/bun-cache',npm_config_audit:'false',npm_config_fund:'false',...extra}})}
try{
  const pack=JSON.parse(run('npm',['pack',root+'/packages/vjsonfile','--ignore-scripts','--json']))[0];
  assert(pack.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));
  for(const manager of ['npm','bun']){
    const cwd=tmp+'/'+manager;fs.mkdirSync(cwd);
    fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies:{jsonfile:'file:../'+pack.filename}}));
    run(manager,['install','--ignore-scripts'],cwd);
    run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--ignore-scripts','--frozen-lockfile'],cwd);
    const packageDir=cwd+'/node_modules/jsonfile';
    const manifest=JSON.parse(fs.readFileSync(packageDir+'/package.json','utf8'));assert.equal(manifest.name,'vjsonfile');assert(!manifest.dependencies);assert(!manifest.optionalDependencies);
    fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import json,{readFile,writeFile} from 'jsonfile';import utils,{stringify} from 'jsonfile/utils';import {stripBom} from 'jsonfile/utils.js';const require=createRequire(import.meta.url);assert.equal(json,require('jsonfile'));assert.equal(utils,require('jsonfile/utils'));assert.equal(stringify,require('jsonfile/utils.js').stringify);assert.equal(stripBom(Buffer.from('1')),'1');await writeFile('config.json',{ok:true},{spaces:'\t'});assert.deepEqual(await readFile('config.json'),{ok:true});fs.unlinkSync('config.json');`);
    for(const runtime of ['node','bun']){
      run(runtime,['check.mjs'],cwd);
      process.stdout.write(run(runtime,[__dirname+'/callers.cjs'],cwd,{VPM_JSONFILE_PACKAGE:packageDir}));
    }
    const types=fs.readFileSync(root+'/packages/vjsonfile/test/types.ts','utf8').replaceAll("'../index.cjs'","'jsonfile'").replaceAll("'../utils.cjs'","'jsonfile/utils'");
    for(const ext of ['cts','mts'])fs.writeFileSync(cwd+'/check.'+ext,types);
    const platform=require('../platform-types.cjs'),config=platform.configuration([cwd+'/check.cts',cwd+'/check.mts']);platform.clean(platform.compile(config));
    config.files=[cwd+'/check.mts'];config.compilerOptions.module='ESNext';config.compilerOptions.moduleResolution='Bundler';platform.clean(platform.compile(config));
  }
  console.log('Fresh/frozen npm+Bun zero-dependency archive, original jsonfile alias, CJS/ESM/helpers, unchanged callers and TS7 consumers pass.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
