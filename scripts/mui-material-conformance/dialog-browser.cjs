"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-dialog-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./dialog-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/dialog-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/dialog-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 const press=async(key,shift=false)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,modifiers:shift?8:0,windowsVirtualKeyCode:({Escape:27,Tab:9})[key]});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});await evaluate(settle)};
 const open=async()=>{await evaluate('document.getElementById("trigger").focus();document.getElementById("trigger").click()');await wait('document.querySelector("[data-paper=main]")');await evaluate(settle)};
 const close=async()=>{await evaluate('window.dialogControls.setOpen(false)');await wait('!document.querySelector("[data-paper=main]")');await evaluate(settle)};
 const snapshot=`(()=>{const nodes=[document.getElementById('main-dialog'),document.querySelector('#main-dialog > .MuiBackdrop-root'),document.querySelector('#main-dialog .MuiDialog-container'),document.querySelector('[data-paper=main]')];return nodes.map(el=>({css:Object.fromEntries(['position','display','height','width','maxWidth','maxHeight','marginTop','marginLeft','paddingLeft','borderRadius','backgroundColor','overflowY','overflowX','alignItems','justifyContent','flexDirection','textAlign','zIndex'].map(k=>[k,getComputedStyle(el)[k]])),rect:[el.getBoundingClientRect().x,el.getBoundingClientRect().y,el.getBoundingClientRect().width,el.getBoundingClientRect().height].map(n=>Math.round(n*100)/100)}))})()`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.dialogControls');
   const styles=[];await open();
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const custom of [false,true])for(const rtl of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,variables,custom,rtl})+');'+settle);
    for(const width of [360,960]){await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false});await evaluate(settle);styles.push(await evaluate(snapshot));}
   }
   await evaluate('window.renderVariants({});'+settle);
   for(const options of [{fullWidth:true,maxWidth:'xs'},{fullWidth:true,maxWidth:'md'},{maxWidth:false},{scroll:'body',fullWidth:true},{fullScreen:true}]){
    await evaluate('window.dialogControls.setConfig('+JSON.stringify(options)+');'+settle);
    for(const width of [360,960]){await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false});await evaluate(settle);styles.push(await evaluate(snapshot));}
   }
   captures.push(styles);await close();await evaluate('window.dialogControls.setConfig({});'+settle);await open();
   assert.equal(await evaluate('window.dialogControls.ref.current===document.getElementById("main-dialog")&&window.dialogControls.paperRef.current===document.querySelector("[data-paper=main]")'),true);
   assert.equal(await evaluate('document.querySelector("[data-paper=main]").getAttribute("aria-labelledby")===document.querySelector("[data-paper=main] h2").id'),true);
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='dialog'&&n.name?.value==='Reminder form'));
   assert.equal(await evaluate('document.body.style.overflow'),'hidden');assert.equal(await evaluate('document.getElementById("main-dialog").parentNode===document.body'),true);
   await evaluate('window.saved=document.getElementById("first");window.saved.focus();window.saved.value="Unsaved draft";window.renderVariants({tick:4});window.dialogControls.setContent(true);'+settle);
   assert.equal(await evaluate('window.saved===document.getElementById("first")&&document.activeElement===window.saved&&window.saved.value==="Unsaved draft"'),true);
   await evaluate('document.getElementById("last").focus()');await press('Tab');assert.equal(await evaluate('document.activeElement.id'),'first');await press('Tab',true);assert.equal(await evaluate('document.activeElement.id'),'last');
   await evaluate('document.getElementById("outside").focus();'+settle);assert.equal(await evaluate('document.getElementById("main-dialog").contains(document.activeElement)'),true);
   await evaluate('document.getElementById("nested-open").focus();document.getElementById("nested-open").click();'+settle);await wait('document.getElementById("nested-first")');// Keep autofocus stricter for VPM: upstream StrictMode can land outside the nested paper.
   if(kind==='vpm')assert.equal(await evaluate('document.activeElement.id'),'nested-first');await press('Escape');await wait('!document.getElementById("nested-first")');assert.equal(await evaluate('window.dialogControls.open'),true);assert.equal(await evaluate('document.activeElement.id'),'nested-open');assert.equal(await evaluate('document.body.style.overflow'),'hidden');
   await evaluate('document.getElementById("menu-open").focus();document.getElementById("menu-open").click();'+settle);await wait('document.getElementById("menu-choice")');assert.equal(await evaluate('document.activeElement.id'),'menu-choice');await press('Escape');await wait('!document.getElementById("menu-choice")');assert.equal(await evaluate('window.dialogControls.open'),true);assert.equal(await evaluate('document.activeElement.id'),'menu-open');
   // A drag starting on content must not become a backdrop dismissal.
   await evaluate('document.getElementById("first").dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));document.querySelector("#main-dialog .MuiDialog-container").click();'+settle);assert.equal(await evaluate('window.dialogControls.open'),true);
   await evaluate('window.dialogControls.setConfig('+JSON.stringify(version==='app'||kind==='vpm'?{disableEscapeKeyDown:true}:{hold:true})+');'+settle);await press('Escape');assert.equal(await evaluate('window.dialogControls.open'),true);await evaluate('window.dialogControls.setConfig({});'+settle);
   await evaluate('const n=document.querySelector("#main-dialog .MuiDialog-container");n.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));n.click();');await wait('!document.querySelector("[data-paper=main]")');assert.equal(await evaluate('window.dialogControls.events.current.includes("backdropClick")'),true);assert.equal(await evaluate('document.activeElement.id'),'trigger');assert.equal(await evaluate('document.body.style.overflow'),'');
   await evaluate('window.dialogControls.setConfig({keepMounted:true});'+settle);await open();await evaluate('window.retained=document.getElementById("first");window.retained.value="Kept";window.dialogControls.setOpen(false);'+settle);await wait('getComputedStyle(document.getElementById("main-dialog")).visibility==="hidden"');await open();assert.equal(await evaluate('document.getElementById("first")===window.retained&&window.retained.value==="Kept"'),true);
   await evaluate('window.dialogControls.setConfig({});'+settle);await close();
   await evaluate('window.dialogControls.setConfig({disablePortal:true,disableScrollLock:true,disableRestoreFocus:true,disableEnforceFocus:true});'+settle);await open();assert.equal(await evaluate('document.body.style.overflow'),'');assert.equal(await evaluate('document.getElementById("main-dialog").parentNode===document.body'),false);await evaluate('document.getElementById("outside").focus();'+settle);assert.equal(await evaluate('document.activeElement.id'),'outside');await close();assert.equal(await evaluate('document.activeElement.id'),'outside');
   // Both app transition extension forms use the unchanged public Slide control.
   for(const legacy of [false,true]){if(legacy&&version==='current')continue;await evaluate('window.dialogControls.setConfig('+JSON.stringify({slide:true,legacy})+');'+settle);await open();assert.equal(await evaluate('getComputedStyle(document.querySelector("#main-dialog > .MuiBackdrop-root")).backgroundColor'),'rgba(0, 0, 0, 0)');await close();}
   await evaluate('window.dialogControls.setConfig({slow:true});'+settle);await open();
   await evaluate('window.dialogControls.setOpen(false)');await wait('window.dialogControls.events.current.at(-1)==="exit"');assert.equal(await evaluate('document.body.style.overflow'),'hidden');await evaluate('window.dialogControls.setOpen(true)');await wait('window.dialogControls.events.current.at(-1)==="entered"');await evaluate('new Promise(r=>setTimeout(r,250))');assert.equal(await evaluate('!!document.querySelector("[data-paper=main]")'),true);await close();
   if(kind==='vpm'){await evaluate('window.renderVariants({reduced:"always"});window.dialogControls.setConfig({slow:true});'+settle);await open();assert.equal(await evaluate('getComputedStyle(document.querySelector("#main-dialog .MuiDialog-container")).transitionDuration'),'0s');await close();await evaluate('window.renderVariants({});'+settle);}
   await evaluate('window.mountFrame();'+settle);await wait('document.getElementById("dialog-frame").contentWindow.dialogControls');await evaluate('window.frameDoc=document.getElementById("dialog-frame").contentDocument;frameDoc.getElementById("trigger").focus();frameDoc.getElementById("trigger").click();'+settle);await wait('frameDoc.querySelector("[data-paper=main]")');
   assert.deepEqual(await evaluate('[frameDoc.getElementById("main-dialog").parentNode===frameDoc.body,frameDoc.body.style.overflow,document.body.style.overflow]'),[true,'hidden','']);await evaluate('frameDoc.getElementById("last").click();'+settle);await wait('!frameDoc.querySelector("[data-paper=main]")');assert.equal(await evaluate('frameDoc.activeElement.id'),'trigger');await evaluate('window.removeFrame();'+settle);await open();await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('document.body.style.overflow'),'');
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  fs.writeFileSync(path.join(os.tmpdir(),'vpm-dialog-'+version+'.json'),JSON.stringify(captures));assert.deepEqual(captures[1],captures[0],version+' dialog layout/themes');
 }
 assert.deepEqual(exceptions,[]);console.log('Dialog current/app styles, naming, modal keyboard/focus, nested Menu/Dialog ownership, dismissal guards, custom Slide, interruption, iframe ownership and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
