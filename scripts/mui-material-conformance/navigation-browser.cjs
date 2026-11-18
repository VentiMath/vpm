"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-navigation-'));
let server,child,socket,sequence=0,activePage="";const pending=new Map(),exceptions=[],controlWarnings=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./navigation-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/navigation-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/navigation-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'<style>*,*::before,*::after{transition:none!important;animation:none!important}</style></head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error'){const message=x.params.args.map(a=>a.value||a.description).join(' ');if(activePage==='current-upstream'&&message.startsWith('React does not recognize the `%s` prop on a DOM element.')&&/ (alignItems alignitems|justifyContent justifycontent)$/.test(message))controlWarnings.push(message);else exceptions.push(message);}if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};


 const settle='new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
 const wait=c=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${c})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(c)})})()`);
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const snapshot=`['#sort-label','#sort-label svg','#pages ul','#pages button[aria-current]','#pages button[aria-label="Go to next page"]','#pages button[aria-label="Go to next page"] svg','#selected','#disabled-selected','#ellipsis .MuiPaginationItem-root'].map(selector=>{const e=document.querySelector(selector);if(!e)throw Error("Missing "+selector);const s=getComputedStyle(e);return {selector,tag:e.tagName,css:Object.fromEntries(['display','paddingLeft','paddingRight','paddingTop','paddingBottom','marginLeft','marginRight','borderWidth','borderColor','borderRadius','minWidth','height','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','opacity','transform','columnGap'].map(k=>[k,/color/i.test(k)?(()=>{const c=document.createElement("canvas");c.width=c.height=1;const x=c.getContext("2d");x.fillStyle=s[k];x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data].join(",")})():s[k]]))}})`;
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;activePage=name;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.navigationControls');const rows=[];
   const cases=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const rtl of [false,true])for(const custom of [false,true])cases.push({mode,variables,rtl,custom});
   for(const size of ['small','medium','large'])for(const shape of ['circular','rounded'])for(const variant of ['text','outlined'])for(const color of ['standard','primary','secondary'])cases.push({size,shape,variant,color});
   for(const props of cases){await evaluate('window.renderNavigation('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;}
   for(const mode of ['light','dark'])for(const color of ['standard','primary','secondary'])for(const variant of ['text','outlined']){
    const props={mode,color,variant};await evaluate('window.renderNavigation('+JSON.stringify(props)+');'+settle);
    const rect=await evaluate('(()=>{const r=document.getElementById("selected").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');await send('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await evaluate(settle);rows.push({props:{...props,state:'hover'},value:await evaluate(snapshot)});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await evaluate('document.getElementById("selected").focus();'+settle);rows.push({props:{...props,state:'focus'},value:await evaluate(snapshot)});await evaluate('document.activeElement.blur()');checks+=2;
   }
   await evaluate('window.renderNavigation({variables:true});'+settle);
   await evaluate('document.getElementById("navigation").style.setProperty("--mui-palette-common-onBackground","#fff");document.getElementById("navigation").style.setProperty("--mui-palette-common-onBackgroundChannel","255 255 255");'+settle);
   rows.push({props:{state:'live-variable-change'},value:await evaluate(snapshot)});checks++;
   await evaluate('document.getElementById("navigation").removeAttribute("style")');
   captures.push(rows);await evaluate('window.renderNavigation({});'+settle);
   assert.equal(await evaluate('window.navigationControls.ref.current===document.getElementById("pages")&&window.navigationControls.sortRef.current===document.getElementById("sort-label")'),true);
   await evaluate('document.getElementById("sort-label").focus()');
   for(const [key,code,virtual,expected] of [['Enter','Enter',13,'descending'],[' ','Space',32,'ascending']]){
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,...(key==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual});await evaluate(settle);assert.equal(await evaluate('document.getElementById("sort-cell").getAttribute("aria-sort")'),expected,name+' sort keyboard');
   }
   const click=async label=>{await evaluate('document.querySelector('+JSON.stringify('#pages [aria-label="'+label+'"]')+').click();'+settle)};
   await click('Go to next page');assert.equal(await evaluate('document.querySelector("#pages [aria-current]").textContent'),'6');
   await click('Go to first page');assert.equal(await evaluate('document.querySelector("#pages [aria-current]").textContent'),'1');
   await click('Go to last page');assert.equal(await evaluate('document.querySelector("#pages [aria-current]").textContent'),'12');
   assert.deepEqual(await evaluate('window.pageEvents'),[6,1,12]);
   await evaluate('window.savedPage=document.querySelector("#pages [aria-current]");window.savedPage.focus();window.renderNavigation({tick:1});'+settle);assert.equal(await evaluate('window.savedPage===document.querySelector("#pages [aria-current]")&&document.activeElement===window.savedPage'),true,name+' stable focus');
   await evaluate('window.renderNavigation({disabled:true});'+settle);await click('Go to first page');assert.deepEqual(await evaluate('window.pageEvents'),[6,1,12]);
   assert.equal(await evaluate('document.querySelector("#translated [aria-current]").getAttribute("aria-label")'),'Page actuelle 1');assert.equal(await evaluate('document.querySelector("#linked [aria-current]").tagName'),'A');
   await evaluate('window.renderNavigation({});'+settle);
   assert.equal(await evaluate('document.getElementById("table-page").textContent'),'0');
   await evaluate('document.querySelector('+JSON.stringify('#table-caller [aria-label="Go to next page"]')+').click();'+settle);
   assert.equal(await evaluate('document.getElementById("table-page").textContent'),'1');assert.equal(await evaluate('document.getElementById("table-first").textContent'),'Resource 16');
   await evaluate('document.querySelector('+JSON.stringify('#table-caller [aria-label="Go to last page"]')+').click();'+settle);assert.equal(await evaluate('document.getElementById("table-first").textContent'),'Resource 31');
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='navigation'&&n.name?.value==='pagination navigation'));
   await evaluate('window.renderNavigation({controlled:true,key:"controlled"});'+settle);await click('Go to next page');assert.equal(await evaluate('document.querySelector("#pages [aria-current]").textContent'),'6');
   await evaluate('window.unmountNavigation();'+settle);assert.equal(await evaluate('window.navigationControls.ref.current===null&&window.navigationControls.sortRef.current===null'),true);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedPages===document.querySelector("#pages")'),true);
  }
  const differences=[];
  for(let i=0;i<captures[0].length;i++)for(let n=0;n<captures[0][i].value.length;n++){
   const u=captures[0][i].value[n],v=captures[1][i].value[n];for(const key of Object.keys(u.css))if(u.css[key]!==v.css[key])differences.push({props:captures[0][i].props,selector:u.selector,key,upstream:u.css[key],vpm:v.css[key]});
  }
  fs.writeFileSync(base+'/navigation-'+version+'-differences.json',JSON.stringify(differences,null,2));assert.deepEqual(differences,[],version+' navigation theme/style parity');

 }
 assert.deepEqual(exceptions,[]);assert(controlWarnings.length<=4,'Unexpected additional control warnings');console.log(checks+' navigation theme/RTL/size snapshots plus keyboard sorting, page changes, live Material React Table caller, semantics, stable focus, refs and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
