"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-alert-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./alert-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/alert-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/alert-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}).catch(e=>{throw Error(e.message+' while evaluating '+expression.slice(0,240))});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};


 const settle='new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
 const wait=c=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${c})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(c)})})()`);
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const snapshot=`(()=>{const keys=['display','padding','margin','fontSize','fontFamily','fontWeight','lineHeight','letterSpacing','opacity','color','backgroundColor','borderRadius','borderTopColor','borderTopWidth','borderTopStyle','whiteSpace','minWidth','overflow','alignItems'];return [...document.querySelectorAll('#alerts .MuiAlert-root,#alerts .MuiAlert-icon,#alerts .MuiAlert-message,#alerts .MuiAlert-action,#alerts .MuiAlertTitle-root,#closeable button,#closeable svg')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))}))})()`;
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.alertControls');const rows=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const variant of ['standard','outlined','filled'])for(const severity of ['success','info','warning','error']){
    const props={mode,variables,variant,severity};await evaluate('window.renderAlert('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;
   }
   for(const rtl of [false,true])for(const variables of [false,true]){const props={rtl,variables,custom:true};await evaluate('window.renderAlert('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;}
   for(const variables of [false,true])for(const variant of ['standard','outlined','filled']){const props={color:'contest',variant,variables};await evaluate('window.renderAlert('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;}
   if(version==='app')for(const rtl of [false,true]){const props={custom:true,legacy:true,variables:true,rtl};await evaluate('window.renderAlert('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;}
   captures.push(rows);await evaluate('window.renderAlert({});'+settle);
   assert.equal(await evaluate('window.alertControls.ref.current===document.getElementById("sample")&&window.alertControls.slotRef.current===document.getElementById("closeable")'),true);
   await evaluate('window.savedAlert=document.getElementById("sample");window.savedMessage=window.savedAlert.querySelector(".MuiAlert-message");window.savedDraft=document.getElementById("draft");window.savedDraft.focus();window.savedDraft.value="Working";window.renderAlert({tick:1});'+settle);
   assert.equal(await evaluate('window.savedAlert===document.getElementById("sample")&&window.savedMessage===window.savedAlert.querySelector(".MuiAlert-message")&&document.activeElement===window.savedDraft&&window.savedDraft.value==="Working"'),true);
   assert.equal(await evaluate('document.querySelector("#table-caller [role=alert]")===null'),true);
   await evaluate('window.alertControls.setShow(true);'+settle);assert.equal(await evaluate('document.querySelector("#table-caller [role=alert]").textContent'),'Could not load resources');
   await evaluate('window.alertControls.setShow(false);window.alertControls.setSelected({one:true});'+settle);assert.match(await evaluate('document.querySelector("#table-caller [role=alert]").textContent'),/1 of 2 row/);
   await evaluate('document.querySelector("#table-caller button").click();'+settle);assert.equal(await evaluate('document.querySelector("#table-caller [role=alert]")'),null);
   await evaluate('document.getElementById("retry").click();'+settle);assert.equal(await evaluate('window.retryCount'),1);
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='alert'));assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Dismiss notice'));
   assert.equal(await evaluate('[...document.querySelectorAll("#alerts svg")].every(n=>n.getAttribute("aria-hidden")==="true"&&n.getAttribute("focusable")==="false")'),true);
   await evaluate('document.querySelector("#closeable button").focus()');
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await evaluate(settle);assert.equal(await evaluate('document.getElementById("closeable")===null'),true);assert.equal(await evaluate('window.alertControls.slotRef.current'),null);
   await evaluate('window.alertControls.setClosed(false);'+settle);
   if(kind==='vpm'&&version==='current'){const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(os.tmpdir(),'vpm-material-alert.png'),Buffer.from(shot.data,'base64'));}
   await evaluate('window.unmountAlert();'+settle);assert.equal(await evaluate('window.alertControls.ref.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  const differences=[];for(let i=0;i<captures[0].length;i++)for(let n=0;n<captures[0][i].value.length;n++){const u=captures[0][i].value[n],v=captures[1][i].value[n];for(const key of Object.keys(u.css))if(u.css[key]!==v.css[key])differences.push({props:captures[0][i].props,id:u.id,position:n,key,upstream:u.css[key],vpm:v.css[key]});}
  fs.writeFileSync(base+'/alert-'+version+'-differences.json',JSON.stringify(differences,null,2));assert.deepEqual(differences.slice(0,12),[],version+' Alert computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' Alert theme/RTL/color snapshots plus keyboard close, actions, actual Material React Table selection banners, retained DOM/focus, accessibility, refs and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
