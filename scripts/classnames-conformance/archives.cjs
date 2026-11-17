"use strict";
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),root=path.resolve(__dirname,'../..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'vclassnames-archives-'));
const run=(bin,args,cwd=scratch,extra={})=>execFileSync(bin,args,{cwd,env:{...process.env,...extra,npm_config_cache:scratch+'/npm-cache',BUN_INSTALL_CACHE_DIR:scratch+'/bun-cache'},encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']});
try{
 const pack=JSON.parse(run('npm',['pack',root+'/packages/vclassnames','--ignore-scripts','--json']))[0];
 assert.ok(pack.files.every(x=>!/^test\/|^bench\/|^node_modules\//.test(x.path)));
 for(const manager of ['npm','bun']){
  const dir=scratch+'/'+manager;fs.mkdirSync(dir);fs.writeFileSync(dir+'/package.json',JSON.stringify({name:'vclassnames-consumer',private:true,type:'module',dependencies:{vclassnames:'file:'+scratch+'/'+pack.filename}}));
  run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts'],dir);
  run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts','--frozen-lockfile'],dir);
  for(const ext of ['mts','cts'])fs.copyFileSync(__dirname+'/consumer.'+ext,dir+'/consumer.'+ext);
  run('node',[__dirname+'/types.cjs',dir]);
  fs.writeFileSync(dir+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import cn from 'vclassnames';import bound from 'vclassnames/bind';import dedupe from 'vclassnames/dedupe';const require=createRequire(import.meta.url);assert.equal(cn,require('vclassnames'));assert.equal(bound,require('vclassnames/bind'));assert.equal(dedupe,require('vclassnames/dedupe'));assert.equal(cn('a',{b:true}),'a b');assert.equal(require('vclassnames/package.json').dependencies,undefined);`);
  const env={VCLASSNAMES_ENTRY:dir+'/node_modules/vclassnames'};
  for(const bin of ['node','bun']){run(bin,[dir+'/check.mjs'],dir);run(bin,[bin==='node'?'--test':'test',root+'/packages/vclassnames/test/classnames.test.cjs'],dir,env);run(bin,[__dirname+'/probe.cjs'],dir,env);}
 }
 console.log('Packed vclassnames ('+pack.size+' bytes): fresh/frozen npm+Bun, Node+Bun CJS/ESM, tests/caller and strict types pass');
}catch(e){console.error(e.stdout?.toString(),e.stderr?.toString());throw e}finally{fs.rmSync(scratch,{recursive:true,force:true})}
