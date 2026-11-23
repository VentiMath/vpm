'use strict';
// Read-only route acceptance against the two production snapshots from app-consumer.
// Fresh browser profile; every external request and all HTTP writes are blocked.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const directory=path.resolve(process.argv[2]),profile=fs.mkdtempSync(path.join(os.tmpdir(),'material-app-browser-'));
const report={routes:[],externalRequestsBlocked:true,writesBlocked:true,authenticated:false};
let child,socket,server,id=0;const pending=new Map();
(async()=>{try{
 const chrome=process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 const errors=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error(method+' timeout'))},45000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}))});
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Fetch.requestPaused'){
  const {requestId,request}=m.params,allowed=request.url.startsWith('http://127.0.0.1:')&&request.method==='GET';
  send(allowed?'Fetch.continueRequest':'Fetch.failRequest',allowed?{requestId}:{requestId,errorReason:'BlockedByClient'}).catch(()=>{});
 }const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}};
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 for(const variant of ['baseline','candidate']){
  const build=path.join(directory,variant,'build');
  server=http.createServer((req,res)=>{
   if(req.method!=='GET'||req.url.startsWith('/api/')){res.writeHead(503);res.end();return;}
   const file=path.resolve(build,'.'+decodeURIComponent(req.url.split('?')[0]));
   if(!file.startsWith(build+path.sep)){res.writeHead(404);res.end();return;}
   const actual=fs.existsSync(file)&&fs.statSync(file).isFile()?file:build+'/index.html';
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
   res.setHeader('Content-Type',mime[path.extname(actual)]||'application/octet-stream');res.end(fs.readFileSync(actual));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  for(const route of ['/sign-in','/404']){
   errors.length=0;await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+route});
   await evaluate(`(async()=>{for(let i=0;i<600;i++){if(document.body.innerText.includes(${JSON.stringify(route==='/sign-in'?'Continue without signing in':'404')}))return;await new Promise(r=>setTimeout(r,50))}throw Error('Route did not render: '+document.body.innerText.slice(0,400))})()`);
   await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   // Route copy can be present before Motion's entrance has finished.
   await evaluate('new Promise(r=>setTimeout(r,1200))');
   const snapshot=await evaluate(`({text:document.body.innerText,controls:[...document.querySelectorAll('input,button,a')].filter(n=>n.getBoundingClientRect().width>0).map(n=>({tag:n.tagName,text:(n.textContent||'').trim(),label:n.getAttribute('aria-label'),type:n.type,href:n.getAttribute('href')})),material:document.querySelectorAll('[class*=Mui]').length,width:document.documentElement.scrollWidth})`);
   assert.ok(snapshot.material>0,route+' exercises Material');assert.equal(errors.length,0,JSON.stringify(errors));
   // Keyboard focus must land on and stay on an actual visible control.
   const target=await evaluate(`(()=>{const n=[...document.querySelectorAll('button,a[href],input')].find(n=>n.getBoundingClientRect().width>0&&!n.disabled);n.focus();return n.tagName})()`);
   await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert.equal(await evaluate('document.activeElement.tagName'),target);
   const image=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(directory,variant+route.replace('/','-')+'.png'),Buffer.from(image.data,'base64'));
   report.routes.push({variant,route,...snapshot,uncaughtErrors:errors.length,focusRetained:true});
  }
  await new Promise(r=>{server.close(r);server.closeAllConnections()});server=null;
 }
 for(const route of ['/sign-in','/404']){const a=report.routes.find(r=>r.variant==='baseline'&&r.route===route),b=report.routes.find(r=>r.variant==='candidate'&&r.route===route);assert.equal(b.text,a.text,route+' visible copy');assert.deepEqual(b.controls,a.controls,route+' control semantics');assert.equal(b.width,a.width,route+' page width');}
 fs.writeFileSync(path.join(directory,'browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log('Production app snapshots: sign-in/404 text, control semantics, focus and page width match with requests/writes blocked. Screenshots saved; signed-in routes not exercised.');
}finally{socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}})().catch(e=>{console.error(e);process.exitCode=1});
