"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-bars-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./bars-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/bars-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/bars-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 // Compare color pixels: rgba and relative-color serialization can differ for the same sRGB value.
 const snapshot=`(()=>{const keys=['display','position','zIndex','top','left','right','width','boxSizing','flexDirection','alignItems','minHeight','paddingLeft','paddingRight','backgroundColor','color','backgroundImage','borderRadius','borderBottomWidth','boxShadow'];return ['sample','toolbar'].map(id=>{const el=document.getElementById(id),css=getComputedStyle(el);return {tag:el.tagName,css:Object.fromEntries(keys.map(k=>[k,css[k]]))}})})()`;
 let checks=0;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.barsControls');const rows=[];
   const matrix=[];
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const color of ['primary','default','inherit','transparent','secondary','error','info','success','warning'])for(const enableColorOnDark of [false,true])matrix.push({mode,variables,color,enableColorOnDark});
   for(const rtl of [false,true])for(const position of ['fixed','absolute','sticky','static','relative'])matrix.push({rtl,position,variables:true});
   for(const custom of [false,true])for(const variables of [false,true])for(const variant of ['regular','dense'])for(const disableGutters of [false,true])matrix.push({custom,variables,variant,disableGutters});
   for(const mode of ['light','dark'])for(const rtl of [false,true])matrix.push({mode,rtl,variables:true,custom:true,shell:true,component:'footer',color:'default'});
   await send('Emulation.setDeviceMetricsOverride',{width:900,height:800,deviceScaleFactor:1,mobile:false});
   for(const props of matrix){await evaluate('window.renderBars('+JSON.stringify(props)+');'+settle);rows.push({props,value:await evaluate(snapshot)});checks++;}
   // Phone portrait, phone landscape, desktop; test regular/dense/gutter rules
   // and the app's shared 48px theme override at each breakpoint.
   for(const [width,height]of [[390,844],[844,390],[600,800]])for(const custom of [false,true])for(const variant of ['regular','dense'])for(const disableGutters of [false,true]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    const props={custom,variant,disableGutters};await evaluate('window.renderBars('+JSON.stringify(props)+');'+settle);rows.push({props:{...props,width,height},value:await evaluate(snapshot)});checks++;
   }
   await evaluate('window.renderBars({position:"fixed"});'+settle);await send('Emulation.setEmulatedMedia',{media:'print'});assert.equal(await evaluate('getComputedStyle(document.getElementById("sample")).position'),'absolute');await send('Emulation.setEmulatedMedia',{media:''});
   captures.push(rows);await evaluate('window.renderBars({});'+settle);
   assert.equal(await evaluate('window.barsControls.ref.current===document.getElementById("sample")&&window.barsControls.toolbarRef.current===document.getElementById("toolbar")'),true);
   await evaluate('document.getElementById("first").focus()');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await evaluate(settle);assert.equal(await evaluate('document.activeElement.id'),'last');
   await evaluate('window.savedBar=document.getElementById("sample");window.savedToolbar=document.getElementById("toolbar");window.renderBars({tick:1,mode:"dark"});'+settle);
   assert.equal(await evaluate('window.savedBar===document.getElementById("sample")&&window.savedToolbar===document.getElementById("toolbar")&&document.activeElement.id==="last"'),true);
   await evaluate('window.renderBars({component:"footer"});'+settle);assert.equal(await evaluate('document.getElementById("sample").tagName'),'FOOTER');
   const ax=await send('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='link'&&n.name?.value==='Contests'));assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Open navigation'));
   await evaluate('window.unmountBars();'+settle);assert.equal(await evaluate('window.barsControls.ref.current'),null);assert.equal(await evaluate('window.barsControls.toolbarRef.current'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.hydrationReady');await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true);
  }
  const differences=[];for(let i=0;i<captures[0].length;i++)for(let n=0;n<captures[0][i].value.length;n++){const u=captures[0][i].value[n],v=captures[1][i].value[n];assert.equal(u.tag,v.tag);for(const key of Object.keys(u.css))if(u.css[key]!==v.css[key])differences.push({props:captures[0][i].props,position:n,key,upstream:u.css[key],vpm:v.css[key]});}
  fs.writeFileSync(base+'/bars-'+version+'-differences.json',JSON.stringify(differences,null,2));const legacyInherit=d=>version==='app'&&d.props.color==='inherit'&&d.key==='color'&&d.vpm==='rgb(12, 34, 56)'&&d.upstream===(d.props.mode==='dark'?'rgb(255, 255, 255)':'rgba(0, 0, 0, 0.87)');if(version==='app')assert.equal(differences.filter(legacyInherit).length,16,'Material9 inherits the parent text color; app7 retains Paper text');assert.deepEqual(differences.filter(d=>!legacyInherit(d)).slice(0,12),[],version+' AppBar/Toolbar computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' AppBar/Toolbar theme/color/position/responsive snapshots plus print, keyboard traversal, retained DOM/focus, refs, root semantics and hydration checks pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
