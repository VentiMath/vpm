'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vnonce-consumer-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
try {
 run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.join(root,'packages/vget-nonce'));
 const archive=path.join(temp,'vget-nonce-1.0.1.tgz');assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(node_modules|bench|test)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:{'vget-nonce':'file:'+archive}}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  fs.writeFileSync(path.join(cwd,'test.mjs'),"import {getNonce,setNonce} from 'vget-nonce';import {createRequire} from 'node:module';const c=createRequire(import.meta.url)('vget-nonce');if(getNonce!==c.getNonce)throw Error('identity');setNonce('shared');if(c.getNonce()!=='shared')throw Error('state');setNonce(undefined);if(getNonce()!==undefined)throw Error('reset');");
  for(const runtime of ['node','bun'])run(runtime,['test.mjs'],cwd);
  fs.writeFileSync(path.join(cwd,'browser.mjs'),"import {setNonce,getNonce} from 'vget-nonce';setNonce('explicit');globalThis.results=[getNonce()];setNonce(undefined);results.push(getNonce());");
  run('bun',['build','browser.mjs','--target=browser','--format=iife','--outfile=bundle.js'],cwd);
  const ctx={__webpack_nonce__:'bundler'};vm.runInNewContext(fs.readFileSync(path.join(cwd,'bundle.js'),'utf8'),ctx);assert.deepEqual(Array.from(ctx.results),['explicit','bundler']);
  fs.writeFileSync(path.join(cwd,'consumer.mts'),"import {setNonce,getNonce} from 'vget-nonce';setNonce('x');setNonce(undefined);const n:string|undefined=getNonce();\n// @ts-expect-error nonce must be string or undefined\nsetNonce(3);\n");
  for(const resolution of ['NodeNext','Bundler'])run(path.join(root,'node_modules/.bin/tsc'),['--strict','--noEmit','--skipLibCheck','false','--moduleResolution',resolution,'--module',resolution==='NodeNext'?'NodeNext':'ESNext','--target','ES2022','consumer.mts'],cwd);
 }
 console.log('Clean npm/Bun archives, Node/Bun CJS/ESM identity, browser fallback and TS7 consumers pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
