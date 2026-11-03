'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-radix-id-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout}
try {
  const pkg=path.join(root,'packages/vradix-react-id'),metadata=require(path.join(pkg,'package.json'));
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);
  const archive=path.join(temp,metadata.name+'-'+metadata.version+'.tgz');
  assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
  for(const manager of ['npm','bun'])for(const version of ['19.1.0','19.2.4']) {
    const cwd=path.join(temp,manager+'-'+version);fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{[metadata.name]:'file:'+archive,react:version,'react-dom':version,jsdom:'27.4.0','@types/react':'19.2.14'}}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createRoot} from 'react-dom/client';import {flushSync} from 'react-dom';import {JSDOM} from 'jsdom';import {useId} from 'vradix-react-id';import {createRequire} from 'node:module';assert.equal(createRequire(import.meta.url)('vradix-react-id').useId,useId);function Child({override}){return React.createElement('b',{id:useId(override)},'child')}assert.match(renderToString(React.createElement(Child)),/id="radix-/);const dom=new JSDOM('<div id="root"></div>');globalThis.window=dom.window;globalThis.document=dom.window.document;const root=createRoot(document.getElementById('root'));flushSync(()=>root.render(React.createElement(Child)));const id=document.querySelector('b').id;flushSync(()=>root.render(React.createElement(Child,{override:'fixed'})));assert.equal(document.querySelector('b').id,'fixed');flushSync(()=>root.render(React.createElement(Child)));assert.equal(document.querySelector('b').id,id);flushSync(()=>root.unmount());dom.window.close();`);
    for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.ts'),`import {useId} from 'vradix-react-id';const id:string=useId();const explicit:string=useId('fixed');useId(undefined);
// @ts-expect-error IDs must be strings
useId(42);`);
    for(const resolution of ['NodeNext','Bundler']) {
      fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022','DOM'],types:[]},files:['consumer.ts']}));
      run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
    }
    fs.writeFileSync(path.join(cwd,'browser.js'),`export {useId} from 'vradix-react-id'`);
    run('bun',['build','browser.js','--target=browser','--outfile=bundle.js'],cwd);
  }
  console.log('Clean npm/Bun archives: Node/Bun CJS/ESM, SSR, stable ID overrides, TS7 NodeNext/Bundler DOM-only types and browser bundle on React 19.1/19.2 pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
