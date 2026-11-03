'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-radix-rect-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout}
try {
 const pkg=path.join(root,'packages/vradix-rect');run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);const archive=path.join(temp,'vradix-rect-1.1.3.tgz');assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{'vradix-rect':'file:'+archive}}));run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {observeElementRect} from 'vradix-rect';assert.equal(createRequire(import.meta.url)('vradix-rect').observeElementRect,observeElementRect);let next;globalThis.requestAnimationFrame=fn=>(next=fn,1);globalThis.cancelAnimationFrame=()=>next=null;let value;const off=observeElementRect({getBoundingClientRect:()=>({left:7})},rect=>value=rect.left);next();assert.equal(value,7);off();assert.equal(next,null);`);for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.ts'),`import {observeElementRect,type Measurable} from 'vradix-rect';const element:Measurable=document.body;const stop:()=>void=observeElementRect(element,rect=>{const x:number=rect.x});stop();\n// @ts-expect-error not measurable\nobserveElementRect({},()=>{});`);
  for(const resolution of ['NodeNext','Bundler']){fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022','DOM'],types:[]},files:['consumer.ts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd)}
  fs.writeFileSync(path.join(cwd,'browser.js'),`export {observeElementRect} from 'vradix-rect'`);run('bun',['build','browser.js','--target=browser','--outfile=bundle.js'],cwd);
 }
 console.log('Clean npm/Bun archives, CJS/ESM, Node/Bun observation, TS7 DOM-only declarations and browser bundles pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
