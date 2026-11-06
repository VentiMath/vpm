'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const directory=path.resolve(process.argv[2]||'.'),published=process.argv.includes('--published');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'release-manifest.json')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-dropdown-release-check-'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const topName='@radix-ui/react-dropdown-menu';
function run(cmd,args,cwd){
 const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:4e6,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache')}});
 assert.ifError(r.error);assert.equal(r.status,0,(r.stdout+r.stderr).slice(-12000));return r.stdout;
}
(async()=>{try{
 assert.equal(manifest.packages.length,35);
 const top=manifest.packages.find(p=>p.name==='vradix-react-dropdown-menu');assert(top);
 const recipe=JSON.parse(fs.readFileSync(path.join(directory,'consumer-package.json')));
 assert.deepEqual(recipe,{dependencies:{[topName]:top.url},overrides:{[topName]:top.url}});
 for(const item of manifest.packages){
  assert.equal(hash(fs.readFileSync(path.join(directory,item.asset))),item.sha256,item.asset);
  if(published){const response=await fetch(item.url);assert(response.ok,item.url+': '+response.status);assert.equal(hash(Buffer.from(await response.arrayBuffer())),item.sha256,item.url);}
 }
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);const react=manager==='npm'?'19.1.0':'19.2.4';
  // Model the installed Amplify caller's older exact dependency. The one upstream
  // override must route that unchanged import to the same public VPM instance.
  const caller=path.join(cwd,'caller');fs.mkdirSync(caller);
  fs.writeFileSync(path.join(caller,'package.json'),JSON.stringify({name:'dropdown-caller-control',version:'1.0.0',main:'index.cjs',dependencies:{[topName]:'2.1.16'}}));
  fs.writeFileSync(path.join(caller,'index.cjs'),`module.exports=require('${topName}');`);
  const deps={react,'react-dom':react,'@types/react':'19.2.14'};
  const overrides={};
  if(published || manager==='npm'){
   deps[topName]=published?top.url:'file:'+path.join(directory,top.asset);deps['dropdown-caller-control']='file:'+caller;overrides[topName]=deps[topName];
   if(!published)for(const item of manifest.packages)if(item!==top)overrides[item.name]='file:'+path.join(directory,item.asset);
  }
  fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:deps,...(Object.keys(overrides).length?{overrides}:{})}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  if(!published&&manager==='bun')for(const item of manifest.packages){
   const unpack=path.join(cwd,'unpack-'+item.name);fs.mkdirSync(unpack);run('tar',['-xzf',path.join(directory,item.asset),'-C',unpack],cwd);
   const dest=path.join(cwd,'node_modules',item===top?topName:item.name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.renameSync(path.join(unpack,'package'),dest);
  }
  for(const item of manifest.packages){
   const folder=path.join(cwd,'node_modules',item===top?topName:item.name),meta=JSON.parse(fs.readFileSync(path.join(folder,'package.json')));
   assert.equal(meta.name,item.name);assert.equal(meta.version,item.version);assert.deepEqual(meta.dependencies||{},item.dependencies);
   for(const [file,digest] of Object.entries(item.sourceFiles))assert.equal(hash(fs.readFileSync(path.join(folder,file))),digest,item.name+'/'+file);
   for(const url of Object.values(meta.dependencies||{}))assert(url.startsWith('https://github.com/VentiMath/vpm/releases/download/'+manifest.tag+'/'));
  }
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {createRequire} from 'node:module';import * as P from '${topName}';const require=createRequire(import.meta.url);assert.equal(require('${topName}').Root,P.Root);${published||manager==='npm'?"assert.equal(require('dropdown-caller-control').Root,P.Root);":''}const html=renderToString(React.createElement(P.Root,{defaultOpen:true,modal:false},React.createElement(P.Trigger,null,'Menu'),React.createElement(P.Content,null,React.createElement(P.Item,null,'Save'))));assert.match(html,/aria-haspopup="menu"/);assert.match(html,/role="menuitem"/);`);
  for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  fs.copyFileSync(path.join(__dirname,'radix-dropdown-menu-conformance/release-consumer.tsx'),path.join(cwd,'consumer.tsx'));
  for(const mode of ['NodeNext','Bundler']){
   fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,exactOptionalPropertyTypes:true,noEmit:true,target:'ES2022',module:mode==='Bundler'?'ESNext':mode,moduleResolution:mode,jsx:'react-jsx',lib:['ES2022','DOM'],types:[]},files:['consumer.tsx']}));
   run('node',[require('./platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
  }
  for(const file of ['browser-entry.mjs','checks.mjs'])fs.copyFileSync(path.join(__dirname,'radix-dropdown-menu-conformance',file),path.join(cwd,file));
  // Resolve ordinary upstream imports through the installed archive alias. No
  // repository resolver or runtime substitution participates in this build.
  fs.writeFileSync(path.join(cwd,'build.cjs'),`(async()=>{const r=await Bun.build({entrypoints:['./browser-entry.mjs'],target:'browser',format:'esm',define:{'process.env.NODE_ENV':'"production"'}});if(!r.success)throw Error(r.logs.join('\\n'));await Bun.write('vpm.mjs',r.outputs[0]);})().catch(e=>{console.error(e);process.exitCode=1;});`);
  run('bun',['build.cjs'],cwd);console.log(manager,react,run('node',[path.join(__dirname,'radix-dropdown-menu-conformance/browser.cjs'),cwd,'vpm'],cwd).trim());
  if(published){
   const lock=path.join(cwd,manager==='npm'?'package-lock.json':'bun.lock'),before=fs.readFileSync(lock);
   for(const item of manifest.packages)assert(before.toString().includes(item.url),'Missing URL in lock: '+item.name);
   run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--frozen-lockfile','--ignore-scripts'],cwd);assert.deepEqual(fs.readFileSync(lock),before);
   for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  }
 }
 console.log((published?'Public archives, fresh/frozen installs and unchanged transitive caller identity':'Local npm archive install / exact extracted Bun archives')+': all 35 packages, Node/Bun identity/SSR, TS7 and native Chrome interactions verified.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
