'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-vlx-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout}
try{
 const pkg=path.join(root,'packages/vlx');run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);const archive=path.join(temp,'vlx-0.1.0.tgz'),files=run('tar',['-tzf',archive]);assert.doesNotMatch(files,/\/(test|bench|node_modules)\//);assert.match(files,/font\/NOTICE/);assert.match(files,/font\/LICENSE/);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{vlx:'file:'+archive}}));run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  assert.ok(!fs.existsSync(path.join(cwd,'node_modules/katex')));assert.ok(!fs.existsSync(path.join(cwd,'node_modules/@mathjax')));
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createRenderer,renderMath} from 'vlx';assert.equal(createRequire(import.meta.url)('vlx').renderMath,renderMath);const r=createRenderer();assert.match(r.renderText('Find $x$.').html,/<math/);assert.match(renderMath('x^2').svg,/<path/);assert.match(renderMath('x^2').mathml,/<msup>/);`);for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.ts'),`import {renderMath,createRenderer} from 'vlx';const s:string=renderMath('x',{display:true}).svg;createRenderer().renderText('Text');\n// @ts-expect-error No engine selector\ncreateRenderer({engine:'katex'});`);
  for(const resolution of ['NodeNext','Bundler']){fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022'],types:[]},files:['consumer.ts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd)}
  fs.writeFileSync(path.join(cwd,'browser.js'),`export {renderMath,createRenderer} from 'vlx'`);run('bun',['build','browser.js','--target=browser','--outfile=bundle.js'],cwd);
  const meta=JSON.parse(fs.readFileSync(path.join(cwd,'package.json')));meta.dependencies['@resvg/resvg-js']='2.6.2';fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify(meta));run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  fs.writeFileSync(path.join(cwd,'png.mjs'),`import assert from 'node:assert/strict';import {createRenderer} from 'vlx';import {renderPng} from 'vlx/png';const p=await renderPng(createRenderer(),'x^2');assert.equal(p.data[0],137);assert.ok(p.width>0&&p.height>0);`);for(const runtime of ['node','bun'])run(runtime,['png.mjs'],cwd);
 }
 console.log('VLX clean npm/Bun archives: independent Node/Bun CJS/ESM, DOM-free TS7, browser bundle, optional PNG rasterization and font notices pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
