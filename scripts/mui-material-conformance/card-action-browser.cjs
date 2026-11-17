"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-card-action-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./card-action-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/card-action-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/card-action-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 // Compare settled styles, not arbitrary points in Paper shadow transitions.
 const settle='(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))})()';
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 const snapshot=`[...document.querySelectorAll('#actions .MuiCardActionArea-root,#actions .MuiCardActionArea-focusHighlight')].map(el=>({id:el.id,tag:el.tagName,css:Object.fromEntries(['display','width','height','textAlign','borderRadius','paddingLeft','paddingRight','position','pointerEvents','opacity','backgroundColor','transitionDuration'].map(k=>[k,getComputedStyle(el)[k]]))}))`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.actionControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Cards fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const custom of [false,true])for(const rtl of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,variables,custom,rtl})+');'+settle);
    for(const width of [360,960]){
     await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate(settle);
     styles.push({mode,variables,custom,rtl,width,values:await evaluate(snapshot)});
    }
   }
   captures.push(styles);comparisons+=styles.length;
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.actionControls.ref.current===document.getElementById("button")'),true);
   await evaluate('window.saved=document.getElementById("button");window.actionControls.action.current.focusVisible();'+settle);
   assert.equal(await evaluate('document.activeElement.id'), 'button');
   assert.equal(await evaluate('document.getElementById("button").classList.contains("app-focus")'),true);
   assert.equal(await evaluate('getComputedStyle(document.querySelector("#button .MuiCardActionArea-focusHighlight")).opacity'),'0.12');
   const key=async(key,code,text)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code,...(text?{text,unmodifiedText:text}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});await evaluate(settle)};
   await key('Enter',13,'\r');assert.equal(await evaluate('document.getElementById("clicks").textContent'),'1');
   await evaluate('window.renderVariants({tick:3});'+settle);assert.equal(await evaluate('window.saved===document.getElementById("button")&&document.activeElement.id==="button"'),true);
   await evaluate('window.actionControls.setDisabled(true);'+settle);assert.equal(await evaluate('document.getElementById("button").disabled'),true);
   await evaluate('document.getElementById("button").click();'+settle);assert.equal(await evaluate('document.getElementById("clicks").textContent'),'1');
   await evaluate('document.getElementById("router").focus();'+settle);await key('Enter',13,'\r');assert.equal(await evaluate('document.getElementById("clicks").textContent'),'2');
   assert.equal(await evaluate('document.getElementById("router").getAttribute("href")'),'/exam');
   if(kind==='vpm'){await evaluate('document.getElementById("disabled").click();'+settle);assert.equal(await evaluate('document.getElementById("clicks").textContent'),'2');}
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('window.actionControls.ref.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);comparisons+=12;
  }
  for(let i=0;i<captures[0].length;i++)assert.deepEqual(captures[1][i],captures[0][i],version+' '+JSON.stringify(captures[0][i]).slice(0,120));
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' CardActionArea browser layout, focus overlay, keyboard/navigation, refs and hydration checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
