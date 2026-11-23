'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const dir=path.resolve(process.argv[2]),published=process.argv.includes('--published'),manifest=JSON.parse(fs.readFileSync(dir+'/release-manifest.json'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-resvg-archives-'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const run=(bin,args,cwd)=>execFileSync(bin,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:4e6,env:{...process.env,npm_config_cache:temp+'/npm-cache',BUN_INSTALL_CACHE_DIR:temp+'/bun-cache'}});
(async()=>{try{
 assert.deepEqual(manifest.packages.map(p=>p.name),['vresvg','vpngjs']);
 const [top,png]=manifest.packages;assert.equal(top.dependencies.vpngjs,png.url);
 for(const line of fs.readFileSync(dir+'/SHA256SUMS','utf8').trim().split('\n')){
  const [digest,file]=line.split('  ');assert.equal(path.basename(file),file);assert.equal(hash(fs.readFileSync(dir+'/'+file)),digest);
  if(published){const r=await fetch('https://github.com/VentiMath/vpm/releases/download/'+manifest.tag+'/'+file);assert(r.ok);assert.deepEqual(Buffer.from(await r.arrayBuffer()),fs.readFileSync(dir+'/'+file));}
 }
 for(const manager of ['npm','bun']){
  const cwd=temp+'/'+manager;fs.mkdirSync(cwd);
  fs.writeFileSync(cwd+'/package.json',JSON.stringify({private:true,type:'module',dependencies:published?{'@resvg/resvg-js':top.url}:manager==='npm'?{'@resvg/resvg-js':'file:'+dir+'/'+top.asset}:{},...(!published&&manager==='npm'?{overrides:{vpngjs:'file:'+dir+'/'+png.asset}}:{})}));
  run(manager,manager==='npm'?['install','--ignore-scripts','--no-audit','--no-fund']:['install','--ignore-scripts'],cwd);
  if(!published&&manager==='bun')for(const item of manifest.packages){const unpack=cwd+'/unpack-'+item.name,target=cwd+'/node_modules/'+(item.name==='vresvg'?'@resvg/resvg-js':item.name);fs.mkdirSync(unpack);run('tar',['-xzf',dir+'/'+item.asset,'-C',unpack],cwd);fs.mkdirSync(path.dirname(target),{recursive:true});fs.renameSync(unpack+'/package',target);}
  for(const item of manifest.packages){const base=cwd+'/node_modules/'+(item.name==='vresvg'?'@resvg/resvg-js':item.name);assert.equal(hash(fs.readFileSync(base+'/package.json')),item.packageJsonSHA256);for(const [file,digest]of Object.entries(item.sourceFiles))assert.equal(hash(fs.readFileSync(base+'/'+file)),digest,file);}
  fs.writeFileSync(cwd+'/consumer.mjs',`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {Resvg} from '@resvg/resvg-js';const require=createRequire(import.meta.url);assert.equal(require('@resvg/resvg-js').Resvg,Resvg);const svg=${JSON.stringify(require('./resvg-conformance/fixtures.cjs').paper({lines:4,columns:8}))};const a=new Resvg(svg,{fitTo:{mode:'width',value:1200}}).render();assert.equal(a.width,1200);assert(a.height>0);assert.equal(a.asPng()[0],137);assert.throws(()=>new Resvg('<svg viewBox="0 0 20 20"><text>hidden</text></svg>').render());`);
  for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  for(const ext of ['mts','cts'])fs.writeFileSync(cwd+'/consumer.'+ext,fs.readFileSync(path.resolve(__dirname,'../packages/vresvg/test/types.ts'),'utf8').replaceAll("'vresvg'","'@resvg/resvg-js'"));
  for(const mode of ['NodeNext','Bundler']){fs.writeFileSync(cwd+'/tsconfig.json',JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:mode==='Bundler'?'ESNext':mode,moduleResolution:mode,lib:['ES2022'],types:[]},files:mode==='Bundler'?['consumer.mts']:['consumer.mts','consumer.cts']}));run('node',[require('./platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);}
  if(published){const file=cwd+'/'+(manager==='npm'?'package-lock.json':'bun.lock'),before=fs.readFileSync(file);run(manager,manager==='npm'?['ci','--ignore-scripts','--no-audit','--no-fund']:['install','--frozen-lockfile','--ignore-scripts'],cwd);assert.deepEqual(fs.readFileSync(file),before);}
 }
 console.log((published?'Published URLs':'Local npm install / extracted Bun archives')+': hashes, original import name, CJS/ESM, Node/Bun PNGs and TS7 pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
