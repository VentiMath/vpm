'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function run(cmd,args,cwd,timeout=180000){const r=spawnSync(cmd,args,{cwd,timeout,encoding:'utf8',maxBuffer:4e6});assert.ifError(r.error);assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
async function worker(cwd,out){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-react-bench-chrome-'));
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
 let server,child,socket,sequence=0;const pending=new Map();
 try{
  server=http.createServer((req,res)=>{
   if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><title>VLX measurement</title><div id="root"></div><script type="module" src="/entry.js"></script>');return;}
   const file=path.join(cwd,'dist',path.basename(req.url));if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(file));
  });
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
  let port;({child,port}=await require('./launch-chrome.cjs')(chrome,profile));
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  socket=new WebSocket(tabs.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
  socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),120000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
  await evaluate('(async()=>{for(let i=0;i<300;i++){if(window.ready)return true;await new Promise(r=>setTimeout(r,20));}throw Error("Fixture did not load")})()');
  const rows=await evaluate('window.runBench()'),browser=await send('Browser.getVersion');
  fs.writeFileSync(out,JSON.stringify({pid:child.pid,browser,rows}));
 }finally{
  for(const p of pending.values())clearTimeout(p.timer);socket?.close();
  if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
  await new Promise(r=>server?server.close(r):r());fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
}
function coordinator(archive){
 const root=path.resolve(__dirname,'../../packages/vlx'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-browser-benchmark-'));
 try{
  run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],root);
  for(const variant of ['baseline','candidate']){
   const dir=path.join(temp,variant);fs.mkdirSync(dir);run('tar',['-xzf',variant==='baseline'?archive:path.join(temp,'vlx-0.1.0.tgz'),'-C',dir]);
   fs.mkdirSync(path.join(dir,'node_modules'));fs.symlinkSync(path.join(dir,'package'),path.join(dir,'node_modules/vlx'),'dir');
   for(const name of ['react','react-dom','scheduler'])fs.symlinkSync(path.join(__dirname,'node_modules',name),path.join(dir,'node_modules',name),'dir');
   fs.copyFileSync(path.join(__dirname,'bench-browser-entry.mjs'),path.join(dir,'entry.js'));
   run('bun',['build','entry.js','--target=browser','--minify','--splitting','--define','process.env.NODE_ENV="production"','--outdir=dist'],dir);
  }
  const hashes=Object.fromEntries([...fs.readdirSync(root).filter(n=>/\.(cjs|mjs)$/.test(n)),...['bench-browser.cjs','bench-browser-entry.mjs','package-lock.json'].map(n=>'../../scripts/vlx-conformance/'+n),'font/glyphs.json'].map(n=>[n,hash(fs.readFileSync(path.resolve(root,n)))]));
  const runs=[];
  for(const control of [false,true])for(let pair=0;pair<(control?2:4);pair++){
   const first=pair%2?'vpm':'upstream',order=first==='upstream'?['upstream','vpm']:['vpm','upstream'],record={control,pair,first};
   for(const side of order){const variant=control||side==='upstream'?'baseline':'candidate',file=path.join(temp,'result.json');run(process.execPath,[__filename,'--worker',path.join(temp,variant),file],__dirname);record[side]=JSON.parse(fs.readFileSync(file));}
   runs.push(record);console.log('Chrome pair '+(runs.length)+'/6 complete');
  }
  const median=values=>{const s=values.toSorted((a,b)=>a-b);return (s[(s.length-1)>>1]+s[s.length>>1])/2;};
  const rows=runs[0].upstream.rows.map((row,i)=>{
   const result={case:row.case,processes:[],controls:[]};
   for(const r of runs){const a=r.upstream.rows[i],b=r.vpm.rows[i];assert.equal(a.case,b.case);assert.equal(a.iterations,b.iterations);assert.equal(a.samples.length,12);assert.equal(b.samples.length,12);assert([...a.samples,...b.samples].every(x=>Number.isFinite(x)&&x>0));result[r.control?'controls':'processes'].push({first:r.first,upstreamNs:median(a.samples)*1e6,vpmNs:median(b.samples)*1e6,changePct:100*(median(b.samples)/median(a.samples)-1)});}
   return result;
  });
  assert.equal(new Set(runs.flatMap(r=>[r.upstream.pid,r.vpm.pid])).size,12);
  for(const [file,digest]of Object.entries(hashes))assert.equal(hash(fs.readFileSync(path.resolve(root,file))),digest,'Source changed during measurement');
  const report={recordedAt:new Date().toISOString(),baselineArchiveSHA256:hash(fs.readFileSync(archive)),candidateArchiveSHA256:hash(fs.readFileSync(path.join(temp,'vlx-0.1.0.tgz'))),hashes,runs,rows,summary:rows.map(require('../bench-process.cjs').describe),methodology:'Four balanced comparison pairs and two identical-baseline control pairs, one implementation per fresh Chrome process. React production build; preloaded modules; 150ms warmup per case; 12 untrimmed samples; fixed identical iteration counts. Includes synchronous React/DOM and forced layout, excludes network/module startup and paint. No application latency claim.'};
  if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(report,null,2)+'\n');console.table(report.summary);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[2]==='--worker')worker(process.argv[3],process.argv[4]).catch(error=>{console.error(error);process.exitCode=1;});
else coordinator(path.resolve(process.argv[2]));
