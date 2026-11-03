'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-context-'));
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout}
try {
  const pkg=path.join(root,'packages/vradix-react-context'),metadata=require(path.join(pkg,'package.json'));
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);
  const archive=path.join(temp,metadata.name+'-'+metadata.version+'.tgz');
  assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(test|bench|node_modules)\//);
  for(const manager of ['npm','bun']) {
    const cwd=path.join(temp,manager);fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{[metadata.name]:'file:'+archive,react:'19.2.4','react-dom':'19.2.4','@types/react':'19.2.14'}}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createContext,createContextScope} from 'vradix-react-context';import {createRequire} from 'node:module';const api=createRequire(import.meta.url)('vradix-react-context');assert.equal(api.createContext,createContext);assert.equal(api.createContextScope,createContextScope);const [Provider,use]=createContext('Root');function Child(){return React.createElement('b',null,use('Child').value)}assert.equal(renderToString(React.createElement(Provider,{value:7},React.createElement(Child))),'<b>7</b>');`);
    for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
    fs.writeFileSync(path.join(cwd,'consumer.ts'),`import {createContext,createContextScope,type Scope,type CreateScope} from 'vradix-react-context';const [Provider,use]=createContext<{value:number}>('Root');const value:number=use('Child').value;const optional=use('Child',{optional:true});const [Default,readDefault]=createContext('D',{value:1});const sure:number=readDefault('C').value;const [create,scope]=createContextScope('S');const factory:CreateScope=scope;const [Scoped,readScoped]=create<{n:number}>('Scoped');const scopeValue:Scope=undefined;const n:number=readScoped('C',scopeValue).n;void [Provider,Default,Scoped,value,sure,n,factory,optional];\n// @ts-expect-error optional read must be narrowed\nconst bad:number=optional.value;\n// @ts-expect-error context value type is checked\nconst wrong:string=use('Child').value;`);
    for(const resolution of ['NodeNext','Bundler']) {
      fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022','DOM'],types:[]},files:['consumer.ts']}));
      run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
    }
    fs.writeFileSync(path.join(cwd,'browser.js'),`export {createContext,createContextScope} from 'vradix-react-context'`);
    run('bun',['build','browser.js','--target=browser','--outfile=bundle.js'],cwd);
  }
  console.log('Clean npm/Bun archives: Node/Bun CJS/ESM, SSR, contexts and scopes, TS7 NodeNext/Bundler DOM-only types and browser bundle pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
