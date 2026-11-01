'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-clsx-archive-'));
function run(command,args,cwd=temp) {const result=spawnSync(command,args,{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout;}
try {
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.join(root,'packages/vreact-is'));
  const archive=path.join(temp,'vreact-is-0.1.0.tgz');
  const entries=run('tar',['-tzf',archive]);assert.doesNotMatch(entries,/\/(test|bench|node_modules)\//);
  for(const manager of ['npm','bun']) {
    const dir=path.join(temp,manager);fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,dependencies:{'vreact-is':'file:'+archive}}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],dir);
    fs.writeFileSync(path.join(dir,'consumer.cjs'),`const assert=require('node:assert/strict'),api=require('vreact-is');assert.equal(api.isValidElementType('div'),true);assert.equal(api.isElement({}),false);`);
    fs.writeFileSync(path.join(dir,'consumer.mjs'),`import assert from 'node:assert/strict';import api,{isElement,Fragment,typeOf} from 'vreact-is';assert.equal(api.isElement,isElement);assert.equal(typeOf({$$typeof:api.Element,type:Fragment}),Fragment);`);
    for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],dir);
    fs.writeFileSync(path.join(dir,'browser.mjs'),`import {isValidElementType,isElement} from 'vreact-is';globalThis.vreactIsBrowserResult=[isValidElementType('div'),isElement({})];`);
    run('bun',['build','browser.mjs','--target','browser','--format','esm','--outfile','browser.bundle.mjs'],dir);
    fs.writeFileSync(path.join(dir,'browser-check.mjs'),`import './browser.bundle.mjs';import assert from 'node:assert/strict';assert.deepEqual(globalThis.vreactIsBrowserResult,[true,false]);`);
    run('node',['browser-check.mjs'],dir);
    fs.writeFileSync(path.join(dir,'types.cts'),`import api=require('vreact-is');const value:boolean=api.isElement({});void value;`);
    fs.writeFileSync(path.join(dir,'types.mts'),`import api,{isValidElementType,typeOf} from 'vreact-is';const value:boolean=isValidElementType('div');const tag:symbol|undefined=typeOf({});void [api,value,tag];`);
    fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
    run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],dir);
  }
  console.log('vreact-is packed npm/Bun consumers: Node/Bun CJS/ESM and TypeScript 7 pass without platform types.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
