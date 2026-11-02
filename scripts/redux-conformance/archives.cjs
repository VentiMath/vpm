'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-redux-archive-'));
function run(cmd,args,cwd=temp){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout}
try{
 const archives={};for(const name of ['vredux']){
  const pkg=path.join(root,'packages',name),version=require(path.join(pkg,'package.json')).version;
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);archives[name]='file:'+path.join(temp,name+'-'+version+'.tgz');
  assert.doesNotMatch(run('tar',['-tzf',archives[name].slice(5)]),/\/(test|bench|node_modules)\//);
 }
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:archives}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],cwd);
  const body="const store=redux.createStore((s=0,a)=>a.type==='add'?s+1:s);let seen;store.subscribe(()=>seen=store.getState());store.dispatch({type:'add'});if(seen!==1)throw Error('store');";
  fs.writeFileSync(path.join(cwd,'consumer.cjs'),"const redux=require('vredux');"+body);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),"import * as redux from 'vredux';"+body);
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],cwd);
  const output=require('esbuild').buildSync({entryPoints:[path.join(cwd,'consumer.mjs')],bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'\"production\"'}}).outputFiles[0].text;vm.runInNewContext(output,{});
  const source=fs.readFileSync(path.join(root,'packages/vredux/test/types.ts'),'utf8').replace("'../index.js'","'vredux'");
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(cwd,'types.'+ext),source);
  fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
  run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
 }
 console.log('Packed Redux npm/Bun installs: Node/Bun CJS/ESM, standalone browser build and strict TS7 consumers pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
