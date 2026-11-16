'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'vnanoid-browser-')),profile=dir+'/profile';
let server,child,socket,sequence=0;const pending=new Map(),errors=[];
(async()=>{try{
 for(const kind of ['current','app','vpm']){
  const entry=kind==='vpm'?(process.env.VPM_NANOID_ROOT||root+'/packages/vnanoid')+'/index.browser.mjs':require.resolve(kind==='current'?'nanoid':'nanoid-app').replace(/index\.(?:cjs|js)$/,kind==='current'?'index.browser.js':'index.browser.js');
  const non=kind==='vpm'?(process.env.VPM_NANOID_ROOT||root+'/packages/vnanoid')+'/non-secure.mjs':require.resolve((kind==='current'?'nanoid':'nanoid-app')+'/non-secure');
  esbuild.buildSync({stdin:{contents:"import * as api from 'secure';import * as non from 'loose';window.api=api;window.non=non;",resolveDir:__dirname},outfile:dir+'/'+kind+'.js',bundle:true,format:'iife',platform:'browser',alias:{secure:entry,loose:non},logLevel:'silent'});
 }
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),kind=url.searchParams.get('impl')||'vpm';if(/^\/(current|app|vpm)\.js$/.test(url.pathname)){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(dir+url.pathname));return;}res.setHeader('content-type','text/html');res.end('<!doctype html><script src="/'+kind+'.js"></script>')});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Runtime.enable');let checks=0;const results=[];
 const navigate=async(kind,where)=>{await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+where+'?impl='+kind});await evaluate("(async()=>{for(let i=0;i<200;i++){if(window.api)return;await new Promise(r=>setTimeout(r,15))}throw Error('Fixture unavailable')})()")};
 for(const kind of ['current','app','vpm']){
  await navigate(kind,'/');
  const result=await evaluate(`(()=>{
   const ids=Array.from({length:1000},()=>api.nanoid());
   const bytes=api.random(128),before=Array.from(bytes);for(let i=0;i<100;i++)api.nanoid(500);
   return [ids.every(id=>/^[A-Za-z0-9_-]{21}$/.test(id)),new Set(ids).size,api.customAlphabet('abc',37)().length,api.nanoid(0),non.nanoid(6).length,JSON.stringify(before)===JSON.stringify(Array.from(bytes))];
  })()`);
  assert.deepEqual(result,[true,1000,37,'',6,true]);checks+=6;
  if(kind==='vpm'){
   assert.equal(await evaluate('api.random(65537).length'),65537);
   assert.equal(await evaluate('api.nanoid(65537).length'),65537);checks+=2;
   assert.equal(await evaluate(`(()=>{Object.defineProperty(globalThis,'crypto',{value:{getRandomValues(){throw Error('unavailable')}},configurable:true});try{api.random(1);return false}catch(e){return e.message==='unavailable'}})()`),true);checks++;
  }
 }
 assert.deepEqual(errors,[]);console.log(checks+' browser crypto, non-secure IDs and entropy-failure checks pass');
}finally{esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
