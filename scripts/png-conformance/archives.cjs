'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-png-archive-'));
function run(cmd,args,cwd=temp){const result=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:path.join(temp,'npm-cache'),BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache')}});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout;}
try{
 const pkg=path.join(root,'packages/vpngjs');run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);const archive=path.join(temp,'vpngjs-7.0.0.tgz');assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(?:test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{vpngjs:'file:'+archive}}));run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  fs.copyFileSync(path.join(__dirname,'images/basi6a08.png'),path.join(cwd,'image.png'));
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import api,{PNG} from 'vpngjs';assert.equal(PNG,createRequire(import.meta.url)('vpngjs').PNG);assert.equal(api.PNG,PNG);const image=PNG.sync.read(readFileSync('image.png'),{checkCRC:true});assert.equal(image.width,32);assert.equal(image.height,32);assert.equal(image.data.length,4096);assert(Buffer.isBuffer(image.data));assert.equal(image.interlace,true);assert.throws(()=>PNG.sync.read(readFileSync('image.png'),{maxPixels:10}));`);
  for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.ts'),`import {PNG,type ReadOptions} from 'vpngjs';const opts:ReadOptions={checkCRC:true,maxPixels:16000000};const png:PNG=PNG.sync.read(new Uint8Array(),opts);const width:number=png.width;const pixels:Uint8Array=png.data;
// @ts-expect-error input is bytes
PNG.sync.read('file.png');
// @ts-expect-error writer is outside application scope
PNG.sync.write(png);
// @ts-expect-error no streaming constructor
new PNG();`);
  for(const resolution of ['NodeNext','Bundler']){fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022'],types:[]},files:['consumer.ts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);}
 }
 console.log('Clean npm/Bun archives: Node/Bun CJS/ESM decode and TS7 NodeNext/Bundler without Node/DOM declaration dependencies pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
