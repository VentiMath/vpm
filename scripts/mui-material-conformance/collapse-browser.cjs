"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-collapse-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./collapse-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/collapse-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/collapse-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 const phase=state=>wait(`document.querySelector('#live')?.classList.contains('MuiCollapse-${state}')`);
 const snapshot=`[...document.querySelectorAll('#cases > .MuiCollapse-root,#cases > .MuiCollapse-root > div,#cases > .MuiCollapse-root > div > div')].map(el=>({id:el.id,tag:el.tagName,css:Object.fromEntries(['display','width','height','minWidth','minHeight','overflow','visibility','paddingLeft','paddingRight','borderLeftWidth','borderRadius','backgroundColor','transitionProperty','transitionDuration','transitionTimingFunction'].map(k=>[k,getComputedStyle(el)[k]]))}))`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await wait('window.collapseControls');
   if(version==='current')assert.equal(await evaluate('window.collapseControls.wrapRef.current===document.querySelector("#live > .MuiCollapse-wrapper")'),true);
   const styles=[];
   for(const mode of ['light','dark'])for(const custom of [false,true])for(const rtl of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,custom,rtl})+');'+settle);styles.push(await evaluate(snapshot));
   }
   captures.push(styles);comparisons+=styles.length;
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.collapseControls.ref.current===document.getElementById("live")'),true);
   await evaluate('window.saved=document.getElementById("content");window.collapseControls.setOpen(true)');await phase('entered');
   assert.equal(await evaluate('window.saved===document.getElementById("content")'),true);
   assert.equal(await evaluate('document.getElementById("live").style.height'),'auto');
   assert.equal(await evaluate('document.getElementById("live").getBoundingClientRect().height'),120);
   await evaluate('document.getElementById("focus").focus();window.collapseControls.setHeight(220);window.renderVariants({tick:3});'+settle);
   assert.equal(await evaluate('document.getElementById("live").getBoundingClientRect().height'),220);
   assert.equal(await evaluate('window.saved===document.getElementById("content")&&document.activeElement.id==="focus"'),true);
   await evaluate('window.collapseControls.setOpen(false)');await phase('hidden');
   assert.equal(await evaluate('window.saved===document.getElementById("content")'),true);
   const events=await evaluate('window.collapseControls.events.current');
   assert.deepEqual(events.map(x=>x.name),['onEnter','onEntering','onEntered','onExit','onExiting','onExited']);assert(events.every(x=>x.node));
   assert.equal(events[1].height,'120px');assert.equal(events[1].duration,'60ms');assert.equal(events[4].height,'0px');
   // Reverse during a long animation: its abandoned timer must never exit later.
   await evaluate('window.collapseControls.setConfig({timeout:500});window.collapseControls.setOpen(true)');await wait('window.collapseControls.events.current.at(-1)?.name==="onEntering"');
   await evaluate('window.collapseControls.setOpen(false)');await wait('window.collapseControls.events.current.at(-1)?.name==="onExiting"');
   await evaluate('window.collapseControls.setConfig({timeout:30});window.collapseControls.setOpen(true)');await phase('entered');
   await evaluate('new Promise(r=>setTimeout(r,550))');assert.equal(await evaluate('window.collapseControls.events.current.at(-1).name'),'onEntered');
   // Automatic duration uses the resolved theme, and phase callbacks get nodes.
   await evaluate('window.collapseControls.setConfig({timeout:"auto"});window.collapseControls.setOpen(false)');await phase('hidden');
   assert.equal(await evaluate('window.collapseControls.events.current.at(-2).duration'),'288ms');
   await evaluate('window.collapseControls.setOpen(true)');await phase('entered');
   // End listener can complete early; later completions cannot fire twice.
   await evaluate('window.collapseControls.setConfig({timeout:1000,listener:true});window.collapseControls.setOpen(false)');await wait('window.collapseControls.ends.current.length>0');
   await evaluate('window.collapseControls.ends.current.at(-1)()');await phase('hidden');
   const exits=await evaluate('window.collapseControls.events.current.filter(e=>e.name==="onExited").length');await evaluate('window.collapseControls.ends.current.at(-1)();'+settle);assert.equal(await evaluate('window.collapseControls.events.current.filter(e=>e.name==="onExited").length'),exits);
   // Width-based measurement must return to natural sizing after entering.
   await evaluate('window.collapseControls.setConfig({orientation:"horizontal",timeout:40});window.collapseControls.setOpen(true)');await phase('entered');
   assert.equal(await evaluate('document.getElementById("live").style.width'),'auto');
   assert.equal(await evaluate('window.collapseControls.events.current.at(-2).width'),'180px');
   await evaluate('window.collapseControls.setConfig({timeout:30,unmountOnExit:true});window.collapseControls.setOpen(false)');await wait('!document.getElementById("live")');
   assert.equal(await evaluate('window.collapseControls.ref.current'),null);
   await evaluate('window.collapseControls.setOpen(true)');await phase('entered');assert.equal(await evaluate('window.saved===document.getElementById("content")'),false);
   // Current Material reduced-motion policy, with explicit opt-out.
   if(version==='current'){
    await evaluate('window.renderVariants({reduced:"always"});window.collapseControls.setConfig({timeout:1500});window.collapseControls.setOpen(false)');await phase('hidden');
    assert.equal(await evaluate('window.collapseControls.events.current.at(-2).duration'),'0ms');
    await evaluate('window.collapseControls.setConfig({timeout:30,disablePrefersReducedMotion:true});window.collapseControls.setOpen(true)');await phase('entered');
    assert.equal(await evaluate('window.collapseControls.events.current.at(-2).duration'),'30ms');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await evaluate('window.renderVariants({reduced:"system"});window.collapseControls.setConfig({timeout:1500});window.collapseControls.setOpen(false)');await phase('hidden');
    assert.equal(await evaluate('window.collapseControls.events.current.at(-2).duration'),'0ms');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});

   }
   // Appearance transitions and unmount during an unfinished animation.
   await evaluate('window.collapseControls.setMounted(false);'+settle);
   await evaluate('window.renderVariants({});window.collapseControls.setConfig({appear:true,timeout:40});window.collapseControls.setOpen(true);window.collapseControls.setMounted(true)');await phase('entered');
   assert.equal(await evaluate('window.collapseControls.events.current.at(-1).appearing'),true);
   await evaluate('window.collapseControls.setConfig({timeout:1000});window.collapseControls.setOpen(false)');await wait('window.collapseControls.events.current.at(-1)?.name==="onExiting"');
   const count=await evaluate('window.collapseControls.events.current.length');
   await evaluate('window.unmountVariants();'+settle);await evaluate('new Promise(r=>setTimeout(r,1050))');assert.equal(await evaluate('window.collapseControls.events.current.length'),count);assert.equal(await evaluate('window.collapseControls.ref.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);comparisons+=27;
  }
  assert.deepEqual(captures[1],captures[0],version+' settled layout and theme styles');
 }
 assert.deepEqual(exceptions,[]);console.log('Collapse current/app layout, lifecycle, reversal, content identity/focus, automatic/horizontal sizing, unmount, reduced-motion and hydration checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
