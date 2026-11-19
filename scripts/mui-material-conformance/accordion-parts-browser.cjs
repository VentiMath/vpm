"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-accordion-parts-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./accordion-parts-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/accordion-parts-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/accordion-parts-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0"><style>.shell-bar{position:relative!important;z-index:20!important}.shell-toolbar{padding:0!important;min-height:48px!important}@media(min-width:768px){.shell-toolbar{min-height:64px!important}}</style>'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
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
 const snapshot=`(()=>{const keys=['display','width','minHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginBottom','textAlign','flexGrow','color','backgroundColor','opacity','transform','fontWeight','borderTopWidth'];return ['summary','.MuiAccordionSummary-content','.MuiAccordionSummary-expandIconWrapper','details'].map(id=>{const el=id[0]==='.'?document.querySelector(id):document.getElementById(id);if(!el)return null;const css=getComputedStyle(el);return {tag:el.tagName,css:Object.fromEntries(keys.map(k=>[k,css[k]]))}})})()`;
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.accordionControls');const rows=[];
   const matrix=[];for(const mode of ['light','dark'])for(const variables of [false,true])for(const expanded of [false,true])for(const disabled of [false,true])for(const disableGutters of [false,true])matrix.push({mode,variables,expanded,disabled,disableGutters});
   for(const rtl of [false,true])for(const custom of [false,true])for(const app of [false,true])for(const slots of [false,true])matrix.push({rtl,custom,app,slots,expanded:true});
   matrix.push({icon:false},{standalone:true},{component:'div'});
   await send('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false});
   for(const props of matrix){await evaluate('window.renderAccordion('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;}
   captures.push(rows);await evaluate('window.renderAccordion({slots:true});'+settle);
   assert.equal(await evaluate('window.accordionControls.summary.current===document.getElementById("summary")&&window.accordionControls.details.current===document.getElementById("details")&&window.accordionControls.slotRoot.current===document.getElementById("summary")&&window.accordionControls.content.current===document.querySelector(".MuiAccordionSummary-content")'),true);
   await evaluate('window.events=[];document.getElementById("before").focus()');
   const key=async(key,code,n)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:n,...(key==='Enter'?{text:'\r'}:key===' '?{text:' '}:{} )});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:n});await evaluate(settle)};
   await key('Tab','Tab',9);assert.equal(await evaluate('document.activeElement.id'),'summary');assert.equal(await evaluate('document.activeElement.classList.contains("custom-focus")'),true);
   await key('Enter','Enter',13);assert.equal(await evaluate('document.getElementById("summary").getAttribute("aria-expanded")'),'true');assert.deepEqual(await evaluate('window.events'),['toggle','click']);
   await key(' ','Space',32);assert.equal(await evaluate('document.getElementById("summary").getAttribute("aria-expanded")'),'false');assert.deepEqual(await evaluate('window.events'),['toggle','click','toggle','click']);
   await evaluate('window.savedSummary=document.getElementById("summary");window.savedContent=document.querySelector(".MuiAccordionSummary-content");window.savedInput=document.getElementById("inside");window.renderAccordion({slots:true,tick:1,mode:"dark"});'+settle);
   assert.equal(await evaluate('window.savedSummary===document.getElementById("summary")&&window.savedContent===document.querySelector(".MuiAccordionSummary-content")&&window.savedInput===document.getElementById("inside")&&document.activeElement.id==="summary"'),true);
   await evaluate('window.renderAccordion({disabled:true});'+settle);assert.equal(await evaluate('document.getElementById("summary").disabled'),true);await evaluate('document.getElementById("before").focus()');await key('Tab','Tab',9);assert.equal(await evaluate('document.activeElement.id'),'inside');
   await evaluate('window.renderAccordion({component:"div"});'+settle);await evaluate('window.events=[];document.getElementById("summary").focus()');await key('Enter','Enter',13);assert.deepEqual(await evaluate('window.events'),['toggle','click']);
   await evaluate('window.renderAccordion({slots:true,slotClick:true});'+settle);await evaluate('window.events=[];document.getElementById("summary").click();'+settle);rows.push({props:{slotClick:true},value:[{tag:'events',css:{trace:JSON.stringify(await evaluate('window.events')),expanded:await evaluate('document.getElementById("summary").getAttribute("aria-expanded")')}}]});
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value.includes('Contest information')));assert(ax.nodes.some(n=>n.role?.value==='region'&&n.name?.value.includes('Contest information')));
   await evaluate('window.unmountAccordion();'+settle);assert.equal(await evaluate('window.accordionControls.summary.current'),null);assert.equal(await evaluate('window.accordionControls.details.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  const differences=[];for(let i=0;i<captures[0].length;i++)for(let n=0;n<captures[0][i].value.length;n++){const u=captures[0][i].value[n],v=captures[1][i].value[n];if(!u||!v){assert.equal(u,v);continue}assert.equal(u.tag,v.tag);for(const key of Object.keys(u.css))if(u.css[key]!==v.css[key])differences.push({props:captures[0][i].props,position:n,key,upstream:u.css[key],vpm:v.css[key]});}
  fs.writeFileSync(base+'/accordion-parts-'+version+'-differences.json',JSON.stringify(differences,null,2));assert.deepEqual(differences.slice(0,12),[],version+' Accordion summary/details computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' Accordion summary/details snapshots plus native keyboard toggles, disabled traversal, event order, slots/refs, retained focus/DOM, accessibility and hydration checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
