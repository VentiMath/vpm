"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-tooltip-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./tooltip-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/tooltip-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/tooltip-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:960,height:900,deviceScaleFactor:1,mobile:false});
 const wait=ms=>evaluate('new Promise(r=>setTimeout(r,'+ms+'))');
 const ready=()=>evaluate("(async()=>{for(let i=0;i<300;i++){if(window.tooltipControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Tooltip fixture unavailable')})()");
 const options=async p=>{await evaluate('window.tooltipControls.setOptions('+JSON.stringify(p)+');'+settle);await wait(250)};
 const shown=()=>evaluate('!!document.querySelector("[role=tooltip]")');
 const mouse=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p})};
 const snapshot=`(()=>{const el=document.querySelector('.MuiTooltip-tooltip'),r=el.getBoundingClientRect();return {text:el.textContent,placement:document.querySelector('[role=tooltip]').dataset.popperPlacement,css:Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','padding','backgroundColor','color','borderRadius','maxWidth'].map(k=>[k,getComputedStyle(el)[k]])),rect:[r.x,r.y,r.width,r.height].map(n=>Math.round(n))}})()`;
 const captures={};let checks=0;
 for(const version of ['current','app'])for(const kind of ['upstream','vpm']){
  const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await ready();
  captures[name]=[];
  for(const mode of ['light','dark'])for(const variables of [false,true])for(const custom of [false,true]){
   await evaluate('window.renderVariants('+JSON.stringify({mode,variables,custom})+');'+settle);
   for(const placement of ['top','bottom','left','right']){
    await options({open:true,arrow:true,placement});assert.equal(await shown(),true);
    const v=await evaluate(snapshot);captures[name].push({mode,variables,custom,placement,...v});checks++;
   }
  }
  await evaluate('window.renderVariants({});'+settle);await options({open:true,arrow:true,slotProps:{popper:{placement:'top'},tooltip:{'data-slot':'copy'}}});
  assert.equal(await evaluate('document.querySelector("[role=tooltip]").dataset.popperPlacement'),'top');
  assert.equal(await evaluate('document.querySelector("[data-slot=copy]").textContent'),'Copied!');
  assert.equal(await evaluate('window.tooltipControls.ref.current===document.getElementById("trigger")&&window.tooltipControls.childRef.current===document.getElementById("trigger")'),true);
  await evaluate('window.saved=document.getElementById("trigger");window.saved.focus();window.renderVariants({tick:5});'+settle);
  assert.equal(await evaluate('window.saved===document.getElementById("trigger")&&document.activeElement===window.saved'),true);
  await options({open:true,title:'',arrow:true});assert.equal(await shown(),false);
  await options({open:true,title:0});assert.equal(await evaluate('document.querySelector("[role=tooltip]").textContent'),'0');
  await options({open:true,title:'Extra',describeChild:true});assert.equal(await evaluate('document.getElementById("trigger").getAttribute("aria-describedby")'),'tip');
  await options({enterDelay:100,enterNextDelay:100});await mouse('#before');await evaluate('document.getElementById("before").focus()');await wait(300);
  await mouse('#trigger');await wait(15);assert.equal(await shown(),false,'hover delay '+name);await wait(300);assert.equal(await shown(),true,'hover opens '+name);
  assert.equal(await evaluate('document.activeElement.id'),'before','hover must not steal focus');
  await mouse('[role=tooltip]');await wait(60);assert.equal(await shown(),true,'interactive hover');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await wait(300);assert.equal(await shown(),false,'Escape');
  await mouse('#after');await evaluate('document.getElementById("before").focus()');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await wait(350);
  assert.equal(await evaluate('document.activeElement.id'),'trigger');assert.equal(await shown(),true,'keyboard focus');
  await evaluate('document.getElementById("after").focus()');await wait(350);assert.equal(await shown(),false,'blur');
  await options({disableHoverListener:true,disableFocusListener:true});await mouse('#trigger');await wait(300);assert.equal(await shown(),false,'disabled listeners');
  await options({enterTouchDelay:50,leaveTouchDelay:70});await mouse('#after');
  await evaluate('document.getElementById("trigger").dispatchEvent(new TouchEvent("touchstart",{bubbles:true}))');await wait(350);assert.equal(await shown(),true,'long press');
  await evaluate('document.getElementById("trigger").dispatchEvent(new TouchEvent("touchend",{bubbles:true}))');await wait(400);assert.equal(await shown(),false,'touch dismissal');
  await options({enterDelay:100,enterNextDelay:100});await mouse('#trigger');await evaluate('window.tooltipControls.setMounted(false)');await wait(300);assert.equal(await shown(),false,'pending timer unmount');
  assert.equal(await evaluate('window.tooltipControls.ref.current===null&&window.tooltipControls.childRef.current===null'),true);
  checks+=18;
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await evaluate("(async()=>{for(let i=0;i<300&&!window.hydrationReady;i++)await new Promise(r=>setTimeout(r,20))})()");await evaluate(settle);
  assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);checks++;
 }
 for(const version of ['current','app'])for(let i=0;i<captures[version+'-upstream'].length;i++){
  const up=captures[version+'-upstream'][i],own=captures[version+'-vpm'][i];
  for(let j=0;j<4;j++)assert.ok(Math.abs(up.rect[j]-own.rect[j])<=1,version+' geometry '+JSON.stringify({up,own}));
  assert.deepEqual({...own,rect:null},{...up,rect:null},version+' styles');
 }
 // Owned lifecycle: preserve custom ref cleanup, portal to an iframe, and cancel touch timers.
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/current-vpm'});await ready();
 await evaluate("window.refEvents=[];window.tooltipControls.setOptions({open:true,arrow:true,slotProps:{tooltip:{ref:n=>{window.refEvents.push(!!n);return ()=>window.refEvents.push('cleanup')}}}});"+settle);await wait(250);
 await evaluate('window.tooltipControls.setMounted(false);'+settle);assert.equal(await evaluate('window.refEvents.filter(x=>x===true).length===window.refEvents.filter(x=>x==="cleanup").length&&window.refEvents.length>0'),true);
 await evaluate('window.tooltipControls.setMounted(true);window.tooltipControls.setOptions({enterTouchDelay:100});'+settle);
 await evaluate('document.getElementById("trigger").dispatchEvent(new TouchEvent("touchstart",{bubbles:true}));document.getElementById("trigger").dispatchEvent(new TouchEvent("touchcancel",{bubbles:true}))');await wait(300);assert.equal(await shown(),false);assert.equal(await evaluate('document.getElementById("trigger").style.webkitUserSelect'),'');
 await options({open:true,arrow:true,placement:'top'});await evaluate('document.getElementById("trigger").style.cssText="position:fixed;top:0;left:200px";window.dispatchEvent(new Event("resize"));'+settle);await wait(200);
 assert.equal(await evaluate('document.querySelector("[role=tooltip]").dataset.popperPlacement'),'bottom','viewport edge flips');
 await evaluate('document.getElementById("trigger").style.cssText="margin:30px"');
 await options({open:true,followCursor:true});await mouse('#trigger');await wait(100);const cursorX=await evaluate('document.querySelector("[role=tooltip]").getBoundingClientRect().x');
 const pointer=await evaluate('(()=>{const r=document.getElementById("trigger").getBoundingClientRect();return {x:r.x+r.width/2+5,y:r.y+r.height/2}})()');await send('Input.dispatchMouseEvent',{type:'mouseMoved',...pointer});await wait(100);
 assert.ok(Math.abs(await evaluate('document.querySelector("[role=tooltip]").getBoundingClientRect().x')-cursorX-5)<=1,'cursor follows pointer');
 await options({open:false,slotProps:{popper:{keepMounted:true}}});assert.equal(await evaluate('getComputedStyle(document.querySelector("[role=tooltip]")).visibility'),'hidden');
 await options({open:false});
 await evaluate('window.mountFrame();'+settle);await wait(400);
 assert.equal(await evaluate('!!document.getElementById("frame").contentDocument.querySelector("[role=tooltip]")'),true);
 assert.equal(await shown(),false,'iframe portal stays in its document');
 await evaluate('window.unmountFrame();window.unmountVariants();'+settle);checks+=8;
 assert.deepEqual(exceptions,[]);console.log(checks+' Tooltip browser styling, placement, keyboard/hover/touch, stable DOM/ref, iframe and hydration checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
