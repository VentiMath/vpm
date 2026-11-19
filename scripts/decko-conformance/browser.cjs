'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vdecko-chrome-')),entry=process.env.VDECKO_ENTRY||path.resolve(__dirname,'../../packages/vdecko/index.cjs');
const esbuild=require('../mui-system-conformance/node_modules/esbuild');let child,server,socket,seq=0;const pending=new Map();
(async()=>{try{
 const bundles={};for(const variant of ['upstream','vpm'])bundles[variant]=esbuild.buildSync({stdin:{contents:"window.Redoc=require('redoc');",resolveDir:path.resolve(__dirname,'../eventemitter3-conformance')},bundle:true,write:false,platform:'browser',format:'iife',alias:variant==='vpm'?{decko:entry}:{},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'}).outputFiles[0].text;
 server=http.createServer((req,res)=>{const variant=req.url.includes('upstream')?'upstream':'vpm';res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url.endsWith('.js')?bundles[variant]:'<!doctype html><meta charset="utf-8"><script src="/'+variant+'.js"></script>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>reject(Error(method+' timed out')),30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const traces=[];
 for(const variant of ['upstream','vpm']){
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+variant});
  const result=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
   for(let i=0;!window.Redoc&&i<300;i++)await new Promise(r=>setTimeout(r,10));
   const history=new Redoc.HistoryService(),trace=[];history.bind();const settled=async id=>{for(let i=0;i<100;i++){if(history.currentId===id)return;await new Promise(r=>setTimeout(r,20))}throw Error('History replacement did not settle')};
   const off=history.subscribe(id=>trace.push(id));
   history.replace('section/Overview',true);await settled('section/Overview');history.emit();
   const first=history.currentId;off();const stopped=trace.length;history.replace('operation/getContest',true);await settled('operation/getContest');history.emit();
   if(trace.length!==stopped)throw Error('Unsubscribe did not remove the listener');
   const resumed=history.subscribe(id=>trace.push('again:'+id));history.emit();resumed();history.dispose();
   const scroll=new Redoc.ScrollService({scrollYOffset:()=>0}),values=[];scroll.bind();const unscroll=scroll.subscribe(value=>values.push(value));scroll.handleScroll();unscroll();const count=values.length;scroll.handleScroll();if(values.length!==count)throw Error('Scroll subscription survived cleanup');scroll.dispose();
   return {trace,first,current:history.currentId,link:history.linkForId('operation/getContest'),scroll:values};
  })()`});
  assert.equal(result.exceptionDetails,undefined,JSON.stringify(result.exceptionDetails));traces.push(result.result.value);
 }
 assert.deepEqual(traces[1],traces[0]);assert(traces[0].trace.length>=2);console.log('Unchanged Redoc HistoryService and ScrollService pass in Chrome: subscribe, replace, emit, unsubscribe, resubscribe and dispose');
 console.log(JSON.stringify(traces[0]));
 }finally{esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
