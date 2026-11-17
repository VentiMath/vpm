"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-drawer-'));
let server,child,socket,sequence=0,control='';const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./swipeable-drawer-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/swipeable-drawer-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/swipeable-drawer-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();let activeTarget=tabs.find(t=>t.type==='page').id;socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 const handleMessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error'){const message=x.params.args.map(a=>a.value||a.description).join(' ');if(!(control==='current-upstream'&&message.startsWith('React does not recognize')&&message.endsWith('disableEscapeKeyDown disableescapekeydown')))exceptions.push(message);}if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 socket.onmessage=handleMessage;
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle='(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));await new Promise(r=>setTimeout(r,45))})()';
 const wait=condition=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${condition})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(condition)})})()`);
 const key=async(name,shift=false)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code:name,windowsVirtualKeyCode:name==='Tab'?9:27,modifiers:shift?8:0});await send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name,windowsVirtualKeyCode:name==='Tab'?9:27});};
 const touch=async(from,to,{steps=6,delay=24,cancel=false}={})=>{
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from[0],y:from[1],id:1}]});
  for(let i=1;i<=steps;i++){await evaluate('new Promise(r=>setTimeout(r,'+delay+'))');await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from[0]+(to[0]-from[0])*i/steps,y:from[1]+(to[1]-from[1])*i/steps,id:1}]});}
  await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await evaluate(settle);
 };
 await send('Runtime.enable');await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:960,height:700,deviceScaleFactor:1,mobile:false});
 const snapshot=`['drawer-root','drawer-paper'].map(id=>{const el=document.getElementById(id),s=getComputedStyle(el),r=el.getBoundingClientRect();return {id,tag:el.tagName,css:Object.fromEntries(['position','zIndex','display','flexGrow','flexShrink','flexBasis','paddingLeft','paddingRight','paddingTop','paddingBottom','borderLeftWidth','borderRightWidth','borderTopWidth','borderBottomWidth','borderColor','borderRadius','backgroundColor','boxShadow','overflowY','visibility'].map(k=>[k,s[k]])),rect:[r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100)}})`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;if(process.env.VPM_SWIPE_CONTROL&&process.env.VPM_SWIPE_CONTROL!==name)continue;
   // A fresh tab isolates Chrome's native gesture recognizer, including pinch state.
   if(control){const old=activeTarget;({targetId:activeTarget}=await send('Target.createTarget',{url:'about:blank'}));const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket.close();socket=new WebSocket(pages.find(t=>t.id===activeTarget).webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});socket.onmessage=handleMessage;await send('Target.closeTarget',{targetId:old});await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:960,height:700,deviceScaleFactor:1,mobile:false});}
   control=name;await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});console.log('Checking '+name);await send('Emulation.resetPageScaleFactor');await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.drawerControls');if(version==='app'&&kind==='upstream')await evaluate('window.renderDrawerRaw=window.renderDrawer;window.renderDrawer=props=>window.renderDrawerRaw({legacyPaper:true,...props})');
   const values=[];
   for(const variant of ['temporary'])for(const anchor of ['left','right'])for(const rtl of [false,true])for(const mode of ['light','dark']){
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
   if(version==='current'&&kind==='upstream'){await evaluate('window.renderDrawer({reset:19,keepMounted:true,externalPaperRef:true,minFlingVelocity:1e9});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);await touch([220,300],[10,300]);assert.equal(await evaluate('document.getElementById("scene").dataset.open'),'true','current upstream external paper ref suppresses swipe handling');}
   let reset=20;
   for(const anchor of ['left','right','top','bottom'])for(const rtl of [false,true]){
    await evaluate('window.renderDrawer('+JSON.stringify({reset:reset++,anchor,rtl,keepMounted:true,externalPaperRef:kind==='vpm',legacyPaper:version==='app'&&kind==='upstream',minFlingVelocity:1e9})+');'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);
    const physical=rtl?(anchor==='left'?'right':anchor==='right'?'left':anchor):anchor;
        const coords=await evaluate(`(()=>{const r=document.getElementById('drawer-paper').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
    const horizontal=physical==='left'||physical==='right',negative=physical==='left'||physical==='top';
    const from=horizontal?[negative?coords.x+coords.w-20:coords.x+20,coords.y+coords.h/2]:[coords.x+coords.w/2,negative?coords.y+coords.h-20:coords.y+20];
    const short=[...from];short[horizontal?0:1]+=negative?-12:12;await touch(from,short);
    assert.equal(await evaluate('document.getElementById("scene").dataset.open'),'true',name+' short '+physical);
    // Separate the short probe from the next gesture beyond Chrome's double-tap window.
    await evaluate('new Promise(r=>setTimeout(r,350))');
    const to=horizontal?[negative?coords.x+5:coords.x+coords.w-5,from[1]]:[from[0],negative?coords.y+5:coords.y+coords.h-5];
    await evaluate('window.swipeSaved=document.getElementById("drawer-input");window.swipeSaved.value="Draft navigation"');await touch(from,to);
    if(await evaluate('document.getElementById("scene").dataset.open')!=='false')console.log('Failed swipe',name,anchor,rtl,coords,await evaluate('window.drawerControls.events.current'));await wait('document.getElementById("scene").dataset.open==="false"');assert.equal(await evaluate('window.swipeSaved===document.getElementById("drawer-input")&&window.swipeSaved.value==="Draft navigation"'),true,name+' retained '+physical);
    assert.equal(await evaluate(`document.querySelector('[data-testid="swipe-area"]')===null`),true,name+' disabled opening edge');
   }
   await evaluate('window.renderDrawer({reset:60,keepMounted:true,externalPaperRef:false,scrollable:true,minFlingVelocity:1e9});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);
   const scrollRect=await evaluate(`(()=>{const r=document.getElementById('touch-scroll').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()`);
   await touch([scrollRect[0]+scrollRect[2]-20,scrollRect[1]+35],[scrollRect[0]+20,scrollRect[1]+35]);
   assert.equal(await evaluate('document.getElementById("scene").dataset.open'),'true',name+' scroll owns the gesture');assert.equal(await evaluate('document.getElementById("touch-scroll").scrollLeft>0'),true,name+' native scrolling');
   await evaluate('window.renderDrawer({reset:61,keepMounted:true,externalPaperRef:false,disableSwipeToOpen:false,disableDiscovery:true,minFlingVelocity:1e9});'+settle);
   await wait(`document.querySelector('[data-testid="swipe-area"]')`);await touch([5,300],[220,300]);await wait('document.getElementById("scene").dataset.open==="true"');
   if(kind==='vpm'){
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".MuiBackdrop-root")).visibility==="visible"&&getComputedStyle(document.querySelector(".MuiBackdrop-root")).opacity==="1"&&!document.getElementById("drawer-root").hasAttribute("aria-hidden")'),true,name+' accepted opening is accessible');
    await touch([220,300],[20,300],{cancel:true});assert.equal(await evaluate('document.getElementById("scene").dataset.open'),'true',name+' cancellation');
    await evaluate('window.renderDrawer({reset:62,keepMounted:true,hold:true,minFlingVelocity:1e9});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);await touch([220,300],[10,300]);await evaluate('new Promise(r=>setTimeout(r,90))');
    assert.equal(await evaluate('document.getElementById("scene").dataset.open==="true"&&Math.abs(document.getElementById("drawer-paper").getBoundingClientRect().x)<1'),true,name+' controlled refusal snaps back');
   }
   await evaluate('window.renderDrawer({reset:64,keepMounted:true,externalPaperRef:false,minFlingVelocity:250});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);
   await touch([220,300],[110,300],{steps:3,delay:1});await wait('document.getElementById("scene").dataset.open==="false"');
   if(kind==='vpm'){
    await evaluate('window.renderDrawer({reset:65,keepMounted:true,disableBackdropTransition:true,minFlingVelocity:1e9});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:220,y:300,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:80,y:300,id:1}]});
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".MuiBackdrop-root")).opacity'),'1',name+' disabled backdrop transition');
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:80,y:300,id:1},{x:100,y:320,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await evaluate(settle);
    assert.equal(await evaluate('document.getElementById("scene").dataset.open'),'true',name+' multiple touches cancel');
    await evaluate(`window.consumed=0;document.getElementById('touch-surface').addEventListener('touchmove',e=>{window.consumed++;e.preventDefault()},{passive:false})`);
    await touch([220,20],[10,20]);assert.equal(await evaluate('window.consumed>0&&document.getElementById("scene").dataset.open==="true"'),true,name+' custom scrollbar owns prevented moves');

   }
   await evaluate('window.drawerControls.setOpen(false);'+settle);await evaluate('window.renderDrawer({iframe:true});'+settle);await evaluate('window.drawerControls.setOpen(true);'+settle);await wait('window.drawerControls.frameRef.current.contentDocument.querySelector(".MuiDrawer-paper")');
   assert.equal(await evaluate('window.drawerControls.paperRef.current.ownerDocument===window.drawerControls.frameRef.current.contentDocument'),true);assert.equal(await evaluate('window.drawerControls.frameRef.current.contentDocument.body.style.overflow'),'hidden');assert.notEqual(await evaluate('document.body.style.overflow'),'hidden');
   await evaluate('window.drawerControls.setOpen(false);'+settle);assert.equal(await evaluate('window.drawerControls.frameRef.current.contentDocument.body.style.overflow'),'');
   await evaluate('window.unmountDrawer();'+settle);assert.equal(await evaluate('window.drawerControls.rootRef.current===null&&window.drawerControls.paperRef.current===null'),true);
   await send('Emulation.resetPageScaleFactor');await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.hydratedPaper===document.querySelector(".MuiDrawer-paper")'),true);
  }
  if(!process.env.VPM_SWIPE_CONTROL)assert.deepEqual(captures[1],captures[0],version+' Drawer geometry, styling, physical RTL edges and theme');
 }
 assert.deepEqual(exceptions,[]);console.log('SwipeableDrawer: native touch across all edges/RTL, short swipes, scroll arbitration, opening, cancellation and controlled refusal; current/app four edges, variants, theme/RTL, focus/dismissal, nested ownership, retained nodes, slots, iframe and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
