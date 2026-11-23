'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.argv[2]||'.'),published=process.argv.includes('--published');
const installOnly=process.argv.includes('--install-only');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'release-manifest.json')));
const family=Object.keys(require('./pack-app-release.cjs').configs).find(name=>manifest.tag.startsWith(name+'-'));
assert.ok(family,'Unknown release');
const config=require('./pack-app-release.cjs').configs[family],fixture=path.join(__dirname,config.fixture+'-conformance');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-app-release-'));
const run=(bin,args,cwd,env={})=>execFileSync(bin,args,{cwd,env:{...process.env,npm_config_cache:scratch+'/npm-cache',BUN_INSTALL_CACHE_DIR:scratch+'/bun-cache',...env},encoding:'utf8',timeout:family==='vmui-material'?3600000:300000,maxBuffer:8e6});
async function main(){
 assert.deepEqual(manifest.packages.map(p=>p.name),config.names);
 const consumer=JSON.parse(fs.readFileSync(path.join(directory,'consumer-package.json')));
 assert.deepEqual(consumer,{dependencies:Object.fromEntries(config.direct.map(n=>[n,manifest.packages.find(p=>p.name===n).url]))});
 const files=[...manifest.packages.map(p=>p.asset),'consumer-package.json','release-manifest.json'];
 if(family==='vmui-material')files.push('vite-aliases.json','tsconfig-paths.json');
 const sums=new Map(fs.readFileSync(path.join(directory,'SHA256SUMS'),'utf8').trim().split('\n').map(line=>{const [sum,name]=line.split('  ');return[name,sum]}));
 assert.deepEqual([...sums.keys()].sort(),files.toSorted());
 for(const name of files)assert.equal(sha(fs.readFileSync(path.join(directory,name))),sums.get(name),name);
 const base='https://github.com/VentiMath/vpm/releases/download/'+manifest.tag;
 for(const item of manifest.packages){
  assert.equal(item.url,base+'/'+item.asset);assert.equal(item.sha256,sums.get(item.asset));
  for(const [dep,url] of Object.entries(item.dependencies))assert.equal(url,manifest.packages.find(p=>p.name===dep)?.url,'Missing pinned dependency: '+dep);
 }
 if(published)for(const name of [...files,'SHA256SUMS']){const r=await fetch(base+'/'+name);assert.ok(r.ok,name+': '+r.status);assert.deepEqual(Buffer.from(await r.arrayBuffer()),fs.readFileSync(path.join(directory,name)),name);}
 for(const manager of ['npm','bun']){
  const dir=path.join(scratch,manager);fs.mkdirSync(dir);
  const local=Object.fromEntries(manifest.packages.map(p=>[p.name,'file:'+path.join(directory,p.asset)]));
  const stagedBun=manager==='bun'&&!published;
  const dependencies={...(stagedBun?{}:published?consumer.dependencies:local),react:'19.3.1','react-dom':'19.3.1','@types/react':'19.3.0','@types/react-dom':'19.3.0'};
  fs.writeFileSync(dir+'/package.json',JSON.stringify({private:true,type:'module',dependencies,...(!published&&!stagedBun?{overrides:local}:{})}));
  run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts'],dir);
  run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts','--frozen-lockfile'],dir);
  const modules=dir+'/node_modules';
  if(stagedBun)for(const item of manifest.packages){const target=modules+'/'+item.name;fs.mkdirSync(target,{recursive:true});run('tar',['-xzf',path.join(directory,item.asset),'-C',target,'--strip-components=1'],dir);}
  if(stagedBun)console.log('Before publication: Bun frozen peer install plus exact closure extraction; public URL resolution is checked after publication.');
  for(const item of manifest.packages){
   const pkg=modules+'/'+item.name;const metadata=JSON.parse(fs.readFileSync(pkg+'/package.json'));
   assert.equal(metadata.name,item.name);assert.equal(metadata.version,item.version);
   assert.equal(sha(fs.readFileSync(pkg+'/package.json')),item.packageJsonSHA256);
   for(const [file,hash] of Object.entries(item.sourceFiles))assert.equal(sha(fs.readFileSync(pkg+'/'+file)),hash,item.name+'/'+file);
  }
  // Every exported JS subpath must resolve through the installed package.
  const specifiers=[];
  const runtimeTarget=value=>typeof value==='string'?/\.(?:cjs|mjs|js)$/.test(value):value&&Object.entries(value).some(([condition,target])=>condition!=='types'&&runtimeTarget(target));
  for(const item of manifest.packages){const p=JSON.parse(fs.readFileSync(modules+'/'+item.name+'/package.json'));for(const [key,target] of Object.entries(p.exports||{'.':p.main}))if(key!== './package.json'&&!key.includes('*')&&runtimeTarget(target))specifiers.push(item.name+(key==='.'?'':key.slice(1)));}
  fs.writeFileSync(dir+'/entries.mjs',`import {createRequire} from 'node:module';const require=createRequire(import.meta.url);for(const s of ${JSON.stringify(specifiers)}){await import(s);require(s);}console.log('Installed ESM/CJS entries: ${specifiers.length}');`);
  for(const runtime of ['node','bun'])process.stdout.write(run(runtime,['entries.mjs'],dir));
  for(const ext of ['mts','cts']){
   let text=fs.readFileSync(fixture+'/consumer.'+ext,'utf8');
   if(family==='vdate-fns')text=text.replace(/^import \{ AdapterDateFns \}.*\n/m,'').replace(/^new AdapterDateFns.*\n/m,'');
   fs.writeFileSync(dir+'/consumer.'+ext,text);
  }
  if(family==='vmui-material'){
   const env={VPM_MATERIAL_INSTALL:dir,VPM_RELEASE_MANIFEST:path.join(directory,'release-manifest.json')};
   fs.copyFileSync(fixture+'/archive-check.mjs',dir+'/material-check.mjs');
   for(const runtime of ['node','bun'])process.stdout.write(run(runtime,['material-check.mjs'],dir,env));
   process.stdout.write(run('node',[fixture+'/types.cjs',dir],dir,env));
   // Runtime and type mappings are explicit third-party resolver configuration;
   // package identities and direct dependencies remain VPM names.
   const aliases=JSON.parse(fs.readFileSync(directory+'/vite-aliases.json'));
   const paths=JSON.parse(fs.readFileSync(directory+'/tsconfig-paths.json'));
   assert.deepEqual(Object.values(aliases).sort(),config.names.toSorted());
   for(const targets of Object.values(paths))for(const target of targets)assert.ok(fs.existsSync(path.resolve(dir,target)),target);
   const identity=`import {createRequire} from 'node:module';import assert from 'node:assert/strict';const r=createRequire(import.meta.url);for(const name of ${JSON.stringify(config.names)}){const inner=createRequire(r.resolve(name+'/package.json'));for(const dependency of Object.keys(inner(name+'/package.json').dependencies||{}))assert.equal(inner.resolve(dependency),r.resolve(dependency),name+' shares '+dependency);}console.log('All 22 packages share root dependency instances');`;
   fs.writeFileSync(dir+'/identity.mjs',identity);
   for(const runtime of ['node','bun'])process.stdout.write(run(runtime,['identity.mjs'],dir));
   if(!published&&!installOnly&&manager==='npm')process.stdout.write(run('node',[fixture+'/release-checks.cjs'],dir,env));
   if(installOnly)console.log('Install-only pass: component/browser suites are not repeated in this invocation.');
   console.log(manager+': Material archive bytes, entries, dependency identity, strict types and SSR pass.');
   continue;
  }
  const {compile,clean}=require('./platform-types.cjs');
  for(const bundler of [false,true])clean(compile({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,target:'ES2022',lib:['ES2022','DOM','DOM.Iterable','ES2022.Intl'],module:bundler?'ESNext':'NodeNext',moduleResolution:bundler?'Bundler':'NodeNext',types:[],typeRoots:[modules+'/@types']},files:[dir+'/consumer.mts',...(!bundler?[dir+'/consumer.cts']:[])]}));
  const env={VPM_RELEASE_NODE_MODULES:modules,VNOTISTACK_ENTRY:modules+'/vnotistack/index.cjs',VNOTISTACK_DIR:modules+'/vnotistack',VFORM_ENTRY:modules+'/vreact-hook-form/index.cjs',VZOD_ENTRY:modules+'/vzod/index.cjs',VRESOLVERS_ZOD:modules+'/vhookform-resolvers/zod.cjs'};
  const checks=family==='vnotistack'?['notistack-conformance/run.cjs']:family==='vreact-i18next'?['i18next-conformance/run.cjs','react-i18next-conformance/run.cjs']:family==='vreact-hook-form'?['zod-conformance/run.cjs','resolvers-conformance/run.cjs','zod-conformance/forms.cjs']:['date-fns-conformance/run.cjs','date-fns-conformance/adapter.cjs'];
  for(const runtime of ['node','bun'])for(const script of checks)process.stdout.write(run(runtime,[path.join(__dirname,script)],dir,env));
  if(manager==='npm'){
   const browser=family==='vreact-hook-form'?'hook-form':config.fixture;
   process.stdout.write(run('node',[path.join(__dirname,browser+'-conformance/browser.cjs')],dir,env));
  }
  console.log(manager+': '+(stagedBun?'frozen peers and exact staged closure':'fresh/frozen VPM-name installs')+', exact bytes, public entries, TS7, Node/Bun caller checks pass.');
 }
 console.log(manifest.tag+': '+(published?'public URLs and SHA256 verified':'exact local archives verified'));
}
main().catch(e=>{console.error(e.stdout?.toString()||'',e.stderr?.toString()||'',e);process.exitCode=1}).finally(()=>fs.rmSync(scratch,{recursive:true,force:true}));
