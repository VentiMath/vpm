'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const directory=path.resolve(process.argv[2]||'.'),published=process.argv.includes('--published'),manifest=JSON.parse(fs.readFileSync(directory+'/release-manifest.json'));
assert.equal(manifest.packages.length,1);
const item=manifest.packages[0],cookie=item.name==='vjs-cookie';assert(cookie||item.name==='vcamelize');
const installName=cookie?'js-cookie':'camelize',caller=cookie?'@aws-amplify/core':'css-to-react-native',callerVersion=cookie?'6.11.2':'3.2.0',fixture=path.resolve(__dirname,installName+'-conformance');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-leaf-release-')),hash=x=>createHash('sha256').update(x).digest('hex');
const run=(bin,args,cwd=scratch,env={})=>execFileSync(bin,args,{cwd,env:{...process.env,...env,npm_config_cache:scratch+'/npm-cache',BUN_INSTALL_CACHE_DIR:scratch+'/bun-cache'},encoding:'utf8',timeout:180000,maxBuffer:4e6,stdio:['ignore','pipe','pipe']});
(async()=>{try{
 assert.deepEqual(item.dependencies,{});
 assert.equal(item.url,'https://github.com/VentiMath/vpm/releases/download/'+manifest.tag+'/'+item.asset);
 assert.deepEqual(JSON.parse(fs.readFileSync(directory+'/consumer-package.json')),{overrides:{[installName]:item.url}});
 for(const line of fs.readFileSync(directory+'/SHA256SUMS','utf8').trim().split('\n')){const [digest,file]=line.split('  ');assert.match(file,/^[a-zA-Z0-9._-]+$/);assert.equal(hash(fs.readFileSync(directory+'/'+file)),digest);}
 assert.equal(hash(fs.readFileSync(directory+'/'+item.asset)),item.sha256);
 if(published)for(const file of [item.asset,'release-manifest.json','consumer-package.json','SHA256SUMS']){
  const response=await fetch('https://github.com/VentiMath/vpm/releases/download/'+manifest.tag+'/'+file);assert(response.ok,file+': '+response.status);assert.deepEqual(Buffer.from(await response.arrayBuffer()),fs.readFileSync(directory+'/'+file));
 }
 for(const manager of ['npm','bun']){
  const dir=scratch+'/'+manager;fs.mkdirSync(dir);
  const location=published?item.url:'file:'+directory+'/'+item.asset;
  fs.writeFileSync(dir+'/package.json',JSON.stringify({private:true,type:'module',dependencies:{[caller]:callerVersion},overrides:{[installName]:location}}));
  run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts'],dir);
  function verify(){
   const req=createRequire(dir+'/package.json'),fromCaller=createRequire(req.resolve(caller)),entry=path.dirname(fromCaller.resolve(installName+'/package.json'));
   const meta=JSON.parse(fs.readFileSync(entry+'/package.json'));assert.equal(meta.name,item.name);assert.equal(meta.version,item.version);assert.deepEqual(meta.dependencies||{},{});
   for(const [file,digest]of Object.entries(item.sourceFiles))assert.equal(hash(fs.readFileSync(entry+'/'+file)),digest,file);
   return entry;
  }
  verify();const lock=dir+'/'+(manager==='npm'?'package-lock.json':'bun.lock'),locked=fs.readFileSync(lock);
  run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts','--frozen-lockfile'],dir);assert.deepEqual(fs.readFileSync(lock),locked);const entry=verify();
  // Test the original import name, just as the unchanged consumer will resolve it.
  for(const ext of ['mts','cts'])fs.writeFileSync(dir+'/consumer.'+ext,fs.readFileSync(fixture+'/consumer.'+ext,'utf8').replaceAll(item.name,installName));
  process.stdout.write(run('node',[fixture+'/types.cjs',dir],dir));
  if(cookie){
   fs.writeFileSync(dir+'/check.mjs',fs.readFileSync(fixture+'/archive-check.mjs','utf8').replaceAll('vjs-cookie','js-cookie'));
   const test=fs.readFileSync(path.resolve(__dirname,'../packages/vjs-cookie/test/cookies.test.cjs'),'utf8').replace("require('..')",'require('+JSON.stringify(entry+'/index.cjs')+')');fs.writeFileSync(dir+'/cookies.test.cjs',test);
   for(const bin of ['node','bun']){run(bin,['check.mjs'],dir);run(bin,[bin==='node'?'--test':'test','cookies.test.cjs'],dir);}
   if(manager==='npm')process.stdout.write(run('node',[fixture+'/browser.cjs'],dir,{VPM_COOKIE_ENTRY:entry+'/index.mjs'}));
  }else{
   fs.writeFileSync(dir+'/check.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import camelize from 'camelize';const require=createRequire(import.meta.url);assert.equal(camelize,require('camelize'));assert.equal(require('css-to-react-native').default([['background-color','red']]).backgroundColor,'red');`);
   for(const bin of ['node','bun']){run(bin,['check.mjs'],dir);run(bin,[bin==='node'?'--test':'test',path.resolve(__dirname,'../packages/vcamelize/test/camelize.test.cjs')],dir,{VCAMELIZE_ENTRY:entry+'/index.cjs'});process.stdout.write(run(bin,[fixture+'/probe.cjs'],dir,{VCAMELIZE_ENTRY:entry+'/index.cjs'}));}
  }
 }
 console.log(manifest.tag+': '+(published?'public URLs, ':'')+'checksums/source files, fresh/frozen npm+Bun original-name overrides, Node/Bun tests, strict types and callers pass');
}catch(e){console.error(e.stdout?.toString()||'',e.stderr?.toString()||'');throw e}finally{fs.rmSync(scratch,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
