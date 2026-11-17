"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-dialog-parts-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./dialog-parts-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/dialog-parts-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/dialog-parts-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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

 const wait=condition=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${condition})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(condition)})})()`);
 const snapshot=`[...document.querySelectorAll('#parts .MuiDialogTitle-root,#parts .MuiDialogContent-root,#parts .MuiDialogActions-root,#parts .MuiDialogContentText-root,#live-actions > button,#wrapped > button')].map(el=>({id:el.id,tag:el.tagName,css:Object.fromEntries(['display','width','height','paddingLeft','paddingRight','paddingTop','paddingBottom','marginLeft','marginRight','flexGrow','flexShrink','flexBasis','flexWrap','gap','borderTopWidth','borderBottomWidth','borderColor','color','fontSize','fontWeight','letterSpacing','overflowY'].map(k=>[k,getComputedStyle(el)[k]]))}))`;
 for(const version of ['current','app']){
  const captures=[],focusCaptures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.dialogControls');
   const styles=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const custom of [false,true])for(const rtl of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,variables,custom,rtl})+');'+settle);
    for(const width of [360,960]){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate(settle);styles.push({mode,variables,custom,rtl,width,values:await evaluate(snapshot)});}
   }
   captures.push(styles);
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.dialogControls.titleRef.current===document.getElementById("live-title")&&window.dialogControls.contentRef.current===document.getElementById("live-content")&&window.dialogControls.actionsRef.current===document.getElementById("live-actions")&&window.dialogControls.descriptionRef.current===document.getElementById("opt-out-description")'),true);
   assert.equal(await evaluate('getComputedStyle(document.getElementById("live-content")).paddingTop'),'0px');
   assert.equal(await evaluate('getComputedStyle(document.getElementById("without-title")).paddingTop'),'20px');
   assert.equal(await evaluate('getComputedStyle(document.getElementById("save")).marginLeft'),'8px');
   await evaluate('window.savedDescription=document.getElementById("opt-out-description");window.saved=document.getElementById("focus");window.saved.focus();window.saved.value="Unsaved edit";window.scroller=document.getElementById("live-content");window.scroller.scrollTop=80;window.renderVariants({tick:1});'+settle);
   assert.equal(await evaluate('window.savedDescription===document.getElementById("opt-out-description")&&window.saved===document.getElementById("focus")&&document.activeElement===window.saved&&window.saved.value==="Unsaved edit"&&window.scroller.scrollTop===80'),true);
   await evaluate('window.dialogControls.setTitle(false);'+settle);assert.equal(await evaluate('getComputedStyle(window.scroller).paddingTop'),'20px');assert.equal(await evaluate('window.dialogControls.titleRef.current'),null);
   await evaluate('window.dialogControls.setTitle(true);window.dialogControls.setDividers(true);window.dialogControls.setSpacing(false);'+settle);
   assert.equal(await evaluate('getComputedStyle(window.scroller).paddingTop'),'16px');assert.equal(await evaluate('getComputedStyle(window.scroller).borderTopWidth'),'1px');
   assert.equal(await evaluate('getComputedStyle(document.getElementById("save")).marginLeft'),'0px');
   await evaluate('window.dialogControls.setContextId("new-title");'+settle);assert.equal(await evaluate('document.querySelector("#label-dialog h2").id===document.getElementById("label-dialog").getAttribute("aria-labelledby")'),true);
   // Check accessible naming, placement and buttons inside the unchanged Dialog
   // control. IDs are explicit; this is not an owned Dialog implementation.
   await evaluate('document.getElementById("cancel").focus();window.dialogControls.setOverlay(true);'+settle);await wait('document.getElementById("overlay-input")');await evaluate(settle);
   // Initial autofocus belongs to the unchanged modal control. StrictMode can
   // focus its container; compare the observed result before testing native Tab.
   focusCaptures.push(await evaluate('({id:document.activeElement.id,role:document.activeElement.getAttribute("role"),tag:document.activeElement.tagName})'));
   await evaluate('document.getElementById("overlay-input").focus()');
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='dialog'&&n.name?.value==='Edit reminder'&&n.description?.value==='Update this reminder.'));
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate('document.activeElement.id'),'overlay-close');
   await evaluate('document.getElementById("overlay-close").click();'+settle);await wait('!document.getElementById("overlay-input")');assert.equal(await evaluate('document.activeElement.id'),'cancel');
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('window.dialogControls.titleRef.current===null&&window.dialogControls.contentRef.current===null&&window.dialogControls.actionsRef.current===null&&window.dialogControls.descriptionRef.current===null'),true);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);assert.equal(await evaluate('document.querySelector("#hydrated h2").id'),'hydrated-title');
  }
  assert.deepEqual(focusCaptures[1],focusCaptures[0],version+' unchanged modal initial focus');
  assert.deepEqual(captures[1],captures[0],version+' layout, typography, theme, RTL and responsive dialog structures');
 }
 assert.deepEqual(exceptions,[]);console.log('Dialog structures: current/app layout, theme/RTL, refs, drafts/focus/scroll retention, accessible naming, unchanged Dialog controls and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
