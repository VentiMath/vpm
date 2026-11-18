"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-linear-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./linear-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/linear-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/linear-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};


 const settle='new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
 const wait=c=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${c})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(c)})})()`);
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const settleStatic='(async()=>{await '+settle+';for(const a of document.getAnimations()){a.pause();a.currentTime=1000;}await '+settle+';})()';
 const snapshot=`(()=>{const keys=['display','height','width','left','right','top','bottom','opacity','color','backgroundColor','borderRadius','marginTop','backgroundSize','backgroundPosition','transform','transformOrigin','transitionDuration','animationDuration','animationDelay','animationTimingFunction'];return [...document.querySelectorAll('#bars .MuiLinearProgress-root,#bars .MuiLinearProgress-bar,#bars .MuiLinearProgress-dashed')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))}))})()`;
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.linearControls');const rows=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const custom of [false,true])for(const rtl of [false,true]){
    const props={mode,variables,custom,rtl};await evaluate('window.renderLinear('+JSON.stringify(props)+');'+settleStatic);rows.push({props,value:await evaluate(snapshot)});checks++;
   }
   for(const color of ['secondary','error','warning','info','success','inherit','contest']){await evaluate('window.renderLinear('+JSON.stringify({color})+');'+settleStatic);rows.push({props:{color},value:await evaluate(snapshot)});checks++;}
   await evaluate('window.renderLinear({color:"contest",variables:true});'+settleStatic);rows.push({props:{color:'contest',variables:true},value:await evaluate(snapshot)});checks++;
   captures.push(rows);await evaluate('window.renderLinear({});'+settleStatic);
   assert.equal(await evaluate('window.linearControls.ref.current===document.getElementById("loading")'),true);
   await evaluate('window.savedBar=document.getElementById("capacity");window.savedFill=window.savedBar.querySelector(".MuiLinearProgress-bar1");window.savedDraft=document.getElementById("draft");window.savedDraft.focus();window.savedDraft.value="Working";window.linearControls.setValue(75);window.renderLinear({tick:1});'+settleStatic);
   assert.equal(await evaluate('document.getElementById("capacity").getAttribute("aria-valuenow")'),'75');assert.equal(await evaluate('window.savedFill.style.transform'),'translateX(-25%)');
   assert.equal(await evaluate('window.savedBar===document.getElementById("capacity")&&window.savedFill===window.savedBar.querySelector(".MuiLinearProgress-bar1")&&document.activeElement===window.savedDraft&&window.savedDraft.value==="Working"'),true);
   assert.equal(await evaluate('document.querySelector("#table-caller [role=progressbar]")===null'),true);
   await evaluate('window.linearControls.setLoading(true);'+settleStatic);assert.equal(await evaluate('document.querySelector("#table-caller [role=progressbar]").getAttribute("aria-label")'),'Loading');
   await evaluate('window.linearControls.setLoading(false);window.linearControls.setShowProgressBars(true);'+settleStatic);assert.equal(await evaluate('!!document.querySelector("#table-caller [role=progressbar]")'),true);
   await evaluate('window.linearControls.setShowProgressBars(false);'+settleStatic);assert.equal(await evaluate('document.querySelector("#table-caller [role=progressbar]")'),null);
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='progressbar'&&n.name?.value==='Seat capacity'));assert(ax.nodes.some(n=>n.role?.value==='progressbar'&&n.name?.value==='Loading exams'));
   if(kind==='vpm'){
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(settle);
    assert.equal(await evaluate('getComputedStyle(document.querySelector("#loading .MuiLinearProgress-bar1")).animationName'),'none');assert(await evaluate('document.querySelector("#loading .MuiLinearProgress-bar1").getBoundingClientRect().width')>0);
    assert.equal(await evaluate('getComputedStyle(document.querySelector("#capacity .MuiLinearProgress-bar1")).transitionDuration'),'0s');await send('Emulation.setEmulatedMedia',{features:[]});
   }
   await evaluate('window.unmountLinear();'+settle);assert.equal(await evaluate('window.linearControls.ref.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  const differences=[];for(let i=0;i<captures[0].length;i++)for(let n=0;n<captures[0][i].value.length;n++){const u=captures[0][i].value[n],v=captures[1][i].value[n];for(const key of Object.keys(u.css))if(u.css[key]!==v.css[key])differences.push({props:captures[0][i].props,id:u.id,position:n,key,upstream:u.css[key],vpm:v.css[key]});}
  fs.writeFileSync(base+'/linear-'+version+'-differences.json',JSON.stringify(differences,null,2));assert.deepEqual(differences.slice(0,12),[],version+' LinearProgress computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' LinearProgress theme/RTL/color snapshots plus capacity updates, actual Material React Table loading, retained DOM/focus, motion preference, accessibility, refs and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
