'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-brace-archives-'));
const run=(bin,args,cwd=tmp,extra={})=>execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:tmp+'/npm-cache',BUN_INSTALL_CACHE_DIR:tmp+'/bun-cache',npm_config_audit:'false',npm_config_fund:'false',...extra}});
try{
 const dependencies={};
 for(const name of ['vbalanced-match','vbrace-expansion']){
  const pack=JSON.parse(run('npm',['pack',root+'/packages/'+name,'--ignore-scripts','--json']))[0];
  assert(pack.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));dependencies[name]='file:../'+pack.filename;
 }
 for(const manager of ['npm','bun']){
  const cwd=tmp+'/'+manager;fs.mkdirSync(cwd);fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies,overrides:{'vbalanced-match':dependencies['vbalanced-match']}}));
  run(manager,['install','--ignore-scripts'],cwd);run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
  fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import expand,{expand as named,EXPANSION_MAX} from 'vbrace-expansion';assert.equal(expand,named);assert.equal(createRequire(import.meta.url)('vbrace-expansion'),expand);assert.equal(EXPANSION_MAX,100000);assert.deepEqual(expand('a{1..3}'),['a1','a2','a3']);`);
  for(const bin of ['node','bun']){run(bin,['check.mjs'],cwd);process.stdout.write(run(bin,[__dirname+'/callers.cjs'],cwd,{VPM_BRACE_PACKAGE:cwd+'/node_modules/vbrace-expansion'}));}
  fs.writeFileSync(cwd+'/check.mts',`import expand,{expand as named,type BraceExpansionOptions,EXPANSION_MAX_DEPTH} from 'vbrace-expansion';const options:BraceExpansionOptions={max:3,maxLength:50,maxDepth:EXPANSION_MAX_DEPTH,maxSteps:100,maxRewrites:2};const values:string[]=expand('{a,b}',options);named('{c,d}');\n// @ts-expect-error Numeric pattern is not supported.\nexpand(1);\n`);
  fs.writeFileSync(cwd+'/check.cts',`import expand=require('vbrace-expansion');const options:expand.BraceExpansionOptions={max:2};const values:string[]=expand.expand('{a,b}',options);expand('{a,b}');`);
  for(const resolution of ['NodeNext','Bundler']){
   fs.writeFileSync(cwd+'/tsconfig.json',JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='NodeNext'?'NodeNext':'ESNext',moduleResolution:resolution,lib:['ES2022'],types:[]},files:resolution==='NodeNext'?['check.cts','check.mts']:['check.mts']}));
   run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
  }
 }
 console.log('Fresh/frozen npm/Bun closure archives, Node/Bun callers, CJS/ESM and DOM-free TS7 consumers pass.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
