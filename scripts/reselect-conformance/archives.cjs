'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../packages/vreselect'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-reselect-archive-'));
function run(cmd,args,cwd=temp,env={}){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,...env}});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout;}
try{
 const meta=JSON.parse(run('npm',['pack','--ignore-scripts','--json','--pack-destination',temp,'--cache',temp+'/cache'],root))[0],archive=path.join(temp,meta.filename);
 assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:{vreselect:'file:'+archive}}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',temp+'/cache']:[])],cwd);
  run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund','--cache',temp+'/cache']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
  fs.writeFileSync(cwd+'/consumer.mjs',`import assert from 'node:assert/strict';import * as api from 'vreselect';import {createRequire} from 'node:module';const cjs=createRequire(import.meta.url)('vreselect');assert.equal(api.createSelector,cjs.createSelector);const s=api.createSelector([s=>s.items],items=>items.slice());const state={items:[1]};assert.equal(s(state),s(state));s.clearCache();assert.deepEqual(s(state),[1]);assert.equal(s.recomputations(),1);`);
  for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  fs.writeFileSync(cwd+'/browser.mjs',"import {createSelector} from 'vreselect';const s=createSelector([s=>s.x],x=>x+1);if(s({x:1})!==2)throw Error('selector');");run('bun',['build','browser.mjs','--target','browser','--outfile','browser-built.mjs'],cwd);run('node',['browser-built.mjs'],cwd);
  for(const ext of ['cts','mts'])fs.copyFileSync(__dirname+'/consumer.'+ext,cwd+'/consumer.'+ext);
  run('node',[__dirname+'/types.cjs',cwd],cwd);
  const installed=cwd+'/node_modules/vreselect/index.cjs';run('node',[__dirname+'/callers.cjs'],cwd,{VPM_RESELECT_INSTALL:installed});run('node',[__dirname+'/development.cjs'],cwd,{VPM_RESELECT_INSTALL:installed});
 }
 console.log('Packed fresh/frozen npm and Bun, Node/Bun CJS+ESM, browser bundle, TS7 and unchanged MUI X callers pass. '+meta.size+' bytes packed, '+meta.unpackedSize+' unpacked.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
