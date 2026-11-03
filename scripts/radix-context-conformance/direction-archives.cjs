'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-direction-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout}
try {
  const pkg=path.join(root,'packages/vradix-react-direction'),metadata=require(path.join(pkg,'package.json'));
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);
  const archive=path.join(temp,metadata.name+'-'+metadata.version+'.tgz');
  assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
  for(const manager of ['npm','bun']) {
    const cwd=path.join(temp,manager);fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{[metadata.name]:'file:'+archive,react:'19.2.4','react-dom':'19.2.4','@types/react':'19.2.14'}}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {DirectionProvider,Provider,useDirection} from 'vradix-react-direction';import {createRequire} from 'node:module';const api=createRequire(import.meta.url)('vradix-react-direction');assert.equal(api.DirectionProvider,DirectionProvider);assert.equal(api.Provider,Provider);assert.equal(api.useDirection,useDirection);function Child(){return React.createElement('b',null,api.useDirection())}assert.equal(renderToString(React.createElement(DirectionProvider,{dir:'rtl'},React.createElement(Child))),'<b>rtl</b>');`);
    for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.ts'),`import {createElement} from 'react';import {DirectionProvider,Provider,useDirection} from 'vradix-react-direction';const direction:'ltr'|'rtl'=useDirection();createElement(DirectionProvider,{dir:direction});createElement(Provider,{dir:'rtl'});
// @ts-expect-error invalid direction
useDirection('up');
// @ts-expect-error provider requires dir
createElement(Provider,{});`);
    for(const resolution of ['NodeNext','Bundler']) {
      fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022','DOM'],types:[]},files:['consumer.ts']}));
      run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
    }
    fs.writeFileSync(path.join(cwd,'browser.js'),`export {DirectionProvider,Provider,useDirection} from 'vradix-react-direction'`);
    run('bun',['build','browser.js','--target=browser','--outfile=bundle.js'],cwd);
  }
  console.log('Clean npm/Bun archives: Node/Bun CJS/ESM, SSR and shared direction context, TS7 NodeNext/Bundler DOM-only types and browser bundle pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
