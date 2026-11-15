"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-menus-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./menus-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/menus-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/menus-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};



 const settle='new Promise(r=>setTimeout(r,70))';
 await send('Runtime.enable');await send('Accessibility.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 const press=async(key,shift=false)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,modifiers:shift?8:0,windowsVirtualKeyCode:({ArrowDown:40,ArrowUp:38,Home:36,End:35,Enter:13,Escape:27,Tab:9})[key]});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});await evaluate(settle);return evaluate('document.activeElement.id')};
 const open=()=>evaluate('document.getElementById("trigger").focus();document.getElementById("trigger").click();'+settle);
 const snap=`(()=>{const node=document.querySelector('[data-paper="main"]'),rect=node.getBoundingClientRect(),style=getComputedStyle(node),list=node.querySelector('[role=menu]');return {rect:[rect.x,rect.y,rect.width,rect.height].map(n=>Math.round(n*100)/100),padding:style.padding,borderRadius:style.borderRadius,focus:document.activeElement.id,locked:document.body.style.overflow==='hidden',portal:node.closest('#popup').parentNode===document.body,list:list?{display:getComputedStyle(list).display,gap:getComputedStyle(list).gap}:null}})()`;
 for(const version of ['current','app']){const rows=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.popupControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Popup fixture unavailable')})()");
   const styles=[];for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true])for(const position of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom,position})+');'+settle);await open();
    styles.push({mode,rtl,variables,custom,position,value:await evaluate(snap)});
    await press('Escape');assert.equal(await evaluate('window.popupControls.open'),false,'escape');assert.equal(await evaluate('document.activeElement.id'),'trigger','restore focus');
   }
   await evaluate('window.renderVariants({});'+settle);await open();
   const keys=[];keys.push(await press('Home'));keys.push(await press('ArrowDown'));keys.push(await press('Enter'));
   assert.equal(await evaluate('window.popupControls.events.at(-1)'),'weekly');
   await open();await press('Tab');assert.equal(await evaluate('window.popupControls.events.at(-1)'),'tabKeyDown');
   await open();await evaluate('document.querySelector("#popup .MuiBackdrop-root").click();'+settle);assert.equal(await evaluate('window.popupControls.events.at(-1)'),'backdropClick');
   await open();await evaluate('document.getElementById("trigger").style.left="500px";window.popupControls.action.current.updatePosition();'+settle);assert.ok(await evaluate('document.querySelector("[data-paper=main]").getBoundingClientRect().left>=450'));
   await evaluate('window.savedPaper=document.querySelector("[data-paper=main]");window.renderVariants({tick:3});'+settle);assert.equal(await evaluate('window.savedPaper===document.querySelector("[data-paper=main]")'),true);
   await press('Escape');
   await evaluate('window.renderVariants({kind:"popover"});'+settle);await open();
   await evaluate('document.querySelector("#pop-last").focus()');await press('Tab');assert.equal(await evaluate('document.activeElement.id'),'pop-first','trap tab');
   await press('Tab',true);assert.equal(await evaluate('document.activeElement.id'),'pop-last','trap shift-tab');
   await evaluate('document.querySelector("#outside").focus();'+settle);assert.equal(await evaluate('document.querySelector("[data-paper=main]").contains(document.activeElement)'),true,'enforce focus');
   await evaluate('document.querySelector("#pop-last").focus();document.querySelector("#pop-last").click();'+settle);assert.equal(await evaluate('document.body.style.overflow'),'hidden');
   await press('Escape');assert.equal(await evaluate('window.popupControls.open'),true,'nested escape leaves parent');assert.equal(await evaluate('document.body.style.overflow'),'hidden','nested retains lock');
   await press('Escape');assert.equal(await evaluate('document.body.style.overflow'),'');
   await evaluate('window.renderVariants({disablePortal:true,disableScrollLock:true});'+settle);await open();assert.equal(await evaluate('document.body.style.overflow'),'');assert.equal(await evaluate('document.getElementById("popup").parentNode===document.body'),false);
   await press('Escape');
   await evaluate('window.renderVariants({keepMounted:true});'+settle);await open();await press('Escape');assert.equal(await evaluate('(()=>{const n=document.querySelector("[data-paper=main]");return n.getClientRects().length>0&&getComputedStyle(n).visibility!=="hidden"})()'),false);
   const ax=await send('Accessibility.getFullAXTree');assert.ok(!ax.nodes.some(n=>n.role?.value==='menu'&&n.name?.value==='Schedule'));
   await evaluate('window.mountFrame();'+settle);
   await evaluate('window.frameDoc=document.querySelector("#menu-frame").contentDocument;frameDoc.querySelector("#frame-trigger").focus();frameDoc.querySelector("#frame-trigger").click();'+settle);
   assert.deepEqual(await evaluate('[frameDoc.querySelector("#frame-popup").parentNode===frameDoc.body,frameDoc.activeElement.id,frameDoc.body.style.overflow,document.body.style.overflow]'),[true,'frame-choice','hidden','']);
   await evaluate('frameDoc.querySelector("#frame-choice").click();'+settle);
   assert.deepEqual(await evaluate('[frameDoc.activeElement.id,frameDoc.body.style.overflow]'),['frame-trigger','']);
   await evaluate('window.removeFrame();'+settle);
   rows.push({styles,keys});await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('document.body.style.overflow'),'');
  }
  fs.writeFileSync(path.join(os.tmpdir(),'vpm-menus-'+version+'.json'),JSON.stringify(rows,null,2));assert.deepEqual(rows[1],rows[0],version+' popup position/focus/themes');comparisons+=rows[0].styles.length;
 }
 assert.equal(exceptions.length,0,JSON.stringify(exceptions));console.log(comparisons+' menu/popover comparisons pass; dismissal, nested locks, focus, geometry and retained DOM');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await Promise.race([exited,new Promise(r=>setTimeout(r,2000))]);}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
