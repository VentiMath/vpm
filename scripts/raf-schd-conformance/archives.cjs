'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-raf-long-archives-'));
function run(cmd,args,cwd=temp){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout}
try {
 const archives={};
 for(const [name,version]of [['vraf-schd','4.0.3'],['vlong','5.3.2']]){
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.resolve(__dirname,'../../packages',name));
  archives[name]='file:'+path.join(temp,`${name}-${version}.tgz`);
  assert.doesNotMatch(run('tar',['-tzf',archives[name].slice(5)]),/\/(test|bench|node_modules)\//);
 }
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:archives}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],cwd);
  const body="let frame;globalThis.requestAnimationFrame=cb=>{frame=cb;return 0};globalThis.cancelAnimationFrame=()=>{frame=null};let result;const fn=schedule(value=>{result=value});fn(1);fn(2);frame();if(result!==2)throw Error('frame');if(Long.MAX_UNSIGNED_VALUE.add(1).toString()!=='0')throw Error('integer');";
  fs.writeFileSync(path.join(cwd,'consumer.cjs'),"const schedule=require('vraf-schd'),Long=require('vlong');"+body);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),"import schedule from 'vraf-schd';import Long from 'vlong';"+body);
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],cwd);
  run('bun',['build','consumer.mjs','--target','browser','--outfile','browser.mjs'],cwd);run('node',['browser.mjs'],cwd);
  const types="import schedule from 'vraf-schd';import Long from 'vlong';const fn=schedule((value:number,label:string)=>value+label.length);fn(1,'drag');fn.cancel();const value:bigint=Long.fromString('123').toBigInt();void value;\n// @ts-expect-error wrong parameter type\nfn('wrong','drag');\n// @ts-expect-error missing parameter\nfn(1);";
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(cwd,'types.'+ext),types);
  fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
  run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
 }
 console.log('vraf-schd and vlong packed npm/Bun installs: Node/Bun CJS/ESM, browser bundles and strict TS7 contracts pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
