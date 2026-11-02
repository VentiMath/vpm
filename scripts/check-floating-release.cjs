'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const args=process.argv.slice(2),directory=path.resolve(args[0]||'.'),published=args.includes('--published');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'release-manifest.json')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-floating-install-'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function run(command,argv){const result=spawnSync(command,argv,{cwd:temp,encoding:'utf8',timeout:180000,maxBuffer:4e6,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'cache'),VPM_FLOATING_RELEASE_MODULES:path.join(temp,'node_modules')}});assert.equal(result.status,0,(result.stdout+result.stderr).slice(-9000));return result.stdout}
try{
 assert.equal(manifest.packages.length,6);
 const top=manifest.packages.find(p=>p.name==='vfloating-ui-react');assert(top);
 const dependencies={react:'19.1.0','react-dom':'19.1.0'};
 if(published)dependencies[top.name]=top.url;
 const app={private:true,type:'module',dependencies,devDependencies:{'@types/react':'19.2.10','@types/react-dom':'19.2.3'}};
 fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify(app,null,2));
 run('bun',['install','--ignore-scripts']);
 // Before URLs exist, test exact extracted bytes; after publication the root
 // URL alone must resolve the complete graph, with a fresh cache and no overrides.
 if(!published)for(const item of manifest.packages){const unpack=path.join(temp,'unpack-'+item.name);fs.mkdirSync(unpack);run('tar',['-xzf',path.join(directory,item.asset),'-C',unpack]);fs.renameSync(path.join(unpack,'package'),path.join(temp,'node_modules',item.name))}
 const lock=fs.readFileSync(path.join(temp,'bun.lock'),'utf8');
 for(const item of manifest.packages){
  assert.equal(hash(fs.readFileSync(path.join(directory,item.asset))),item.sha256,item.name);
  const installed=path.join(temp,'node_modules',item.name),metadata=JSON.parse(fs.readFileSync(path.join(installed,'package.json')));
  assert.equal(metadata.version,item.version);assert.deepEqual(metadata.dependencies||{},item.dependencies);
  for(const [file,digest]of Object.entries(item.sourceFiles))assert.equal(hash(fs.readFileSync(path.join(installed,file))),digest,item.name+'/'+file);
  for(const dependency of Object.values(metadata.dependencies||{}))assert(dependency.startsWith('https://github.com/VentiMath/vpm/releases/download/'+manifest.tag+'/'));
  if(published)assert(lock.includes(item.url),'Lockfile must pin '+item.name);
 }
 fs.writeFileSync(path.join(temp,'consumer.cjs'),`const assert=require('node:assert/strict'),React=require('react'),{renderToString}=require('react-dom/server'),api=require('vfloating-ui-react');function App(){const f=api.useFloating({middleware:[api.offset(4),api.flip(),api.shift()]});const p=api.useInteractions([api.useClick(f.context),api.useDismiss(f.context),api.useRole(f.context)]);return React.createElement('button',{...p.getReferenceProps(),style:f.floatingStyles},f.placement)}assert.match(renderToString(React.createElement(App)),/bottom/);`);
 fs.writeFileSync(path.join(temp,'consumer.mjs'),`import assert from 'node:assert/strict';import {useFloating} from 'vfloating-ui-react';import {createRequire} from 'node:module';assert.equal(useFloating,createRequire(import.meta.url)('vfloating-ui-react').useFloating);`);
 for(const runtime of ['node','bun'])for(const file of ['consumer.cjs','consumer.mjs'])run(runtime,[file]);
 for(const ext of ['cts','mts'])fs.copyFileSync(path.join(__dirname,'floating-react-conformance/consumer.tsx'),path.join(temp,'consumer.'+ext));
 for(const mode of ['NodeNext','Bundler']){
  fs.writeFileSync(path.join(temp,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:mode==='Bundler'?'ESNext':mode,moduleResolution:mode,jsx:'react-jsx',lib:['ES2022','DOM'],types:[]},files:['consumer.cts','consumer.mts']}));
  run('node',[require('./platform-types.cjs').compiler().path,'-p','tsconfig.json']);
 }
 console.log(run('node',[path.join(__dirname,'floating-react-conformance/browser.cjs')]).trim());
 const before=fs.readFileSync(path.join(temp,'bun.lock'));run('bun',['install','--frozen-lockfile','--ignore-scripts']);assert.deepEqual(fs.readFileSync(path.join(temp,'bun.lock')),before);
 console.log(`${published?'Public root URL resolves all six packages without overrides':'Exact extracted release archives'}: hashes, Node/Bun CJS/ESM/SSR, strict TS7, mounted Chrome interactions and frozen install pass.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
