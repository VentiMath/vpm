'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),directory=path.resolve(process.argv[2]||'.'),published=process.argv.includes('--published'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-motion-release-check-'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const run=(bin,args,cwd=tmp,env={})=>{try{return execFileSync(bin,args,{cwd,encoding:'utf8',timeout:240000,maxBuffer:4e6,env:{...process.env,npm_config_cache:tmp+'/npm-cache',BUN_INSTALL_CACHE_DIR:tmp+'/bun-cache',...env}});}catch(e){if(e.stdout)process.stderr.write(e.stdout);throw e;}};
(async()=>{try{
 const manifest=JSON.parse(fs.readFileSync(directory+'/release-manifest.json')),names=['vmotion','vmotion-dom','vmotion-utils'];
 assert.deepEqual(manifest.packages.map(p=>p.name).sort(),names);assert.match(manifest.tag,/^motion-14\.7\.0(?:-r\d+|-ci)?$/);
 const top=manifest.packages.find(p=>p.name==='vmotion'),consumer={dependencies:{motion:top.url}};
 assert.deepEqual(JSON.parse(fs.readFileSync(directory+'/consumer-package.json')),consumer);
 for(const p of manifest.packages){assert.equal(p.url,`https://github.com/VentiMath/vpm/releases/download/${manifest.tag}/${p.asset}`);assert.equal(hash(fs.readFileSync(directory+'/'+p.asset)),p.sha256);
  for(const [name,url]of Object.entries(p.dependencies))assert.equal(url,manifest.packages.find(p=>p.name===name)?.url);
  const dest=tmp+'/'+p.name;fs.mkdirSync(dest);run('tar',['-xzf',directory+'/'+p.asset,'-C',dest]);
  for(const [file,digest]of Object.entries(p.sourceFiles))assert.equal(hash(fs.readFileSync(dest+'/package/'+file)),digest);
 }
 for(const line of fs.readFileSync(directory+'/SHA256SUMS','utf8').trim().split('\n')){const [digest,file]=line.split('  ');assert.equal(path.basename(file),file);assert.equal(hash(fs.readFileSync(directory+'/'+file)),digest);}
 if(published)for(const file of [...manifest.packages.map(p=>p.asset),'consumer-package.json','release-manifest.json','SHA256SUMS']){
  const res=await fetch(`https://github.com/VentiMath/vpm/releases/download/${manifest.tag}/${file}`);assert(res.ok,file+': '+res.status);assert.deepEqual(Buffer.from(await res.arrayBuffer()),fs.readFileSync(directory+'/'+file));
 }
 for(const manager of ['npm','bun']){
  const cwd=tmp+'/'+manager;fs.mkdirSync(cwd);const extracted=!published&&manager==='bun';
  const transitionURL='https://github.com/VentiMath/vpm/releases/download/react-transition-group-4.4.5/vreact-transition-group-4.4.5.tgz';
  const dependencies={'react-transition-group':transitionURL,react:'19.3.1','react-dom':'19.3.1','@types/react':'19.3.0','@types/react-dom':'19.3.0','@types/react-transition-group':'4.4.12',csstype:'3.1.3','@mui/material':'7.2.0','@emotion/react':'11.14.0','@emotion/styled':'11.14.0'};
  if(!extracted)dependencies.motion=published?top.url:'file:'+directory+'/'+top.asset;
  const overrides={'react-transition-group':transitionURL,...(!published&&!extracted?Object.fromEntries(manifest.packages.filter(p=>p.name!=='vmotion').map(p=>[p.name,'file:'+directory+'/'+p.asset])):{})};
  fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies,overrides}));
  run(manager,['install','--ignore-scripts'],cwd);run(manager,manager==='npm'?['ci','--ignore-scripts']:['install','--frozen-lockfile','--ignore-scripts'],cwd);
  if(extracted)for(const p of manifest.packages)fs.cpSync(tmp+'/'+p.name+'/package',cwd+'/node_modules/'+(p.name==='vmotion'?'motion':p.name),{recursive:true});
  for(const p of manifest.packages){const installed=cwd+'/node_modules/'+(p.name==='vmotion'?'motion':p.name);for(const [file,digest]of Object.entries(p.sourceFiles))assert.equal(hash(fs.readFileSync(installed+'/'+file)),digest);assert.deepEqual(JSON.parse(fs.readFileSync(installed+'/package.json')).dependencies||{},p.dependencies);}
  const check=fs.readFileSync(__dirname+'/motion-react-conformance/archive-check.mjs','utf8').replaceAll("'vmotion'","'motion'").replaceAll("'vmotion/react'","'motion/react'").replace("['framer-motion','motion','motion-dom','@mui/material']","['framer-motion','motion-dom','motion-utils']");fs.writeFileSync(cwd+'/check.mjs',check);
  for(const runtime of ['node','bun']){process.stdout.write(run(runtime,['check.mjs'],cwd));process.stdout.write(run(runtime,[__dirname+'/motion-react-conformance/jsdom.cjs'],root,{VPM_MOTION_RELEASE_INSTALL:cwd}));}
  for(const ext of ['cts','mts'])fs.writeFileSync(cwd+'/consumer.'+ext,fs.readFileSync(__dirname+'/motion-react-conformance/consumer.'+ext,'utf8').replaceAll("'vmotion/react'","'motion/react'").replaceAll("'vmui-material'","'@mui/material'"));
  process.stdout.write(run('node',[__dirname+'/motion-react-conformance/types.cjs',cwd],cwd));
  if(manager==='npm')process.stdout.write(run('node',[__dirname+'/motion-react-conformance/browser.cjs'],root,{VPM_MOTION_RELEASE_INSTALL:cwd,VPM_MOTION_MATERIAL:'app'}));
 }
 console.log((published?'Published':'Local')+' Motion closure verified: exact bytes, root-only URL installation, frozen npm/Bun locks, Node/Bun SSR, TS7 and app Material 7 Chrome scenarios.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
