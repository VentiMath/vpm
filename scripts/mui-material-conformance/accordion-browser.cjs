"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-accordion-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./accordion-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/accordion-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/accordion-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 const baseUrl='http://127.0.0.1:'+server.address().port+'/';
 const render=props=>evaluate('window.renderAccordion('+JSON.stringify(props)+');'+settle);
 const activate=async(key,code,n,text)=>{
   await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:n,text});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:n});
   await evaluate(settle);
 };
 const snapshot=`(()=>{
   const root=document.querySelector('#panel'), summary=document.querySelector('#summary'), region=document.querySelector('[role=region]');
   const css=getComputedStyle(root), before=getComputedStyle(root,'::before');
   return {tag:root.tagName, expanded:summary.getAttribute('aria-expanded'), disabled:summary.disabled,
    region:region.id, labelledBy:region.getAttribute('aria-labelledby'), heading:summary.parentNode.tagName,
    margin:css.margin, radius:css.borderRadius, border:css.borderLeftWidth, divider:before.display,
    dividerOpacity:before.opacity, background:css.backgroundColor, visibility:getComputedStyle(region).visibility,
    detailsPadding:getComputedStyle(document.querySelector('.MuiAccordionDetails-root')).padding};
 })()`;
 for(const version of ['current','app']){
   let baseline;
   for(const kind of ['upstream','vpm']){
     const name=version+'-'+kind; console.log('Checking '+name);
     await send('Page.navigate',{url:baseUrl+name});
     await wait('window.accordionRoot?.current'); const results=[];
     for(const caller of ['hmmt','article','warml'])for(const expanded of [false,true])for(const disabled of [false,true]){
       await render({kind:caller,expanded,disabled,mode:disabled?'dark':'light',slots:true,custom:disabled});
       await wait('document.querySelector(".MuiCollapse-'+(expanded?'entered':'hidden')+'")');
       results.push(await evaluate(snapshot));
     }
     await render({expanded:false});
     await evaluate('window.events=[];document.querySelector("#summary").click()'); await evaluate(settle);
     assert.deepEqual(await evaluate('window.events'),[true]);
     assert.equal(await evaluate('document.querySelector("#summary").getAttribute("aria-expanded")'),'false');
     if(kind==='upstream')baseline=results;else assert.deepEqual(results,baseline,version+' computed geometry, state and ARIA');
     // Remount after controlled cases so the keyboard fixture begins uncontrolled.
     await send('Page.navigate',{url:baseUrl+name});await wait('window.accordionRoot?.current');
     await evaluate('window.events=[];window.savedInput=document.querySelector("#inside");document.querySelector("#before").focus()');
     await activate('Tab','Tab',9);assert.equal(await evaluate('document.activeElement.id'),'summary');
     await activate('Enter','Enter',13,'\r');await wait('document.querySelector(".MuiCollapse-entered")');
     assert.deepEqual(await evaluate('window.events'),[true]);
     await activate(' ','Space',32,' ');await wait('document.querySelector(".MuiCollapse-hidden")');
     assert.deepEqual(await evaluate('window.events'),[true,false]);
     assert.equal(await evaluate('window.savedInput===document.querySelector("#inside") && document.activeElement.id==="summary"'),true);
     await render({unmount:true});await wait('!document.querySelector("#inside")');
     await send('Page.navigate',{url:baseUrl+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);
     assert.equal(await evaluate('window.savedHydrated===document.querySelector("#hydrated")'),true);
   }
 }
 assert.deepEqual(exceptions,[]);console.log('Accordion caller geometry, ARIA, keyboard, mount policy and hydration pass on both controls');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e,exceptions.map(item=>item.exception?.description||item));process.exitCode=1;});
