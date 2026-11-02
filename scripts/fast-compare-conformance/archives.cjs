'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../packages/vreact-fast-compare'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-fast-compare-archive-'));
function run(cmd,args,cwd=temp){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout;}
try{
 run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],root);
 const archive=path.join(temp,'vreact-fast-compare-'+require(path.join(root,'package.json')).version+'.tgz');
 assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:{'vreact-fast-compare':'file:'+archive}}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.cjs'),"const assert=require('node:assert/strict'),equal=require('vreact-fast-compare');assert.equal(equal({x:[1]},{x:[1]}),true);");
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),"import assert from 'node:assert/strict';import equal from 'vreact-fast-compare';import cjs from './consumer.cjs';assert.equal(equal(new DataView(new Uint8Array([1]).buffer),new DataView(new Uint8Array([2]).buffer)),false);");
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],cwd);
  fs.writeFileSync(path.join(cwd,'browser.mjs'),"import equal from 'vreact-fast-compare';if(!equal({a:1},{a:1}))throw Error('comparison');");run('bun',['build','browser.mjs','--target','browser','--outfile','browser-built.mjs'],cwd);run('node',['browser-built.mjs'],cwd);
  fs.writeFileSync(path.join(cwd,'types.cts'),"import equal=require('vreact-fast-compare');const b:boolean=equal({},{});void b;");
  fs.writeFileSync(path.join(cwd,'types.mts'),"import equal from 'vreact-fast-compare';const b:boolean=equal({},{});void b;");
  fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
 }
 console.log('Packed npm/Bun CJS/ESM, browser bundle and TS7 consumers pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
