'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'vjs-cookie-browser-')),profile=dir+'/profile';
let server,child,socket,sequence=0;const pending=new Map(),errors=[];
(async()=>{try{
 for(const kind of ['current','app','vpm']){
  const entry=kind==='vpm'?process.env.VPM_COOKIE_ENTRY||root+'/packages/vjs-cookie/index.mjs':require.resolve(kind==='current'?'js-cookie':'js-cookie-app');
  esbuild.buildSync({stdin:{contents:"import cookies from 'js-cookie';import {CookieStorage} from './node_modules/@aws-amplify/core/dist/esm/storage/CookieStorage.mjs';window.cookies=cookies;window.CookieStorage=CookieStorage;",resolveDir:__dirname},outfile:dir+'/'+kind+'.js',bundle:true,format:'iife',platform:'browser',alias:{'js-cookie':entry},logLevel:'silent'});
 }
 server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),kind=url.searchParams.get('impl')||'vpm';if(/^\/(current|app|vpm)\.js$/.test(url.pathname)){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(dir+url.pathname));return;}res.setHeader('content-type','text/html');res.end('<!doctype html><script src="/'+kind+'.js"></script>')});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Runtime.enable');let checks=0;const results=[];
 const navigate=async(kind,where)=>{await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+where+'?impl='+kind});await evaluate("(async()=>{for(let i=0;i<200;i++){if(window.cookies)return;await new Promise(r=>setTimeout(r,15))}throw Error('Fixture unavailable')})()")};
 for(const kind of ['current','app','vpm']){
  await navigate(kind,'/scope/page');
  const result=await evaluate(`(async()=>{
   const api=cookies,storage=new CookieStorage({secure:false,path:'/',sameSite:'lax'});await storage.clear();
   api.set('unicode','π 😀;= %');api.withAttributes({path:'/scope',sameSite:'lax'}).set('scoped','yes');
   api.set('gone','value',{expires:-1});
   const converted=api.withConverter({read:v=>v.toUpperCase()});
   api.set('convert','mixed');await storage.setItem('Amplify.test.token','synthetic.π.token');
   const before=[api.get('unicode'),api.get('scoped'),api.get('gone')??null,converted.get('convert'),await storage.getItem('Amplify.test.token')];
   await storage.removeItem('Amplify.test.token');before.push(await storage.getItem('Amplify.test.token'));
   return before;
  })()`);
  assert.deepEqual(result,['π 😀;= %','yes',null,'MIXED','synthetic.π.token',null]);results.push(result);checks+=6;
  await navigate(kind,'/outside');assert.equal(await evaluate('cookies.get("scoped")??null'),null);checks++;
  await navigate(kind,'/scope/again');assert.equal(await evaluate('cookies.get("scoped")'),'yes');
  await evaluate('cookies.remove("scoped",{path:"/scope"});');assert.equal(await evaluate('cookies.get("scoped")??null'),null);checks+=2;
  await evaluate('(async()=>{const s=new CookieStorage({secure:false});await s.clear()})()');assert.deepEqual(await evaluate('cookies.get()'),{});checks++;
  if(kind==='vpm'){assert.equal(await evaluate('cookies.set("__proto__","safe");Object.hasOwn(cookies.get(),"__proto__")'),true);await evaluate('cookies.remove("__proto__")');checks++;}
 }
 assert.deepEqual(results[2],results[0]);assert.deepEqual(results[2],results[1]);assert.deepEqual(errors,[]);console.log(checks+' browser cookie/path/expiry/converter and unchanged Amplify CookieStorage checks pass');
}finally{esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
