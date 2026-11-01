'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-tabbable-archive-'));
function run(command,args,cwd=temp) {const result=spawnSync(command,args,{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout;}
try {
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.join(root,'packages/vtabbable'));
  const archive=path.join(temp,'vtabbable-6.5.1.tgz');
  const entries=run('tar',['-tzf',archive]);assert.doesNotMatch(entries,/\/(test|bench|node_modules)\//);
  for(const manager of ['npm','bun']) {
    const dir=path.join(temp,manager);fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,dependencies:{'vtabbable':'file:'+archive}}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],dir);
    fs.writeFileSync(path.join(dir,'consumer.cjs'),`const assert=require('node:assert/strict'),api=require('vtabbable');for(const name of ['tabbable','focusable','isTabbable','isFocusable','getTabIndex'])assert.equal(typeof api[name],'function');`);
    fs.writeFileSync(path.join(dir,'consumer.mjs'),`import assert from 'node:assert/strict';import {tabbable} from 'vtabbable';import api from 'vtabbable';assert.equal(api.tabbable,tabbable);`.replace("import api from 'vtabbable';", "import {createRequire} from 'node:module';const api=createRequire(import.meta.url)('vtabbable');"));
    for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],dir);
    fs.writeFileSync(path.join(dir,'browser.mjs'),`import {tabbable} from 'vtabbable';globalThis.vtabbableBrowserResult=typeof tabbable;`);
    run('bun',['build','browser.mjs','--target','browser','--format','esm','--outfile','browser.bundle.mjs'],dir);
    fs.writeFileSync(path.join(dir,'browser-check.mjs'),`import './browser.bundle.mjs';import assert from 'node:assert/strict';assert.equal(globalThis.vtabbableBrowserResult,'function');`);
    run('node',['browser-check.mjs'],dir);
    fs.writeFileSync(path.join(dir,'types.cts'),`import api=require('vtabbable');const nodes:(HTMLElement|SVGElement)[]=api.tabbable(document.body,{getShadowRoot:true,displayCheck:'full-native'});void nodes;`);
    fs.writeFileSync(path.join(dir,'types.mts'),`import {focusable,type CheckOptions} from 'vtabbable';const options:CheckOptions={getShadowRoot:node=>node.shadowRoot||undefined};const nodes:(HTMLElement|SVGElement)[]=focusable(document.body,options);void nodes;`);
    fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022','DOM'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
    run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],dir);
  }
  console.log('vtabbable packed npm/Bun consumers: Node/Bun CJS/ESM and TypeScript 7 pass with DOM types and no Node/React type dependency.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
