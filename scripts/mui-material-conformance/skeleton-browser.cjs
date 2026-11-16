"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-skeleton-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./skeleton-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/skeleton-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/skeleton-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle='new Promise(r=>setTimeout(r,350))';
 await send('Runtime.enable');await send('Accessibility.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 const key=async(key,code)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code});await evaluate(settle)};
 const click=async selector=>{await evaluate('document.querySelector('+JSON.stringify(selector)+').dispatchEvent(new MouseEvent("click",{bubbles:true}));'+settle)};
 const snapshot=`(()=>{const ctx=document.createElement('canvas').getContext('2d');const color=v=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};const keys=['display','height','width','backgroundColor','borderRadius','borderTopWidth','maxWidth','fontSize','lineHeight','marginTop','marginBottom','marginLeft','marginRight','transform','transformOrigin'];return [...document.querySelectorAll('#skeletons .MuiSkeleton-root:not(#zero)')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,k==='backgroundColor'?color(getComputedStyle(el)[k]):getComputedStyle(el)[k]]))}))})()`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.skeletonControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Skeleton fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom,wide:!rtl})+');'+settle);styles.push(await evaluate(snapshot));
   }
   captures.push(styles);comparisons+=styles.length;
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.skeletonControls.ref.current===document.getElementById("sized")'),true);
   await evaluate('window.saved=document.getElementById("sized");document.getElementById("outside").focus();window.renderVariants({tick:2});'+settle);
   assert.equal(await evaluate('window.saved===document.getElementById("sized")&&document.activeElement.id==="outside"'),true);
   await evaluate('window.skeletonControls.setWidth(164);'+settle);
   assert.equal(await evaluate('getComputedStyle(document.getElementById("sized")).width'),'164px');
   assert.equal(await evaluate('getComputedStyle(document.getElementById("stopped")).animationName'),'none');
   assert.notEqual(await evaluate('getComputedStyle(document.getElementById("pulse")).animationName'),'none');
   assert.notEqual(await evaluate('getComputedStyle(document.getElementById("wave"),"::after").animationName'),'none');
   assert.equal(await evaluate('getComputedStyle(document.querySelector("#measure span")).visibility'),'hidden');
   if(kind==='vpm'){
    assert.equal(await evaluate('getComputedStyle(document.getElementById("text-child")).color'),'rgba(0, 0, 0, 0)');
    await evaluate('document.querySelector("#hidden-button button").style.visibility="visible";document.querySelector("#hidden-button button").focus();');
    assert.equal(await evaluate('document.activeElement.id'),'outside');
    const ax=await send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='status'&&n.name?.value==='Loading archive'));
    assert.ok(!ax.nodes.some(n=>n.name?.value?.includes('Private placeholder text')||n.name?.value==='Placeholder action'));
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate('getComputedStyle(document.getElementById("pulse")).animationName'),'none');
    assert.equal(await evaluate('getComputedStyle(document.getElementById("wave"),"::after").animationName'),'none');
    await send('Emulation.setEmulatedMedia',{features:[]});comparisons+=6;
   }
   comparisons+=7;
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('window.skeletonControls.ref.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);comparisons+=2;
  }
  assert.deepEqual(captures[1],captures[0],version+' computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' Skeleton browser geometry, theme, ref, hydration, motion preference and accessibility checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
