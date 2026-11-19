"use strict";
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),root=path.resolve(__dirname,'../..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'veventemitter3-archives-'));
const run=(bin,args,cwd=scratch,extra={})=>execFileSync(bin,args,{cwd,env:{...process.env,...extra,npm_config_cache:scratch+'/npm-cache',BUN_INSTALL_CACHE_DIR:scratch+'/bun-cache'},encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']});
try{
 const pack=JSON.parse(run('npm',['pack',root+'/packages/veventemitter3','--ignore-scripts','--json']))[0];
 assert.ok(pack.files.every(x=>!/^test\/|^bench\/|^node_modules\//.test(x.path)));
 for(const manager of ['npm','bun']){
  const dir=scratch+'/'+manager;fs.mkdirSync(dir);fs.writeFileSync(dir+'/package.json',JSON.stringify({name:'veventemitter3-consumer',private:true,type:'module',dependencies:{veventemitter3:'file:'+scratch+'/'+pack.filename}}));
  run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts'],dir);
  run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts','--frozen-lockfile'],dir);
  for(const ext of ['mts','cts'])fs.copyFileSync(__dirname+'/consumer.'+ext,dir+'/consumer.'+ext);
  run('node',[__dirname+'/types.cjs',dir]);
  fs.writeFileSync(dir+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import EventEmitter,{EventEmitter as Named} from 'veventemitter3';const require=createRequire(import.meta.url);assert.equal(EventEmitter,Named);assert.equal(EventEmitter,require('veventemitter3'));const e=new EventEmitter;let count=0;e.once('event',()=>count++);e.emit('event');e.emit('event');assert.equal(count,1);assert.equal(require('veventemitter3/package.json').dependencies,undefined);`);
  const env={VEVENTEMITTER3_ENTRY:dir+'/node_modules/veventemitter3/index.cjs'};
  for(const bin of ['node','bun']){run(bin,[dir+'/check.mjs'],dir);run(bin,[bin==='node'?'--test':'test',root+'/packages/veventemitter3/test/emitter.test.cjs'],dir,env);run(bin,[__dirname+'/probe.cjs'],dir,env);run(bin,[__dirname+'/node_modules/mocha/bin/mocha.js',__dirname+'/upstream/test/test.cjs','--reporter','dot'],dir,env);}
 }
 run('node',[__dirname+'/browser.cjs'],scratch,{VEVENTEMITTER3_ENTRY:scratch+'/npm/node_modules/veventemitter3/index.cjs'});
 console.log('Packed veventemitter3 ('+pack.size+' bytes): fresh/frozen npm+Bun, Node+Bun CJS/ESM, tests/caller and strict types pass');
}catch(e){console.error(e.stdout?.toString(),e.stderr?.toString());throw e}finally{fs.rmSync(scratch,{recursive:true,force:true})}
