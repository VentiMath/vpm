"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-tables-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./tables-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/tables-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/tables-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};


 const settle='new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
 const wait=c=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${c})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(c)})})()`);
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const snapshot=`['scores-container','scores-table','head-row','name-head','score-head','row-2','name-2','footer','nested','outer'].map(id=>{const e=document.getElementById(id),s=getComputedStyle(e);return {id,tag:e.tagName,css:Object.fromEntries(['display','paddingLeft','paddingRight','paddingTop','paddingBottom','borderBottomWidth','borderBottomColor','borderCollapse','borderSpacing','textAlign','verticalAlign','position','top','zIndex','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','overflowX'].map(k=>[k,s[k]]))}})`;
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.tableControls');const rows=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const custom of [false,true])for(const rtl of [false,true])for(const size of ['small','medium']){
    await evaluate('window.renderTables('+JSON.stringify({mode,variables,custom,rtl,size})+');'+settle);rows.push({mode,variables,custom,rtl,size,value:await evaluate(snapshot)});checks++;
   }
   for(const padding of ['checkbox','none']){await evaluate('window.renderTables('+JSON.stringify({padding,size:'small'})+');'+settle);rows.push({padding,value:await evaluate(snapshot)});checks++;}
   captures.push(rows);await evaluate('window.renderTables({});'+settle);
   assert.equal(await evaluate('window.tableControls.ref.current===document.getElementById("scores-container")&&window.tableControls.cellRef.current===document.getElementById("name-head")'),true);
   assert.equal(await evaluate('document.getElementById("name-head").scope'), 'col');
   assert.equal(await evaluate('document.getElementById("name-1").scope'), 'row');
   const top=await evaluate('document.getElementById("name-head").getBoundingClientRect().top');await evaluate('document.getElementById("scores-container").scrollTop=100;'+settle);
   assert(Math.abs(await evaluate('document.getElementById("name-head").getBoundingClientRect().top')-top)<1,name+' sticky header');
   await evaluate('document.getElementById("scores-container").scrollTop=0;window.savedRow=document.getElementById("row-1");window.savedDraft=document.getElementById("draft");window.savedDraft.focus();window.savedDraft.value="Draft";window.renderTables({tick:1});'+settle);
   assert.equal(await evaluate('window.savedDraft===document.getElementById("draft")&&document.activeElement===window.savedDraft&&window.savedDraft.value==="Draft"'),true);
   await evaluate('document.getElementById("sort").focus()');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});await evaluate(settle);
   assert.equal(await evaluate('document.getElementById("name-head").getAttribute("aria-sort")'),'descending');assert.equal(await evaluate('window.savedRow===document.getElementById("row-1")&&window.savedDraft===document.getElementById("draft")'),true);
   assert.equal(await evaluate('document.querySelector("#scores-table tbody tr").id'),'row-20');
   await evaluate('document.getElementById("row-3").click();'+settle);assert.equal(await evaluate('document.getElementById("row-3").classList.contains("Mui-selected")'),true);
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='table'&&n.name?.value==='Practice scores'));assert(ax.nodes.some(n=>n.role?.value==='columnheader'));
   await evaluate('window.unmountTables();'+settle);assert.equal(await evaluate('window.tableControls.ref.current===null&&window.tableControls.cellRef.current===null'),true);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.hydratedTable===document.querySelector("#scores-table")'),true);
  }
  assert.deepEqual(captures[1],captures[0],version+' Table styles and themes');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' Table theme/RTL/size snapshots plus native sorting, sticky scrolling, semantics, stable rows/drafts, refs and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
