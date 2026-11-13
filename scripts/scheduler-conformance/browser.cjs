'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-scheduler-browser-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 require('./build.cjs');
 server=http.createServer((req,res)=>{const match=/^\/(upstream|vpm)\.js$/.exec(req.url);if(match){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'node_modules/.vpm-scheduler',match[1]+'.js')))}else{const kind=req.url.includes('upstream')?'upstream':'vpm';res.setHeader('content-type','text/html');res.end('<!doctype html><html><body><script src="/'+kind+'.js"></script></body></html>')}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
 let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 await send('Runtime.enable');const rows=[];
 for(const variant of ['upstream','vpm']){
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+variant});
  const result=await send('Runtime.evaluate',{expression:"(async()=>{for(let i=0;i<300;i++){if(window.runScheduler)return await window.runScheduler();await new Promise(r=>setTimeout(r,20))}throw Error('Fixture unavailable')})()",awaitPromise:true,returnByValue:true});
  assert.equal(result.exceptionDetails,undefined,JSON.stringify(result.exceptionDetails));rows.push({variant,...result.result.value});
 }
 assert.deepEqual(rows[1].trace,rows[0].trace);assert.deepEqual(exceptions,[]);
 fs.writeFileSync(path.join(__dirname,'node_modules/.vpm-scheduler/browser-results.json'),JSON.stringify(rows,null,2));
 console.log('Chrome React transitions, urgent updates, cancellation, Suspense retry, hydration, focus and effect cleanup match Scheduler 0.28.0');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child && child.exitCode===null && child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');const kill=setTimeout(()=>child.kill('SIGKILL'),3000);await ended;clearTimeout(kill);}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
