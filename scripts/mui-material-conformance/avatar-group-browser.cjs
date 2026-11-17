"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-avatar-group-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./avatar-group-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/avatar-group-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/avatar-group-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 const snapshot=`[...document.querySelectorAll('#groups .MuiAvatarGroup-root,#groups .MuiAvatar-root')].map(el=>({id:el.id,text:el.textContent,tag:el.tagName,css:Object.fromEntries(['display','flexDirection','width','height','marginLeft','marginRight','borderRadius','borderWidth','borderColor','boxSizing','fontSize','backgroundColor'].map(k=>[k,getComputedStyle(el)[k]])),x:Math.round(el.getBoundingClientRect().x*100)/100}))`;

 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.groupControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Groups fixture unavailable')})()");
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
   assert.equal(await evaluate('window.groupControls.ref.current===document.getElementById("live")'),true);
   assert.equal(await evaluate('window.groupControls.childRef.current===document.getElementById("member-A")'),true);
   assert.equal(await evaluate('window.groupControls.surplusRef.current.textContent'),'2 more');
   await evaluate('window.saved=document.getElementById("member-A");window.saved.focus();window.renderVariants({tick:2});'+settle);
   assert.equal(await evaluate('window.saved===document.getElementById("member-A")&&document.activeElement===window.saved'),true);
   await evaluate('window.groupControls.setLabels(["A","E","B","C","D"]);'+settle);
   assert.equal(await evaluate('window.saved===document.getElementById("member-A")&&document.activeElement===window.saved'),true);
   assert.equal(await evaluate('document.getElementById("live").textContent'),'3 moreEA');
   await evaluate('window.groupControls.setMax(5);'+settle);
   assert.equal(await evaluate('document.getElementById("live").textContent'),'DCBEA');
   assert.equal(await evaluate('window.groupControls.surplusRef.current'),null);
   await evaluate('window.unmountVariants();'+settle);
   assert.equal(await evaluate('window.groupControls.ref.current===null&&window.groupControls.childRef.current===null'),true);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);comparisons+=10;
  }
  for(let i=0;i<captures[0].length;i++)assert.deepEqual(captures[1][i],captures[0][i],version+' '+JSON.stringify(captures[0][i]).slice(0,120));
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' AvatarGroup browser layout, stable member DOM/focus, overflow updates, refs and hydration checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
