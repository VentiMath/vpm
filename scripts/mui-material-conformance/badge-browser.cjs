"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-badge-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./badge-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/badge-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/badge-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 const snapshot=`(()=>{const keys=['display','position','fontSize','fontWeight','minWidth','height','padding','borderRadius','color','backgroundColor','top','right','bottom','left','transform','transformOrigin','transitionDuration','outline'];return [...document.querySelectorAll('#badges .MuiBadge-root,#badges .MuiBadge-badge')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))}))})()`;
 const settled='(async()=>{await '+settle+';for(const a of document.getAnimations()){a.finish()}await '+settle+'})()';
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.badgeControls');const rows=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const variant of ['standard','dot'])for(const overlap of ['rectangular','circular'])for(const vertical of ['top','bottom'])for(const horizontal of ['left','right']){
    const props={mode,variables,variant,overlap,vertical,horizontal};await evaluate('window.renderBadge('+JSON.stringify(props)+');'+settled);rows.push({props,value:await evaluate(snapshot)});checks++;
   }
   for(const variables of [false,true])for(const color of ['default','primary','secondary','warning','info','success','contest']){const props={variables,color,custom:true};await evaluate('window.renderBadge('+JSON.stringify(props)+');'+settled);rows.push({props,value:await evaluate(snapshot)});checks++;}
   if(version==='current')for(const horizontal of ['left','right']){const props={rtl:true,horizontal};await evaluate('window.renderBadge('+JSON.stringify(props)+');'+settled);rows.push({props,value:await evaluate(snapshot)});checks++;}
   if(version==='app'){
    await evaluate('window.renderBadge({rtl:true});'+settled);
    const offset=await evaluate('(()=>{const r=document.getElementById("sample").getBoundingClientRect(),m=document.querySelector("#sample .MuiBadge-badge").getBoundingClientRect();return m.left+m.width/2-r.left-r.width/2})()');
    assert(kind==='upstream'?offset<0:offset>0,'Current Badge keeps explicit physical anchors; app7 Stylis RTL mirrors them');
   }
   captures.push(rows);await evaluate('window.renderBadge({});'+settled);
   assert.equal(await evaluate('window.badgeControls.ref.current===document.getElementById("sample")&&window.badgeControls.slotRef.current===document.getElementById("sample")'),true);
   await evaluate('window.savedBadge=document.getElementById("sample");window.savedMark=window.savedBadge.querySelector(".MuiBadge-badge");window.savedButton=document.getElementById("reading-list");window.savedButton.focus();window.badgeControls.setCount(120);window.renderBadge({tick:1});'+settled);
   assert.equal(await evaluate('window.savedMark.textContent'),'99+');assert.equal(await evaluate('window.savedBadge===document.getElementById("sample")&&window.savedMark===window.savedBadge.querySelector(".MuiBadge-badge")&&document.activeElement===window.savedButton'),true);
   await evaluate('window.badgeControls.setCount(0);'+settled);assert.equal(await evaluate('window.savedMark.classList.contains("MuiBadge-invisible")'),true);assert.equal(await evaluate('window.savedMark.textContent'),'99+');
   await evaluate('window.badgeControls.setCount(2);'+settled);assert.equal(await evaluate('window.savedMark.textContent'),'2');assert.equal(await evaluate('window.savedMark.classList.contains("MuiBadge-invisible")'),false);
   await evaluate('window.badgeControls.setHidden(true);'+settled);assert.equal(await evaluate('window.savedMark.classList.contains("MuiBadge-invisible")'),true);
   await evaluate('window.badgeControls.setHidden(false);'+settled);
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await evaluate(settled);assert.equal(await evaluate('!!document.getElementById("reading-menu")'),true);
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Reading list, 2 items'));
   if(kind==='vpm'){
    assert.equal(await evaluate('window.savedMark.getAttribute("aria-hidden")'),'true');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate(settle);assert.equal(await evaluate('getComputedStyle(window.savedMark).transitionDuration'),'0s');
    await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});await evaluate(settle);assert.equal(await evaluate('getComputedStyle(window.savedMark).borderTopWidth'),'1px');await send('Emulation.setEmulatedMedia',{features:[]});
   }
   await evaluate('window.unmountBadge();'+settle);assert.equal(await evaluate('window.badgeControls.ref.current'),null);assert.equal(await evaluate('window.badgeControls.slotRef.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  const differences=[];for(let i=0;i<captures[0].length;i++)for(let n=0;n<captures[0][i].value.length;n++){const u=captures[0][i].value[n],v=captures[1][i].value[n];for(const key of Object.keys(u.css))if(u.css[key]!==v.css[key])differences.push({props:captures[0][i].props,id:u.id,position:n,key,upstream:u.css[key],vpm:v.css[key]});}
  fs.writeFileSync(base+'/badge-'+version+'-differences.json',JSON.stringify(differences,null,2));assert.deepEqual(differences.slice(0,12),[],version+' Badge computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' Badge theme/anchor/color snapshots plus reading-list count updates, zero hiding, keyboard activation, retained DOM/focus, refs, hydration, current RTL and owned reduced-motion/forced-colors checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
