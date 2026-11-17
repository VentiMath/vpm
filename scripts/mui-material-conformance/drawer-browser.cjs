"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-drawer-'));
let server,child,socket,sequence=0,control='';const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./drawer-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/drawer-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/drawer-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error'){const message=x.params.args.map(a=>a.value||a.description).join(' ');if(!(control==='current-upstream'&&message.startsWith('React does not recognize')&&message.endsWith('disableEscapeKeyDown disableescapekeydown')))exceptions.push(message);}if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle='(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(r=>setTimeout(r,45))})()';
 const wait=condition=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${condition})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(condition)})})()`);
 const key=async(name,shift=false)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code:name,windowsVirtualKeyCode:name==='Tab'?9:27,modifiers:shift?8:0});await send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name,windowsVirtualKeyCode:name==='Tab'?9:27});};
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:960,height:700,deviceScaleFactor:1,mobile:false});
 const snapshot=`['drawer-root','drawer-paper'].map(id=>{const el=document.getElementById(id),s=getComputedStyle(el),r=el.getBoundingClientRect();return {id,tag:el.tagName,css:Object.fromEntries(['position','zIndex','display','flexGrow','flexShrink','flexBasis','paddingLeft','paddingRight','paddingTop','paddingBottom','borderLeftWidth','borderRightWidth','borderTopWidth','borderBottomWidth','borderColor','borderRadius','backgroundColor','boxShadow','overflowY','visibility'].map(k=>[k,s[k]])),rect:[r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100)}})`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;control=name;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.drawerControls');
   const values=[];
   for(const variant of ['permanent','persistent','temporary'])for(const anchor of ['left','right','top','bottom'])for(const rtl of [false,true])for(const mode of ['light','dark']){
    await evaluate('window.renderDrawer('+JSON.stringify({variant,anchor,rtl,mode,variables:true,custom:true})+');'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);await wait('document.getElementById("drawer-paper")');values.push({variant,anchor,rtl,mode,value:await evaluate(snapshot)});
   }
   captures.push(values);
   await evaluate('window.drawerControls.setOpen(false);'+settle);await wait('!document.getElementById("drawer-paper")');
   await evaluate('window.renderDrawer({variant:"permanent"});'+settle);assert.equal(await evaluate('getComputedStyle(document.getElementById("drawer-paper")).visibility'),'visible');assert.notEqual(await evaluate('document.body.style.overflow'),'hidden');
   await evaluate('window.renderDrawer({variant:"persistent"});'+settle);assert.equal(await evaluate('getComputedStyle(document.getElementById("drawer-paper")).visibility'),'hidden');
   await evaluate('window.renderDrawer({});'+settle);await evaluate('document.getElementById("trigger").focus();document.getElementById("trigger").click();'+settle);await wait('document.getElementById("drawer-input")');
   assert.equal(await evaluate('window.drawerControls.rootRef.current===document.getElementById("drawer-root")&&window.drawerControls.paperRef.current===document.getElementById("drawer-paper")'),true);
   assert.equal(await evaluate('document.body.style.overflow'),'hidden');
   if(version==='current'||kind==='vpm'){const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(x=>x.role?.value==='dialog'&&x.name?.value==='Practice navigation'));}
   await evaluate('window.saved=document.getElementById("drawer-input");window.saved.focus();window.saved.value="Unsaved filter";window.renderDrawer({tick:1});'+settle);assert.equal(await evaluate('window.saved===document.getElementById("drawer-input")&&document.activeElement===window.saved&&window.saved.value==="Unsaved filter"'),true);
   await key('Tab');assert.equal(await evaluate('document.activeElement.id'),'drawer-last');await key('Tab');assert.equal(await evaluate('document.activeElement.id'),'drawer-input');await key('Tab',true);assert.equal(await evaluate('document.activeElement.id'),'drawer-last');
   await evaluate('document.getElementById("drawer-last").click();'+settle);await wait('document.getElementById("nested-input")');await evaluate('document.getElementById("nested-input").focus()');await key('Escape');await evaluate(settle);await wait('!document.getElementById("nested-input")');assert.equal(await evaluate('Boolean(document.getElementById("drawer-paper"))'),true);assert.equal(await evaluate('document.body.style.overflow'),'hidden');
   await key('Escape');await evaluate(settle);await wait('!document.getElementById("drawer-paper")');assert.equal(await evaluate('document.activeElement.id'),'trigger');assert.equal(await evaluate('window.drawerControls.events.current.includes("escapeKeyDown")'),true);assert.notEqual(await evaluate('document.body.style.overflow'),'hidden');
   await evaluate('window.renderDrawer({keepMounted:true,customSlots:true});'+settle);await wait('document.getElementById("drawer-paper")');await evaluate('window.retained=document.getElementById("drawer-input");window.retained.value="Retained";window.drawerControls.setOpen(true);'+settle);assert.equal(await evaluate('document.getElementById("drawer-paper").tagName'),'SECTION');
   await evaluate(`(()=>{const b=document.querySelector('[data-testid="backdrop"]');b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));b.click()})()`);await evaluate(settle);assert.equal(await evaluate('window.drawerControls.events.current.includes("backdropClick")'),true);assert.equal(await evaluate('window.retained===document.getElementById("drawer-input")&&window.retained.value==="Retained"'),true);
   await evaluate('window.drawerControls.setOpen(true);'+settle);
   await evaluate('(async()=>{window.drawerControls.setOpen(false);await new Promise(r=>setTimeout(r,10));window.drawerControls.setOpen(true)})()');await evaluate(settle);
   assert.equal(await evaluate('window.retained===document.getElementById("drawer-input")&&window.retained.value==="Retained"&&getComputedStyle(document.getElementById("drawer-paper")).visibility==="visible"'),true);
   await evaluate('window.renderDrawer({reset:1,keepMounted:true,customSlots:true,disableEscapeKeyDown:true,disableScrollLock:true});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);await wait('getComputedStyle(document.getElementById("drawer-paper")).visibility==="visible"');await key('Escape');await evaluate(settle);// Current Material 9 ignores this legacy flag; retain the app 7 behavior in VPM.
   assert.equal(await evaluate('getComputedStyle(document.getElementById("drawer-paper")).visibility'),version==='current'&&kind==='upstream'?'hidden':'visible');assert.notEqual(await evaluate('document.body.style.overflow'),'hidden');
   await evaluate('window.drawerControls.setOpen(false);'+settle);await evaluate('window.renderDrawer({iframe:true});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);await wait('window.drawerControls.frameRef.current.contentDocument.querySelector(".MuiDrawer-paper")');
   assert.equal(await evaluate('window.drawerControls.paperRef.current.ownerDocument===window.drawerControls.frameRef.current.contentDocument'),true);assert.equal(await evaluate('window.drawerControls.frameRef.current.contentDocument.body.style.overflow'),'hidden');assert.notEqual(await evaluate('document.body.style.overflow'),'hidden');
   await evaluate('window.drawerControls.setOpen(false);'+settle);assert.equal(await evaluate('window.drawerControls.frameRef.current.contentDocument.body.style.overflow'),'');
   await evaluate('window.unmountDrawer();'+settle);assert.equal(await evaluate('window.drawerControls.rootRef.current===null&&window.drawerControls.paperRef.current===null'),true);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.hydratedPaper===document.querySelector(".MuiDrawer-paper")'),true);
  }
  assert.deepEqual(captures[1],captures[0],version+' Drawer geometry, styling, physical RTL edges and theme');
 }
 assert.deepEqual(exceptions,[]);console.log('Drawer: current/app four edges, variants, theme/RTL, focus/dismissal, nested ownership, retained nodes, slots, iframe and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
