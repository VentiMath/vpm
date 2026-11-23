'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,esbuild}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-consumer-gaps-'));
let server,child,socket,id=0;const pending=new Map(),errors=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./consumer-gaps-build.cjs');
 server=http.createServer((req,res)=>{if(req.url.endsWith('.js')){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(base+req.url.replace('.js','/consumer-gaps-browser.js')))}else res.end('<!doctype html><html><body><script src="'+req.url+'.js"></script></body></html>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method+' timed out')),45000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
 const settle='new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
 const draw=async p=>{await evaluate('window.draw('+JSON.stringify(p)+');window.events=[]');await evaluate(settle)};
 const key=async(key,code,n)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:n});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:n});await evaluate(settle)};
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const snapshots=[];
 for(const version of ['app','current'])for(const impl of ['upstream','vpm']){
  const name=version+'-'+impl;await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
  await evaluate('(async()=>{for(let i=0;i<500;i++){if(window.draw)return;await new Promise(r=>setTimeout(r,10))}throw Error("page not ready")})()');
  const values=[];
  for(const props of [{},{count:0},{page:2},{count:-1,page:1},{rows:-1,options:[-1]},{disabled:true}]){
   await draw({kind:'pagination',...props});values.push(await evaluate('({text:document.querySelector(".MuiTablePagination-displayedRows").textContent,buttons:[...document.querySelectorAll(".MuiTablePagination-actions button")].map(n=>[n.getAttribute("aria-label"),n.disabled])})'));
  }
  await draw({kind:'pagination'});await evaluate('[...document.querySelectorAll("button")].find(n=>n.getAttribute("aria-label")==="Go to next page").click()');values.push(await evaluate('window.events'));
  await draw({kind:'pagination',...(version==='app'?{SelectProps:{native:true}}:{slotProps:{select:{native:true}}})});await evaluate('const s=document.querySelector("select");s.value="25";s.dispatchEvent(new Event("change",{bubbles:true}))');values.push(await evaluate('window.events'));
  await draw({kind:'focus',open:false});await evaluate('document.querySelector("#outside").focus()');await draw({kind:'focus',open:true});
  assert.equal(await evaluate('document.activeElement.id'),'trap',name+' autofocus');
  assert.equal(await evaluate('document.querySelector("#outside").closest("[aria-hidden=true]")===null'),true,name+' no sibling hiding');
  await evaluate('document.querySelector("#last").focus()');await key('Tab','Tab',9);assert.equal(await evaluate('document.activeElement.id'),'first');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});await evaluate(settle);assert.equal(await evaluate('document.activeElement.id'),'last');
  await evaluate('document.querySelector("#outside").focus()');await evaluate(settle);assert.ok(await evaluate('document.querySelector("#trap").contains(document.activeElement)'),name+' containment');
  await draw({kind:'focus',open:false});assert.equal(await evaluate('document.activeElement.id'),'outside',name+' restore');
  await draw({kind:'focus',open:true,disableAutoFocus:true});assert.equal(await evaluate('document.activeElement.id'),'outside');
  await draw({kind:'fade',open:true});assert.equal(await evaluate('getComputedStyle(document.querySelector("#faded")).opacity'),'1');await draw({kind:'fade',open:false});await evaluate('new Promise(r=>setTimeout(r,20))');assert.equal(await evaluate('getComputedStyle(document.querySelector("#faded")).visibility'),'hidden');
  await draw({kind:'auto'});await evaluate('document.querySelector("input").focus()');await key('ArrowDown','ArrowDown',40);await key('ArrowDown','ArrowDown',40);await key('Enter','Enter',13);values.push(await evaluate('({value:document.querySelector("input").value,events:window.events})'));
  // Dismount hook state before the controlled input / filter / clear trace.
  await draw({kind:'pagination'});await draw({kind:'auto',autoHighlight:true});await evaluate('const input=document.querySelector("input");input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"So");input.dispatchEvent(new Event("input",{bubbles:true}))');await evaluate(settle);await key('Enter','Enter',13);values.push(await evaluate('({value:document.querySelector("input").value,events:window.events})'));await evaluate('[...document.querySelectorAll("button")].find(n=>n.textContent==="Clear").click()');values.push(await evaluate('window.events'));
  await draw({kind:'tabs',value:0});await evaluate('new Promise(r=>setTimeout(r,100))');await draw({kind:'tabs',value:7});await evaluate('new Promise(r=>setTimeout(r,600))');assert.ok(await evaluate('(()=>{const s=document.querySelector(".MuiTabs-scroller"),t=document.querySelector("[aria-selected=true]"),a=s.getBoundingClientRect(),b=t.getBoundingClientRect();return b.left>=a.left-1&&b.right<=a.right+1})()'),name+' selected learner revealed');
  await draw({kind:'tabs',value:0});assert.ok(await evaluate('document.querySelector(".MuiTabs-scroller").scrollWidth>document.querySelector(".MuiTabs-scroller").clientWidth'),name+' overflow');
  await evaluate('[...document.querySelectorAll(".MuiTabs-scrollButtons")].filter(n=>!n.classList.contains("Mui-disabled")&&!n.disabled).at(-1).click()');await evaluate('new Promise(r=>setTimeout(r,600))');assert.ok(await evaluate('document.querySelector(".MuiTabs-scroller").scrollLeft>0'),name+' scroll button');
  await draw({kind:'popover'});assert.equal(await evaluate('document.querySelector(".MuiPopover-root").tagName'),'SECTION',name+' custom Popover root');
  if(impl==='vpm')assert.deepEqual(values,snapshots.at(-1).values,name+' pagination and hook match');
  snapshots.push({name,values});
 }
 assert.deepEqual(errors,[]);console.log('Four browser controls passed: pagination, focus trapping/restoration, Fade, hook keyboard/filter/clear and scrollable learner Tabs');
 }finally{esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}})().catch(e=>{console.error(e,errors);process.exitCode=1});
