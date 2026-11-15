"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-avatar-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./avatar-build.cjs');
 server=http.createServer((req,res)=>{
  if(/^\/(?:avatar|large)\.svg(?:\?|$)/.test(req.url)){res.setHeader('content-type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="steelblue"/></svg>');return;}
  if(req.url.startsWith('/bad')||req.url.startsWith('/slow')){const fail=()=>{res.statusCode=404;res.end('missing')};if(req.url.startsWith('/slow'))setTimeout(fail,350);else fail();return;}
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/avatar-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/avatar-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 const snapshot=`(()=>{const keys=['display','height','width','color','backgroundColor','borderRadius','fontSize','lineHeight','objectFit','marginLeft','marginRight'];return [...document.querySelectorAll('#avatars .MuiAvatar-root,#avatars .MuiAvatar-img,#avatars .MuiAvatar-fallback')].map(el=>({tag:el.tagName,id:el.id,text:el.tagName==='DIV'?el.textContent:undefined,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))}))})()`;
 for(const version of ['current','app']){
  const captures=[],eventTraces=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.avatarControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Avatar fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom})+');'+settle);styles.push(await evaluate(snapshot));
   }
   captures.push(styles);comparisons+=styles.length;
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.avatarControls.refs.current.root===document.getElementById("profile")'),true);
   assert.equal(await evaluate('window.avatarControls.refs.current.img===document.querySelector("#profile img")'),true);
   assert.deepEqual(await evaluate('[document.getElementById("bad-alt").textContent,document.getElementById("bad-child").textContent,!!document.querySelector("#bad-icon svg")]'),['S','A',true]);
   assert.ok(await evaluate('document.querySelector("#responsive img").naturalWidth>0'));
   await evaluate('window.savedAvatar=document.getElementById("profile");document.getElementById("user-menu").focus();window.renderVariants({tick:2});'+settle);
   assert.equal(await evaluate('window.savedAvatar===document.getElementById("profile")&&document.activeElement.id==="user-menu"'),true);
   await evaluate('window.avatarControls.setSrc("/bad-profile.png");'+settle);
   assert.equal(await evaluate('document.getElementById("profile").textContent'),'u');
   await evaluate('window.avatarControls.setSrc("/avatar.svg?refresh");'+settle);
   assert.equal(await evaluate('!!document.querySelector("#profile img")'),true);
   await evaluate('window.avatarControls.setSrc("/slow.png");new Promise(r=>setTimeout(r,30))');
   await evaluate('window.avatarControls.setSrc("/large.svg");new Promise(r=>setTimeout(r,600))');
   assert.equal(await evaluate('document.querySelector("#profile img")?.naturalWidth'),40);
   if(kind==='vpm'){
    assert.ok((await evaluate('window.avatarControls.events.current')).includes('error'));
    const ax=await send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='image'&&n.name?.value==='user photo'));
   }
   comparisons+=14;
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('window.avatarControls.refs.current.root'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);assert.equal(await evaluate('document.getElementById("hydrated-bad").textContent'),'M');comparisons++;
  }
  for(let i=0;i<captures[0].length;i++)for(let j=0;j<captures[0][i].length;j++)assert.deepEqual(captures[1][i][j],captures[0][i][j],version+' computed styles variant '+i+' node '+j);
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' Avatar images, fallback, source races, refs, hydration and computed-style checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
