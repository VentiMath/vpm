"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-chip-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./chip-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/chip-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/chip-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle='new Promise(r=>setTimeout(r,350))';
 await send('Runtime.enable');await send('Accessibility.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 const key=async(key,code)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code});await evaluate(settle)};
 const click=async selector=>{await evaluate('document.querySelector('+JSON.stringify(selector)+').dispatchEvent(new MouseEvent("click",{bubbles:true}));'+settle)};
 const snapshot=`(()=>{const ctx=document.createElement('canvas').getContext('2d');const color=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};const keys=['display','height','width','paddingTop','paddingRight','paddingLeft','marginLeft','marginRight','color','backgroundColor','opacity','borderRadius','borderTopWidth','borderTopColor','fontSize','lineHeight','whiteSpace'];return [...document.querySelectorAll('#chips .MuiChip-root,#chips .MuiChip-label,#chips .MuiChip-avatar,#chips .MuiChip-icon,#chips .MuiChip-deleteIcon')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,/color$/i.test(k)?color(getComputedStyle(el)[k]):getComputedStyle(el)[k]]))}))})()`;
 for(const version of ['current','app']){
  const captures=[],eventTraces=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.chipControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Chip fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom})+');'+settle);styles.push(await evaluate(snapshot));
   }
   captures.push(styles);comparisons+=styles.length;
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.chipControls.refs.current.select===document.getElementById("select")'),true);
   assert.equal(await evaluate('window.chipControls.refs.current.label===document.querySelector("#slots .MuiChip-label")'),true);
   await click('#select');assert.equal(await evaluate('document.getElementById("select").classList.contains("MuiChip-colorPrimary")'),true);
   await evaluate('document.getElementById("select").focus();'+settle);await key(' ',32);await key('Enter',13);
   await click('#remove .MuiChip-deleteIcon');await click('#custom-delete .MuiChip-deleteIcon');
   await evaluate('document.getElementById("remove").focus();'+settle);await key('Backspace',8);await key('Delete',46);
   await key('Escape',27);assert.equal(await evaluate('document.activeElement===document.getElementById("remove")'),true);
   await evaluate('document.querySelector("#nested input").focus();'+settle);await key('Backspace',8);
   assert.equal(await evaluate('window.chipControls.events.current.includes("nested-delete")'),false);
   await evaluate('document.getElementById("remove").dispatchEvent(new DragEvent("dragstart",{bubbles:true}));'+settle);
   await click('#plain-click');eventTraces.push(await evaluate('window.chipControls.events.current.splice(0)'));
   assert.equal(await evaluate('document.getElementById("skip").tabIndex'),-1);
   await evaluate('window.savedChip=document.getElementById("select");document.getElementById("select").focus();window.renderVariants({tick:2});'+settle);assert.equal(await evaluate('window.savedChip===document.getElementById("select")&&document.activeElement===window.savedChip'),true);
   if(kind==='upstream'){
    await evaluate('document.getElementById("disabled-delete").focus();'+settle);await key('Delete',46);assert.deepEqual(await evaluate('window.chipControls.events.current.splice(0)'),['disabled-delete']);
   }
   if(kind==='vpm'){
    await click('#disabled .MuiChip-deleteIcon');await click('#disabled-delete .MuiChip-deleteIcon');await evaluate('document.getElementById("disabled-delete").focus();'+settle);await key('Delete',46);assert.deepEqual(await evaluate('window.chipControls.events.current.splice(0)'),[]);
    const ax=await send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Contest interest'));assert.ok(ax.nodes.some(n=>n.name?.value==='Disabled removal'&&n.properties?.some(p=>p.name==='disabled'&&p.value.value===true)));
   }
   comparisons+=14;
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('window.chipControls.refs.current.select'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);comparisons++;
  }
  assert.deepEqual(eventTraces[1],eventTraces[0],version+' click/delete/keyboard/drag callbacks');
  for(let i=0;i<captures[0].length;i++)for(let j=0;j<captures[0][i].length;j++)assert.deepEqual(captures[1][i][j],captures[0][i][j],version+' computed styles variant '+i+' node '+j);
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' Chip click/delete, keyboard, disabled, refs, hydration and computed-style checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
