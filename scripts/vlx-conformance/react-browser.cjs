'use strict';
// Verify the actual network boundary, not just a bundler's metadata.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const cwd=process.argv[2],chunks=JSON.parse(fs.readFileSync(path.join(cwd,'react-chunks.json'))),requests=[];
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-react-chrome-'));
const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
let server,child,socket,loaded,sequence=0;const pending=new Map();
(async()=>{try{
 server=http.createServer((req,res)=>{requests.push(req.url);if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><title>VLX React loading</title><div id="root"></div><script type="module" src="/'+chunks.entry+'"></script></html>');return;}
  const file=path.join(cwd,'react-dist',path.basename(req.url));if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(file));});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 child=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--no-proxy-server','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 const port=await require('../floating-react-conformance/chrome-port.cjs')(path.join(profile,'DevToolsActivePort'));
 const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Page.loadEventFired')loaded?.();if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Page.enable');const loadedPromise=new Promise(r=>{loaded=r});await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});await loadedPromise;
 const wait=condition=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${condition})return true;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out');})()`);
 await wait('window.ready && document.getElementById("root").textContent==="Plain prose"');
 for(const file of chunks.glyph)assert(!requests.includes('/'+file),'Plain prose must not request the glyph chunk');
 await evaluate('window.mountMath();true');await wait('document.querySelector("math")');
 for(const file of chunks.glyph)assert(requests.includes('/'+file),'Math must request deferred glyphs');
 assert.equal(await evaluate('document.querySelectorAll("math").length'),1);
 await evaluate('window.unmountMath();true');await wait('!document.getElementById("root").hasChildNodes()');
 console.log('Chrome React: prose loads without glyph data; first math fetches its deferred chunk, renders and unmounts.');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}await new Promise(r=>server?server.close(r):r());fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
