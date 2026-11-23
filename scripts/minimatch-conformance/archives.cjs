'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-minimatch-archives-'));
const run=(bin,args,cwd=tmp,extra={})=>execFileSync(bin,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:tmp+'/npm-cache',BUN_INSTALL_CACHE_DIR:tmp+'/bun-cache',npm_config_audit:'false',npm_config_fund:'false',...extra}});
try{
 const dependencies={};
 for(const name of ['vbalanced-match','vbrace-expansion','vminimatch']){
  const pack=JSON.parse(run('npm',['pack',root+'/packages/'+name,'--ignore-scripts','--json']))[0];assert(pack.files.every(f=>!f.path.startsWith('test/')&&!f.path.startsWith('bench/')));dependencies[name]='file:../'+pack.filename;
 }
 for(const manager of ['npm','bun']){
  const cwd=tmp+'/'+manager;fs.mkdirSync(cwd);fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies,overrides:dependencies}));
  run(manager,['install','--ignore-scripts'],cwd);run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
  fs.writeFileSync(cwd+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import mm,{minimatch,Minimatch,GLOBSTAR} from 'vminimatch';assert.equal(mm,minimatch);assert.equal(createRequire(import.meta.url)('vminimatch'),mm);assert(mm('src/a.ts','**/*.{ts,tsx}'));assert.equal(new Minimatch('**').set[0][0],GLOBSTAR);assert.equal(new Minimatch('a/{0..999999}/b').match('a/555555/b'),true);`);
  for(const bin of ['node','bun']){run(bin,['check.mjs'],cwd);process.stdout.write(run(bin,[__dirname+'/callers.cjs'],cwd,{VPM_MINIMATCH_PACKAGE:cwd+'/node_modules/vminimatch'}));}
  fs.writeFileSync(cwd+'/check.mts',`import mm,{Minimatch,type MinimatchOptions,type ParseReturnFiltered,GLOBSTAR} from 'vminimatch';const o:MinimatchOptions={normalize:'NFC'};const m:Minimatch=new Minimatch('*',o);const b:boolean=mm('a','*');const rows:ParseReturnFiltered[][]=m.set;const stars:typeof GLOBSTAR[]=rows.flat().filter((p):p is typeof GLOBSTAR=>p===GLOBSTAR);\n// @ts-expect-error Invalid glob input.\nmm('x',1);`);
  fs.writeFileSync(cwd+'/check.cts',`import mm=require('vminimatch');const o:mm.MinimatchOptions={dot:true};const b:boolean=mm('x','*',o);const m=new mm.Minimatch('*');`);
  for(const resolution of ['NodeNext','Bundler']){
   fs.writeFileSync(cwd+'/tsconfig.json',JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='NodeNext'?'NodeNext':'ESNext',moduleResolution:resolution,lib:['ES2022'],types:[]},files:resolution==='NodeNext'?['check.cts','check.mts']:['check.mts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
  }
 }
 console.log('Fresh/frozen npm/Bun closure archives, Node/Bun callers, CJS/ESM and DOM-free TS7 consumers pass.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
