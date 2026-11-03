'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const directory=path.resolve(process.argv[2]||'.'),published=process.argv.includes('--published'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'release-manifest.json'))),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-query-install-'));
const hash=x=>createHash('sha256').update(x).digest('hex');
function run(cmd,args,cwd=temp){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:180000,maxBuffer:4e6,env:{...process.env,NODE_ENV:'development',BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache'),VPM_QUERY_CONSUMER:cwd}});assert.ifError(r.error);assert.equal(r.status,0,(r.stdout+r.stderr).slice(-10000));return r.stdout;}
try{
 assert.equal(manifest.packages.length,2);const top=manifest.packages.find(p=>p.name==='vtanstack-react-query'),core=manifest.packages.find(p=>p.name==='vtanstack-query-core');assert(top&&core);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);
  const dependencies={react:'19.2.4','react-dom':'19.2.4','@tanstack/react-query':published?top.url:'file:'+path.join(directory,top.asset),'@tanstack/react-query-devtools':'5.91.3',jsdom:'27.4.0','@testing-library/react':'16.3.2','@types/react':'19.2.14','@types/react-dom':'19.2.3'};
  // Before publication only the transitive URL is redirected to its exact local
  // archive. Published installs have no overrides and use a clean cache.
  const pkg={private:true,type:'module',dependencies,...(!published?{overrides:{'vtanstack-query-core':'file:'+path.join(directory,core.asset)}}:{})};fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify(pkg));
  run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund','--cache',path.join(temp,'npm-cache')]:[])],cwd);
  for(const item of manifest.packages){
   assert.equal(hash(fs.readFileSync(path.join(directory,item.asset))),item.sha256);const dir=path.join(cwd,'node_modules',item===top?'@tanstack/react-query':item.name),p=JSON.parse(fs.readFileSync(path.join(dir,'package.json')));assert.equal(p.name,item.name);assert.equal(p.version,item.version);assert.deepEqual(p.dependencies||{},item.dependencies);
   for(const [file,digest]of Object.entries(item.sourceFiles))assert.equal(hash(fs.readFileSync(path.join(dir,file))),digest,item.name+'/'+file);
   for(const url of Object.values(p.dependencies||{}))assert(url.startsWith('https://github.com/VentiMath/vpm/releases/download/'+manifest.tag+'/'));
  }
  assert(!fs.existsSync(path.join(cwd,'node_modules/@tanstack/query-core')),'No upstream core should be installed');
  fs.writeFileSync(path.join(cwd,'identity.cjs'),"const assert=require('node:assert/strict'),api=require('@tanstack/react-query'),core=require('vtanstack-query-core');assert.equal(api.QueryClient,core.QueryClient);import('@tanstack/react-query').then(m=>assert.equal(m.QueryClientContext,api.QueryClientContext));");
  for(const runtime of ['node','bun']){run(runtime,['identity.cjs'],cwd);console.log(run(runtime,[path.join(__dirname,'tanstack-query-conformance/release-consumer.cjs')],cwd).trim());}
  fs.writeFileSync(path.join(cwd,'consumer.tsx'),"import {QueryClient,QueryClientProvider,useQuery,useMutation,useQueryClient} from '@tanstack/react-query';const client=new QueryClient();function Child(){const c=useQueryClient();const q=useQuery({queryKey:['a'],queryFn:async()=>[1,2],select:x=>x.length});const n:number|undefined=q.data;const m=useMutation({mutationFn:async(n:number)=>n+1,onSuccess:()=>c.invalidateQueries({queryKey:['a']})});return <button onClick={()=>m.mutate(1)}>{n}</button>}export const App=()=> <QueryClientProvider client={client}><Child/></QueryClientProvider>;");
  for(const mode of ['NodeNext','Bundler']){fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:mode==='Bundler'?'ESNext':mode,moduleResolution:mode,jsx:'react-jsx',lib:['ES2022','DOM'],types:[]},files:['consumer.tsx']}));run('node',[require('./platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);}
  if(manager==='bun')console.log(run('node',[path.join(__dirname,'tanstack-query-conformance/release-browser.cjs')],cwd).trim());
  if(published){const file=path.join(cwd,manager==='bun'?'bun.lock':'package-lock.json'),before=fs.readFileSync(file);for(const item of manifest.packages)assert(before.toString().includes(item.url));run(manager,manager==='bun'?['install','--frozen-lockfile','--ignore-scripts']:['ci','--ignore-scripts','--no-audit','--no-fund','--cache',path.join(temp,'npm-cache')],cwd);assert.deepEqual(fs.readFileSync(file),before);}
 }
 console.log((published?'Public root URL, no overrides':'Exact local release archives')+': npm/Bun installs, Node/Bun hooks and React Devtools, shared module identity, hashes and TS7 pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
