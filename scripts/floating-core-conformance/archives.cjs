'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-core-archives-'));
function run(command,args,cwd=temp){const r=spawnSync(command,args,{cwd,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
try {
 const dependencies={};
 for(const name of ['vfloating-ui-utils','vfloating-ui-core']){
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.join(root,'packages',name));
  dependencies[name]='file:'+path.join(temp,name+'-0.1.0.tgz');
  assert.doesNotMatch(run('tar',['-tzf',dependencies[name].slice(5)]),/\/(test|bench|node_modules)\//);
 }
 for(const manager of ['npm','bun']){
  const dir=path.join(temp,manager);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,dependencies,...(manager==='bun'?{overrides:dependencies}:{})}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],dir);
  fs.writeFileSync(path.join(dir,'consumer.cjs'),`const assert=require('node:assert/strict'),api=require('vfloating-ui-core');const platform={getElementRects:()=>({reference:{x:0,y:0,width:20,height:10},floating:{x:0,y:0,width:10,height:5}})};api.computePosition({}, {}, {platform,middleware:[api.offset(4)]}).then(result=>assert.deepEqual([result.x,result.y],[5,14])).catch(e=>{console.error(e);process.exitCode=1;});`);
  fs.writeFileSync(path.join(dir,'consumer.mjs'),`import assert from 'node:assert/strict';import {computePosition,offset} from 'vfloating-ui-core';import {createRequire} from 'node:module';const cjs=createRequire(import.meta.url)('vfloating-ui-core');assert.equal(cjs.computePosition,computePosition);assert.equal(offset(4).name,'offset');`);
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],dir);
  fs.writeFileSync(path.join(dir,'browser.mjs'),`import {computePosition,offset} from 'vfloating-ui-core';globalThis.coreBrowser={computePosition,offset};`);run('bun',['build','browser.mjs','--target','browser','--format','esm','--outfile','browser.bundle.mjs'],dir);
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(dir,'types.'+ext),`import {computePosition,offset,flip,shift,limitShift,type Platform,type Middleware} from 'vfloating-ui-core';const middleware:Middleware[]=[offset(4),flip({crossAxis:'alignment'}),shift({limiter:limitShift({offset:4})})];const platform:Platform={getElementRects:()=>({reference:{x:0,y:0,width:20,height:10},floating:{x:0,y:0,width:10,height:5}}),getClippingRect:()=>({x:0,y:0,width:100,height:100}),getDimensions:()=>({width:10,height:5}),detectOverflow:async()=>({top:0,right:0,bottom:0,left:0})};const result:Promise<{x:number;y:number}>=computePosition({}, {}, {platform,middleware});void result;`);
  fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022','DOM'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
  run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],dir);
 }
 console.log('Packed core + utils: npm/Bun install, Node/Bun CJS/ESM, browser bundle and TypeScript 7 consumers pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
