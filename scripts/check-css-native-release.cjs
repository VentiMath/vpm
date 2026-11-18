'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto'),{createRequire}=require('node:module');
const directory=path.resolve(process.argv[2]),published=process.argv.includes('--published'),fixture=path.join(__dirname,'css-native-conformance');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'release-manifest.json'))),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-css-native-release-'));
const hash=x=>createHash('sha256').update(x).digest('hex');
function run(cmd,args,cwd=temp,env={}){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:8e6,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache'),...env}});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
(async()=>{try{
 const names=['vcamelize','vcss-color-keywords','vpostcss-value-parser','vcss-to-react-native'];assert.deepEqual(manifest.packages.map(p=>p.name).sort(),names.toSorted());
 const top=manifest.packages.find(p=>p.name==='vcss-to-react-native');
 assert.deepEqual(top.dependencies,Object.fromEntries(manifest.packages.filter(p=>p!==top).map(p=>[p.name,p.url])));
 for(const p of manifest.packages.filter(p=>p!==top))assert.deepEqual(p.dependencies,{});
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,'consumer-package.json'))),{dependencies:{'css-to-react-native':top.url}});
 for(const line of fs.readFileSync(path.join(directory,'SHA256SUMS'),'utf8').trim().split('\n')){const [digest,file]=line.split('  ');assert.equal(hash(fs.readFileSync(path.join(directory,file))),digest);}
 if(published)for(const file of [...manifest.packages.map(p=>p.asset),'release-manifest.json','consumer-package.json','SHA256SUMS']){
  const r=await fetch(`https://github.com/VentiMath/vpm/releases/download/${manifest.tag}/${file}`);assert(r.ok,file+': '+r.status);assert.deepEqual(Buffer.from(await r.arrayBuffer()),fs.readFileSync(path.join(directory,file)));
 }
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);
  const topLocation=published?top.url:'file:'+path.join(directory,top.asset);
  const direct=published||manager==='npm';
  fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{'styled-components':'6.1.17',react:'19.3.1','react-dom':'19.3.1',...(direct?{'css-to-react-native':topLocation}:{})},...(direct?{overrides:{'css-to-react-native':'$css-to-react-native',...(!published?Object.fromEntries(manifest.packages.filter(p=>p!==top).map(p=>[p.name,'file:'+path.join(directory,p.asset)])):{})}}:{})}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  // Bun cannot resolve future GitHub asset URLs using local overrides. The
  // prepublication Bun check extracts the exact bytes; published installs must
  // resolve the real URLs, freshly and frozen, without any helper overrides.
  if(!direct)for(const p of manifest.packages){const unpack=path.join(cwd,'unpack-'+p.name);fs.mkdirSync(unpack);run('tar',['-xzf',path.join(directory,p.asset),'-C',unpack]);const target=path.join(cwd,'node_modules',p===top?'css-to-react-native':p.name);fs.rmSync(target,{recursive:true,force:true});fs.renameSync(path.join(unpack,'package'),target);}
  const peer=createRequire(path.join(cwd,'package.json')),entry=path.dirname(peer.resolve('css-to-react-native/package.json')),child=createRequire(path.join(entry,'package.json'));
  const locations=Object.fromEntries(manifest.packages.map(p=>[p.name,p===top?entry:path.dirname(child.resolve(p.name+'/package.json'))]));
  function verify(){for(const p of manifest.packages){const dir=locations[p.name],meta=JSON.parse(fs.readFileSync(path.join(dir,'package.json')));assert.equal(meta.name,p.name);assert.equal(meta.version,p.version);assert.deepEqual(meta.dependencies||{},p.dependencies);for(const [file,digest]of Object.entries(p.sourceFiles))assert.equal(hash(fs.readFileSync(path.join(dir,file))),digest,p.name+'/'+file);}}
  verify();
  if(direct){const lock=path.join(cwd,manager==='npm'?'package-lock.json':'bun.lock'),before=fs.readFileSync(lock);run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--frozen-lockfile','--ignore-scripts'],cwd);assert.deepEqual(fs.readFileSync(lock),before);verify();}
  // Ensure the unchanged parent actually resolves this archive, including if
  // a package manager were to put a second copy below styled-components.
  const parent=createRequire(peer.resolve('styled-components/native'));assert.equal(path.dirname(parent.resolve('css-to-react-native/package.json')),entry);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import convert,{transformRawValue} from 'css-to-react-native';const require=createRequire(import.meta.url);assert.equal(convert,require('css-to-react-native').default);assert.equal(convert([['border','1px solid cyan']]).borderColor,'cyan');assert.equal(transformRawValue,require('css-to-react-native').transformRawValue);assert.equal(transformRawValue('width','2px'),2);assert.equal(convert([['background','color(display-p3 1 0 .5)']]).backgroundColor,'color(display-p3 1 0 .5)');`);
  for(const runtime of ['node','bun']){
   run(runtime,['consumer.mjs'],cwd);
   for(const script of ['parser','converter','differential'])console.log(run(runtime,[path.join(fixture,script+'.cjs')],cwd,{VPARSER_ENTRY:locations['vpostcss-value-parser'],VCSS_NATIVE_ENTRY:entry}).trim());
   console.log(run(runtime,[path.join(fixture,'caller.cjs'),cwd],cwd).trim());
   for(const [pkg,test]of [['vpostcss-value-parser','parser'],['vcss-to-react-native','converter']])run(runtime,[runtime==='node'?'--test':'test',path.resolve(__dirname,'../packages',pkg,'test',test+'.test.cjs')],cwd,{VPARSER_ENTRY:locations['vpostcss-value-parser'],VCSS_NATIVE_ENTRY:entry});
  }
  for(const ext of ['cts','mts'])fs.writeFileSync(path.join(cwd,'consumer.'+ext),fs.readFileSync(path.join(fixture,'consumer.'+ext),'utf8').replaceAll('vcss-to-react-native','css-to-react-native'));
  run('node',[path.join(fixture,'types.cjs'),cwd]);
  console.log(manager+': archive hashes, original-name parent resolution, Node/Bun and strict types pass'+(direct?'; fresh/frozen install verified':''));
 }
 console.log(published?'Published CSS converter and all helpers verified.':'Prepublication CSS closure verified (npm install, exact Bun extraction).');
}finally{fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
