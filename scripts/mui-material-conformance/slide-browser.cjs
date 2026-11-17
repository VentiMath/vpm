"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-slide-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./slide-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/slide-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/slide-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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

 const phase=state=>wait(`window.slideControls.events.current.at(-1)?.name===${JSON.stringify('on'+state)}`);
 const bounds=`(()=>{const n=document.getElementById('live'),r=n.getBoundingClientRect();return [r.left,r.top,r.width,r.height].map(v=>Math.round(v*100)/100).concat(getComputedStyle(n).visibility)})()`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   await send('Emulation.setDeviceMetricsOverride',{width:960,height:800,deviceScaleFactor:1,mobile:false});const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.slideControls');await evaluate(settle);
   const styles=[];
   assert.equal(await evaluate('window.slideControls.ref.current===document.getElementById("live")&&window.slideControls.childRef.current===document.getElementById("live")'),true);
   for(const bounded of [false,true])for(const direction of ['left','right','up','down']){
    await evaluate('window.slideControls.setConfig('+JSON.stringify({bounded,direction,timeout:0})+');'+settle);await evaluate('new Promise(r=>setTimeout(r,200))');styles.push(await evaluate(bounds));
    await evaluate('window.slideControls.setOpen(true)');await phase('Entered');styles.push(await evaluate(bounds));
    await evaluate('window.slideControls.setOpen(false)');await phase('Exited');styles.push(await evaluate(bounds));
   }
   // Geometry must not count an existing translation twice.
   for(const direction of ['left','right','up','down']){
    await evaluate('window.slideControls.setMounted(false);'+settle);await evaluate('window.slideControls.setConfig('+JSON.stringify({translated:true,direction,timeout:0})+');window.slideControls.setMounted(true);'+settle);styles.push(await evaluate(bounds));
   }
   captures.push(styles);
   await evaluate('window.slideControls.setMounted(false);'+settle);await evaluate('window.slideControls.setConfig({direction:"left",timeout:60});window.slideControls.setMounted(true);window.slideControls.events.current=[];'+settle);
   await evaluate('window.saved=document.getElementById("live");window.slideControls.setOpen(true)');await phase('Entered');await evaluate('document.getElementById("draft").focus();document.getElementById("draft").value="Unsaved";window.renderVariants({tick:3});'+settle);
   assert.equal(await evaluate('window.saved===document.getElementById("live")&&document.activeElement.id==="draft"&&document.getElementById("draft").value==="Unsaved"'),true);
   await evaluate('window.slideControls.setOpen(false)');await phase('Exited');
   const events=await evaluate('window.slideControls.events.current');assert.deepEqual(events.map(x=>x.name),['onEnter','onEntering','onEntered','onExit','onExiting','onExited']);assert(events.every(x=>x.node));assert.equal(events[1].duration,'60ms');assert.equal(events[1].transform,'none');assert.equal(events[5].duration,'');
   await evaluate('window.slideControls.setConfig({timeout:{enter:35,exit:45},easing:{enter:"linear",exit:"ease-in"}});window.slideControls.setOpen(true)');await phase('Entered');assert.equal(await evaluate('window.slideControls.events.current.at(-2).duration'),'35ms');assert.equal(await evaluate('window.slideControls.events.current.at(-2).curve'),'linear');await evaluate('window.slideControls.setOpen(false)');await phase('Exited');assert.equal(await evaluate('window.slideControls.events.current.at(-2).duration'),'45ms');assert.equal(await evaluate('window.slideControls.events.current.at(-2).curve'),'ease-in');
   await evaluate('window.slideControls.setConfig({direction:"left",timeout:40,style:{transitionDuration:"17ms"}});window.slideControls.setOpen(true)');await phase('Entered');assert.equal(await evaluate('window.slideControls.events.current.at(-2).duration'),'17ms');await evaluate('window.slideControls.setOpen(false)');await phase('Exited');
   // Resize a closed slide and confirm that its entry edge follows the viewport.
   await send('Emulation.setDeviceMetricsOverride',{width:700,height:600,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(r=>setTimeout(r,250))');assert.equal((await evaluate(bounds))[0],700);
   await send('Emulation.setDeviceMetricsOverride',{width:960,height:800,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(r=>setTimeout(r,250))');
   if(kind==='vpm'){await evaluate('window.slideControls.setConfig({bounded:true,direction:"left",timeout:0});'+settle);await evaluate('document.getElementById("boundary").style.width="400px";'+settle);assert.equal((await evaluate(bounds))[0],460);}
   // Both the timeout fallback and listener share a cancellation boundary.
   await evaluate('window.slideControls.setConfig({timeout:500});window.slideControls.setOpen(true)');await phase('Entering');await evaluate('window.slideControls.setOpen(false)');await phase('Exiting');await evaluate('window.slideControls.setConfig({timeout:30});window.slideControls.setOpen(true)');await phase('Entered');await evaluate('new Promise(r=>setTimeout(r,550))');assert.equal(await evaluate('window.slideControls.events.current.at(-1).name'),'onEntered');
   await evaluate('window.slideControls.setConfig({timeout:1000,listener:true});window.slideControls.setOpen(false)');await wait('window.slideControls.ends.current.length');await evaluate('window.slideControls.ends.current.at(-1)()');await phase('Exited');const ended=await evaluate('window.slideControls.events.current.length');await evaluate('window.slideControls.ends.current.at(-1)();'+settle);assert.equal(await evaluate('window.slideControls.events.current.length'),ended);
   await evaluate('window.slideControls.setConfig({timeout:30,unmountOnExit:true});'+settle);await wait('!document.getElementById("live")');assert.equal(await evaluate('window.slideControls.ref.current'),null);await evaluate('window.slideControls.setOpen(true)');await phase('Entered');assert.equal(await evaluate('window.saved===document.getElementById("live")'),false);
   if(version==='current'){
    await evaluate('window.renderVariants({reduced:"always"});window.slideControls.setConfig({timeout:1500});window.slideControls.setOpen(false)');await phase('Exited');assert.equal(await evaluate('parseFloat(window.slideControls.events.current.at(-2).duration)'),0);
    await evaluate('window.slideControls.setConfig({timeout:30,disablePrefersReducedMotion:true});window.slideControls.setOpen(true)');await phase('Entered');assert.equal(await evaluate('window.slideControls.events.current.at(-2).duration'),'30ms');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate('window.renderVariants({reduced:"system"});window.slideControls.setConfig({timeout:1500});window.slideControls.setOpen(false)');await phase('Exited');assert.equal(await evaluate('parseFloat(window.slideControls.events.current.at(-2).duration)'),0);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
   }
   // Unchanged app-shaped panels: legacy transition prop and current slot,
   // theme-driven RTL direction, fixed paper widths, no visible backdrop.
   const panels=[];
   for(const rtl of [false,true])for(const panel of ['settings','themes']){if(version==='current'&&kind==='upstream'&&panel==='settings')continue;
    await evaluate('window.renderVariants('+JSON.stringify({rtl})+');window.slideControls.setPanel('+JSON.stringify(panel)+');'+settle);
    for(const width of [360,960]){await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false});await evaluate('window.slideControls.setDialog(true);'+settle);await wait('document.getElementById("panel-draft")');await evaluate(settle);
     const geometry=await evaluate(`(()=>{const p=document.querySelector('.MuiDialog-paper'),r=p.getBoundingClientRect(),c=getComputedStyle(p);return [r.x,r.width,r.height,c.backgroundColor,c.borderRadius,getComputedStyle(document.querySelector('.MuiBackdrop-root')).backgroundColor].map(x=>typeof x==='number'?Math.round(x*100)/100:x)})()`);if(panel==='themes'||version==='app')panels.push(geometry);
     await evaluate('window.panelNode=document.getElementById("panel-draft");panelNode.focus();panelNode.value="Keep panel draft";window.renderVariants('+JSON.stringify({rtl,tick:9})+');'+settle);assert.equal(await evaluate('window.panelNode===document.getElementById("panel-draft")&&document.activeElement===window.panelNode&&panelNode.value==="Keep panel draft"'),true);
     await evaluate('document.getElementById("close").click();'+settle);await wait('!document.getElementById("panel-draft")');assert.equal(await evaluate('document.body.style.overflow'),'');
    }
   }
   captures.push(panels);
   await evaluate('window.mountFrame();'+settle);await wait('document.getElementById("slide-frame").contentWindow.slideControls');await evaluate('window.fd=document.getElementById("slide-frame").contentDocument;fd.defaultView.slideControls.setConfig({direction:"left",timeout:0});'+settle);await evaluate('new Promise(r=>setTimeout(r,250))');assert.equal(await evaluate('Math.round(fd.getElementById("live").getBoundingClientRect().left)'),await evaluate('fd.defaultView.innerWidth'));await evaluate('window.removeFrame();'+settle);
   await evaluate('window.renderVariants({});window.slideControls.setMounted(false);'+settle);await evaluate('window.slideControls.setConfig({appear:true,timeout:30});window.slideControls.setOpen(true);window.slideControls.setMounted(true)');await phase('Entered');assert.equal(await evaluate('window.slideControls.events.current.at(-1).appearing'),true);
   await evaluate('window.slideControls.setConfig({timeout:1000});window.slideControls.setOpen(false)');await phase('Exiting');const count=await evaluate('window.slideControls.events.current.length');await evaluate('window.unmountVariants();'+settle);await evaluate('new Promise(r=>setTimeout(r,1050))');assert.equal(await evaluate('window.slideControls.events.current.length'),count);assert.equal(await evaluate('window.slideControls.ref.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  fs.writeFileSync(path.join(os.tmpdir(),'vpm-slide-'+version+'.json'),JSON.stringify(captures));assert.deepEqual(captures[2],captures[0],version+' slide edge geometry');assert.deepEqual(captures[3],captures[1],version+' settings panel geometry');
 }
 assert.deepEqual(exceptions,[]);console.log('Slide current/app geometry, lifecycle, interruption, refs/drafts, responsive RTL settings panels, iframe ownership, reduced motion and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
