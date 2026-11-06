'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const directory=path.resolve(process.argv[2]||'.'),published=process.argv.includes('--published');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'release-manifest.json')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-vlx-release-check-'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const equation=String.raw`See \eqref{area}. \begin{equation}A=\pi r^2\label{area}\end{equation}`;
function run(cmd,args,cwd=temp,extra={}){
 const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:4e6,env:{...process.env,BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),npm_config_cache:path.join(temp,'npm-cache'),...extra}});
 assert.ifError(r.error);assert.equal(r.status,0,(r.stdout+r.stderr).slice(-12000));return r.stdout;
}
try{
 assert.deepEqual(manifest.packages.map(p=>p.name).sort(),['vlx','vpngjs']);
 const top=manifest.packages.find(p=>p.name==='vlx'),png=manifest.packages.find(p=>p.name==='vpngjs');
 assert.equal(top.dependencies.vpngjs,png.url);
 for(const line of fs.readFileSync(path.join(directory,'SHA256SUMS'),'utf8').trim().split('\n')){
  const [digest,file]=line.split('  ');assert.equal(path.basename(file),file);assert.equal(hash(fs.readFileSync(path.join(directory,file))),digest,file);
 }
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);
  const dependencies=published?{vlx:top.url}:manager==='npm'?{vlx:'file:'+path.join(directory,top.asset)}:{};
  Object.assign(dependencies,{react:'19.1.0','react-dom':'19.1.0','@types/react':'19.2.14'});
  fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies,...(!published&&manager==='npm'?{overrides:{vpngjs:'file:'+path.join(directory,png.asset)}}:{})}));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  // Bun cannot redirect a release URL before publication. Its local check uses
  // unmodified extracted archives; the published check performs real installs.
  if(!published&&manager==='bun')for(const item of manifest.packages){
   const unpack=path.join(cwd,'unpack-'+item.name),target=path.join(cwd,'node_modules',item.name);fs.mkdirSync(unpack);run('tar',['-xzf',path.join(directory,item.asset),'-C',unpack],cwd);fs.mkdirSync(path.dirname(target),{recursive:true});fs.renameSync(path.join(unpack,'package'),target);
  }
  for(const item of manifest.packages){
   assert.equal(hash(fs.readFileSync(path.join(directory,item.asset))),item.sha256);
   const dir=path.join(cwd,'node_modules',item.name),metadata=fs.readFileSync(path.join(dir,'package.json')),p=JSON.parse(metadata);
   assert.equal(hash(metadata),item.packageJsonSHA256);assert.equal(p.name,item.name);assert.equal(p.version,item.version);assert.deepEqual(p.dependencies||{},item.dependencies);
   for(const [file,digest]of Object.entries(item.sourceFiles))assert.equal(hash(fs.readFileSync(path.join(dir,file))),digest,item.name+'/'+file);
   for(const url of Object.values(p.dependencies||{}))assert(url.startsWith('https://github.com/VentiMath/vpm/releases/download/'+manifest.tag+'/'));
  }
  for(const name of ['katex','mathjax-full','@mathjax','@resvg/resvg-js'])assert(!fs.existsSync(path.join(cwd,'node_modules',name)),'Unexpected browser dependency '+name);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createRenderer,renderMath,renderDocument} from 'vlx';import {observeMath} from 'vlx/dom';import {renderProblemSvg} from 'vlx/problem';const require=createRequire(import.meta.url);assert.equal(require('vlx').renderMath,renderMath);assert.equal(require('vlx').renderDocument,renderDocument);const document=renderDocument(${JSON.stringify(equation)},{idPrefix:'release'});assert.equal(document.equations[0].number,1);assert.equal(document.references[0].id,document.equations[0].id);assert.equal(document.references[0].display,'(1)');assert.match(document.html,/<a /);assert.equal(require('vlx/dom').observeMath,observeMath);assert.match(createRenderer().renderText('Find $x^2$.').html,/<math/);assert.match(renderProblemSvg({statement:'Find $x$.'}).svg,/<svg/);`);
  for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.ts'),`import {createRenderer,renderMath,renderDocument} from 'vlx';import {observeMath} from 'vlx/dom';const documentResult=renderDocument('text',{numbering:'ams',startNumber:1});const next:number=documentResult.nextNumber;const svg:string=renderMath('x').svg;const host=document.createElement('div');host.innerHTML=createRenderer().renderText('Find $x$.').html;const stop:()=>void=observeMath(host);stop();`);
  for(const mode of ['NodeNext','Bundler']){
   fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:mode==='Bundler'?'ESNext':mode,moduleResolution:mode,lib:['ES2022','DOM'],types:[]},files:['consumer.ts']}));
   run('node',[require('./platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);
  }
  fs.writeFileSync(path.join(cwd,'browser.js'),"import {createRenderer} from 'vlx';import {observeMath} from 'vlx/dom';window.vlx={renderer:createRenderer(),observeMath};");
  run('bun',['build','browser.js','--target=browser','--minify','--metafile=meta.json','--outfile=bundle.js'],cwd);
  const inputs=Object.keys(JSON.parse(fs.readFileSync(path.join(cwd,'meta.json'))).inputs);
  assert(inputs.some(p=>p.includes('vlx/index.')));assert(inputs.some(p=>p.includes('vlx/dom.')));
  assert(!inputs.some(p=>/vpngjs|resvg|katex|mathjax|vlx\/(?:problem|png)\./.test(p)),'Browser bundle must exclude Node image paths and upstream engines');
  if(manager==='bun')console.log(run('node',[path.join(__dirname,'vlx-conformance/browser.cjs')],cwd,{VPM_VLX_PACKAGE_DIR:path.join(cwd,'node_modules/vlx')}).trim());
  require('./vlx-conformance/react-consumer.cjs')(cwd,run);
  if(manager==='bun')console.log(run('node',[path.join(__dirname,'vlx-conformance/react-browser.cjs'),cwd],cwd).trim());
  if(published){
   const file=path.join(cwd,manager==='bun'?'bun.lock':'package-lock.json'),before=fs.readFileSync(file);
   for(const item of manifest.packages)assert(before.toString().includes(item.url));
   run(manager,manager==='bun'?['install','--frozen-lockfile','--ignore-scripts']:['ci','--ignore-scripts','--no-audit','--no-fund'],cwd);assert.deepEqual(fs.readFileSync(file),before);
  }
 }
 console.log((published?'Public VLX URL, no overrides':'Local npm install / Bun extracted release archives')+': exact hashes, Node/Bun CJS/ESM, TS7 browser types, browser-only bundle, Chrome accessibility and clean dependency closure pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
