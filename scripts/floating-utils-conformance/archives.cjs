'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-floating-archive-'));
function run(command,args,cwd=temp) {const result=spawnSync(command,args,{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout;}
try {
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.join(root,'packages/vfloating-ui-utils'));
  const archive=path.join(temp,'vfloating-ui-utils-0.1.0.tgz');
  const entries=run('tar',['-tzf',archive]);assert.doesNotMatch(entries,/\/(test|bench|node_modules)\//);
  for(const manager of ['npm','bun']) {
    const dir=path.join(temp,manager);fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,dependencies:{'vfloating-ui-utils':'file:'+archive}}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],dir);
    fs.writeFileSync(path.join(dir,'consumer.cjs'),`const assert=require('node:assert/strict'),api=require('vfloating-ui-utils');assert.equal(api.getSide('top-start'),'top');assert.equal(require('vfloating-ui-utils/dom').isElement({}),false);`);
    fs.writeFileSync(path.join(dir,'consumer.mjs'),`import assert from 'node:assert/strict';import {getAlignment} from 'vfloating-ui-utils';import {isNode} from 'vfloating-ui-utils/dom';assert.equal(getAlignment('top-end'),'end');assert.equal(isNode({}),false);`);
    for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],dir);
    fs.writeFileSync(path.join(dir,'browser.mjs'),`import {getSide} from 'vfloating-ui-utils';import {isNode} from 'vfloating-ui-utils/dom';globalThis.vfloatingBrowserResult=[getSide('top-start')==='top',isNode({})];`);
    run('bun',['build','browser.mjs','--target','browser','--format','esm','--outfile','browser.bundle.mjs'],dir);
    fs.writeFileSync(path.join(dir,'browser-check.mjs'),`import './browser.bundle.mjs';import assert from 'node:assert/strict';assert.deepEqual(globalThis.vfloatingBrowserResult,[true,false]);`);
    run('node',['browser-check.mjs'],dir);
    fs.writeFileSync(path.join(dir,'types.cts'),`import api=require('vfloating-ui-utils');import dom=require('vfloating-ui-utils/dom');const value:api.Side=api.getSide('left-end');const nodes:ReturnType<typeof dom.getOverflowAncestors>=[];void [value,nodes];`);
    fs.writeFileSync(path.join(dir,'types.mts'),`import {getOppositeAxisPlacements,type Placement} from 'vfloating-ui-utils';import {isElement} from 'vfloating-ui-utils/dom';const value:Placement[]=getOppositeAxisPlacements('top',true,'start');const element:unknown={};if(isElement(element))element.getBoundingClientRect();void value;`);
    fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022','DOM'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
    run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],dir);
  }
  console.log('vfloating-ui-utils packed npm/Bun consumers: Node/Bun CJS/ESM and TypeScript 7 pass with DOM types and no Node/React type dependency.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
