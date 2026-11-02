'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../packages/vtiny-invariant'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-invariant-archive-'));
function run(cmd,args,cwd=temp){const p=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(p.status,0,p.stdout+p.stderr);return p.stdout}
try{
 run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],root);const archive=path.join(temp,'vtiny-invariant-1.3.3.tgz');assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,dependencies:{'vtiny-invariant':'file:'+archive}}));run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],cwd);
  const body="invariant(true);let calls=0;try{invariant(false,()=>{calls++;return 'detail'})}catch(error){if(error.message!=='Invariant failed: detail')throw error}if(calls!==1)throw Error('lazy message');";
  fs.writeFileSync(path.join(cwd,'consumer.cjs'),"process.env.NODE_ENV='development';const invariant=require('vtiny-invariant');"+body);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),"process.env.NODE_ENV='development';const {default:invariant}=await import('vtiny-invariant');"+body);
  for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],cwd);
  fs.writeFileSync(path.join(cwd,'browser.mjs'),"import invariant from 'vtiny-invariant';invariant(true);try{invariant(false,()=>{throw Error('message ran')})}catch(error){if(error.message!=='Invariant failed')throw error}");
  run('bun',['build','browser.mjs','--target','browser','--define','process.env.NODE_ENV="production"','--outfile','browser-built.mjs'],cwd);run('node',['browser-built.mjs'],cwd);
  const source="import invariant from 'vtiny-invariant';declare let text:string|null;invariant(text);const value:string=text;invariant(value,()=> 'message');\n// @ts-expect-error message must be string or lazy string\ninvariant(value,42);\n// @ts-expect-error lazy message must return string\ninvariant(value,()=>42);";
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(cwd,'types.'+ext),source);
  fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
 }
 console.log('Packed invariant npm/Bun installs: Node/Bun CJS/ESM, production browser build and strict TS7 narrowing pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
