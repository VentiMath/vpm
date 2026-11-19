"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-list-button-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./list-button-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/list-button-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/list-button-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}).catch(e=>{throw Error(e.message+' while evaluating '+expression.slice(0,240))});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};


 const settle='(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));for(const a of document.getAnimations())a.finish();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})()';
 const wait=c=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${c})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(c)})})()`);
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 // Compare color pixels: rgba and relative-color serialization can differ for the same sRGB value.
 const snapshot=`(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});const pixel=v=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].join(',')};const keys=['display','minWidth','fontSize','fontWeight','lineHeight','padding','marginTop','marginBottom','alignItems','textAlign','color','backgroundColor','borderBottomWidth','borderRadius','transitionDuration'];return [...document.querySelectorAll('#sample,#sample .MuiListItemIcon-root,#sample .MuiListItemText-root,#sample .MuiTypography-root')].map(el=>({tag:el.tagName,css:Object.fromEntries(keys.map(k=>[k,['color','backgroundColor'].includes(k)?pixel(getComputedStyle(el)[k]):getComputedStyle(el)[k]]))}))})()`;
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.listButtonControls');const rows=[];
   const matrix=[];for(const mode of ['light','dark'])for(const variables of [false,true])for(const rtl of [false,true])for(const dense of [false,true])for(const parentDense of [false,true])for(const alignItems of ['center','flex-start'])matrix.push({mode,variables,rtl,dense,parentDense,alignItems});
   for(const variables of [false,true])for(const selected of [false,true])for(const disabled of [false,true])for(const disableGutters of [false,true])matrix.push({variables,selected,disabled,disableGutters,divider:true,custom:true});
   for(const props of matrix){await evaluate('window.renderListButton('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;}
   captures.push(rows);await evaluate('window.renderListButton({});'+settle);
   assert.equal(await evaluate('window.listButtonControls.ref.current===document.getElementById("sample")'),true);
   await evaluate('document.getElementById("before").focus()');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await evaluate(settle);
   assert.equal(await evaluate('document.activeElement.id'),'sample');assert.equal(await evaluate('document.getElementById("sample").classList.contains("keyboard-ring")'),true);
   const key=async(key,code,windowsVirtualKeyCode)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode});await evaluate(settle)};
   await key(' ','Space',32);await key('Enter','Enter',13);
   assert.deepEqual(await evaluate('window.listButtonControls.events'),['action','action']);
   await evaluate('window.savedListButton=document.getElementById("sample");window.renderListButton({tick:1,selected:true});'+settle);
   assert.equal(await evaluate('window.savedListButton===document.getElementById("sample")&&document.activeElement===window.savedListButton'),true);
   await evaluate('document.getElementById("router").focus()');await key('Enter','Enter',13);assert.equal(await evaluate('window.listButtonControls.events.at(-1)'),'route');
   await evaluate('document.getElementById("blocked").click();'+settle);assert.equal(await evaluate('window.listButtonControls.events.includes("blocked")'),version==='app'&&kind==='upstream','Current Material and VPM suppress programmatic disabled clicks; app7 does not');
   await evaluate('document.getElementById("native").focus()');await key(' ','Space',32);assert.equal(await evaluate('window.listButtonControls.events.at(-1)'),'native');
   await evaluate('window.renderListButton({autoFocus:true});'+settle);assert.equal(await evaluate('document.activeElement.id'),'sample');
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='link'&&n.name?.value==='Contest directory'));assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Contests Current season'));
   await evaluate('window.unmountListButton();'+settle);assert.equal(await evaluate('window.listButtonControls.ref.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  const differences=[];for(let i=0;i<captures[0].length;i++)for(let n=0;n<captures[0][i].value.length;n++){const u=captures[0][i].value[n],v=captures[1][i].value[n];for(const key of Object.keys(u.css))if(u.css[key]!==v.css[key])differences.push({props:captures[0][i].props,position:n,key,upstream:u.css[key],vpm:v.css[key]});}
  fs.writeFileSync(base+'/list-button-'+version+'-differences.json',JSON.stringify(differences,null,2));const legacyIcon = d=>version==='app'&&!d.props.custom&&d.position===1&&d.key==='minWidth'&&d.upstream==='56px'&&d.vpm==='36px';if(version==='app')assert.equal(differences.filter(legacyIcon).length,64,'Current icon width is 36px; app7 default was 56px');assert.deepEqual(differences.filter(d=>!legacyIcon(d)).slice(0,12),[],version+' ListItemButton computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' ListItemButton theme/density/state snapshots plus navigation, native/custom roots, keyboard activation/focus, disabled handling, retained DOM/ref, autofocus and hydration checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
