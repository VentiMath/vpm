'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../packages/vshallow-equal'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-shallow-archive-'));
function run(cmd,args,cwd=temp){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout;}
try{
 run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],root);const archive=path.join(temp,'vshallow-equal-3.1.0.tgz');assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:{'vshallow-equal':'file:'+archive}}));run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.cjs'),"const assert=require('node:assert/strict');const equal=require('vshallow-equal');assert(equal.shallowEqual({x:1},{x:1}));for(const sub of ['arrays','arrays.js','objects','objects.js'])assert(require('vshallow-equal/'+sub)([],[]));");
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),"import assert from 'node:assert/strict';import {shallowEqual} from 'vshallow-equal';assert(shallowEqual([1],[1]));for(const sub of ['arrays','arrays.js','objects','objects.js'])assert((await import('vshallow-equal/'+sub)).default([],[]));");
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],cwd);
  fs.writeFileSync(path.join(cwd,'browser.mjs'),"import {shallowEqual} from 'vshallow-equal';import arrays from 'vshallow-equal/arrays';if(!shallowEqual({x:1},{x:1})||!arrays([1],[1]))throw Error('compare');");run('bun',['build','browser.mjs','--target','browser','--outfile','browser-built.mjs'],cwd);run('node',['browser-built.mjs'],cwd);
  const source="import {shallowEqual, shallowEqualArrays} from 'vshallow-equal';import arrays from 'vshallow-equal/arrays';import objects from 'vshallow-equal/objects';const values=[1,2] as const;const results:boolean[]=[shallowEqual({},{}),arrays(values,values),objects({},{}),shallowEqualArrays(null,undefined)];void results;\n// @ts-expect-error arrays are required\narrays(1,2);";
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(cwd,'types.'+ext),source);
  fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
 }
 console.log('Shallow-equal packed npm/Bun: all CJS/ESM exports, legacy paths, browser bundle and TS7 consumers pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
