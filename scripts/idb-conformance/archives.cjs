'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),root=path.resolve(__dirname,'../..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'vidb-archives-'));
const run=(bin,args,cwd=scratch,extra={})=>execFileSync(bin,args,{cwd,env:{...process.env,...extra,npm_config_cache:scratch+'/npm-cache',BUN_INSTALL_CACHE_DIR:scratch+'/bun-cache'},encoding:'utf8',timeout:180000,stdio:['ignore','pipe','pipe']});
try{
 const pack=JSON.parse(run('npm',['pack',root+'/packages/vidb','--ignore-scripts','--json']))[0];assert(pack.files.every(f=>!/^test\/|^bench\/|node_modules/.test(f.path)));
 for(const manager of ['npm','bun']){
  const dir=scratch+'/'+manager;fs.mkdirSync(dir);fs.writeFileSync(dir+'/package.json',JSON.stringify({name:'vidb-consumer',private:true,type:'module',dependencies:{vidb:'file:'+scratch+'/'+pack.filename,idb:'file:'+scratch+'/'+pack.filename}}));
  run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts'],dir);run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts','--frozen-lockfile'],dir);
  for(const file of ['index.cjs','index.mjs','index.d.cts','index.d.mts'])assert.equal(fs.readFileSync(dir+'/node_modules/vidb/'+file,'utf8'),fs.readFileSync(root+'/packages/vidb/'+file,'utf8'));
  for(const ext of ['cts','mts'])fs.copyFileSync(__dirname+'/consumer.'+ext,dir+'/consumer.'+ext);process.stdout.write(run('node',[__dirname+'/types.cjs',dir],dir));
  fs.writeFileSync(dir+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire}from'node:module';import * as api from 'vidb';import * as alias from 'idb';const require=createRequire(import.meta.url);for(const k of ['openDB','deleteDB','wrap','unwrap'])assert.equal(api[k],require('vidb')[k]);assert.deepEqual(Object.keys(api),Object.keys(alias));assert.equal(api.wrap(17),17);assert.equal(require('vidb/package.json').dependencies,undefined);console.log('Packed Node/Bun import, CJS/ESM identity and original-name installation pass');`);
  for(const runtime of ['node','bun'])process.stdout.write(run(runtime,['check.mjs'],dir));
  if(manager==='npm')process.stdout.write(run('node',[__dirname+'/browser.cjs'],root,{VPM_IDB_ENTRY:dir+'/node_modules/vidb/index.cjs'}));
 }
 console.log(JSON.stringify({name:pack.name,packed:pack.size,unpacked:pack.unpackedSize}));
}catch(e){if(e.stdout)process.stderr.write(String(e.stdout));if(e.stderr)process.stderr.write(String(e.stderr));throw e;}finally{fs.rmSync(scratch,{recursive:true,force:true});}
