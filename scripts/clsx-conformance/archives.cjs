'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-clsx-archive-'));
function run(command,args,cwd=temp) {const result=spawnSync(command,args,{cwd,encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout;}
try {
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],path.join(root,'packages/vclsx'));
  const archive=path.join(temp,'vclsx-'+require('../../packages/vclsx/package.json').version+'.tgz');
  const entries=run('tar',['-tzf',archive]);assert.doesNotMatch(entries,/\/(test|bench|node_modules)\//);
  for(const manager of ['npm','bun']) {
    const dir=path.join(temp,manager);fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true,dependencies:{vclsx:'file:'+archive}}));
    run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'cache')]:[])],dir);
    fs.writeFileSync(path.join(dir,'consumer.cjs'),`const assert=require('node:assert/strict'),full=require('vclsx'),lite=require('vclsx/lite');assert.equal(full('a',[{b:true}]),'a b');assert.equal(lite('a',{},'b'),'a b');`);
    fs.writeFileSync(path.join(dir,'consumer.mjs'),`import assert from 'node:assert/strict';import clsx,{clsx as named} from 'vclsx';import lite from 'vclsx/lite';assert.equal(clsx,named);assert.equal(clsx('a',[{b:true}]),'a b');assert.equal(lite('a',{},'b'),'a b');`);
    for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file],dir);
    fs.writeFileSync(path.join(dir,'browser.mjs'),`import clsx from 'vclsx';import lite from 'vclsx/lite';globalThis.vclsxBrowserResult=[clsx('a',[{b:true}]),lite('a',{},'b')];`);
    run('bun',['build','browser.mjs','--target','browser','--format','esm','--outfile','browser.bundle.mjs'],dir);
    fs.writeFileSync(path.join(dir,'browser-check.mjs'),`import './browser.bundle.mjs';import assert from 'node:assert/strict';assert.deepEqual(globalThis.vclsxBrowserResult,['a b','a b']);`);
    run('node',['browser-check.mjs'],dir);
    fs.writeFileSync(path.join(dir,'types.cts'),`import clsx=require('vclsx');const value: string=clsx(['a',{b:true}] as const);void value;`);
    fs.writeFileSync(path.join(dir,'types.mts'),`import clsx,{type ClassValue} from 'vclsx';import lite from 'vclsx/lite';const input:ClassValue=['a',{b:true}] as const;const value:string=clsx(input);const other:string=lite('x',false);void [value,other];`);
    fs.writeFileSync(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',lib:['ES2022'],types:[],module:'NodeNext',moduleResolution:'NodeNext'},files:['types.cts','types.mts']}));
    run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],dir);
  }
  console.log('vclsx packed npm/Bun consumers: Node/Bun CJS/ESM and TypeScript 7 pass without platform types.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
