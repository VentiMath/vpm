'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-box-archive-'));
function run(cmd,args,cwd=temp){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout}
try{
 const archives={};for(const name of ['vtiny-invariant','vcss-box-model']){
  const pkg=path.join(root,'packages',name),version=require(path.join(pkg,'package.json')).version;
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);archives[name]='file:'+path.join(temp,name+'-'+version+'.tgz');
  assert.doesNotMatch(run('tar',['-tzf',archives[name].slice(5)]),/\/(test|bench|node_modules)\//);
 }
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:archives,overrides:{'vtiny-invariant':archives['vtiny-invariant']}}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],cwd);
  const body="const b=box.createBox({borderBox:{top:0,right:20,bottom:10,left:0}});if(b.contentBox.width!==20||box.withScroll(b,{x:5,y:7}).borderBox.top!==7)throw Error('geometry');";
  fs.writeFileSync(path.join(cwd,'consumer.cjs'),"const box=require('vcss-box-model');"+body);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),"import * as box from 'vcss-box-model';"+body);
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],cwd);
  const output=require('esbuild').buildSync({entryPoints:[path.join(cwd,'consumer.mjs')],bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;vm.runInNewContext(output,{});
  const source="import {createBox,getBox,calculateBox,type Rect,type BoxModel} from 'vcss-box-model';declare const el:Element;const b:BoxModel=getBox(el);const r:Rect=createBox({borderBox:el.getBoundingClientRect()}).contentBox;calculateBox(r,getComputedStyle(el));\n// @ts-expect-error incomplete edges\ncreateBox({borderBox:{top:1}});\n// @ts-expect-error element is required\ngetBox({});";
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(cwd,'types.'+ext),source);
  fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022','DOM'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
  run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
 }
 console.log('Packed box-model npm/Bun installs: Node/Bun CJS/ESM, standalone browser build and strict TS7 DOM consumers pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
