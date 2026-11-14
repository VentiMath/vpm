"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-surfaces-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./surfaces-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/surfaces-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/surfaces-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html');res.end('<!doctype html><html><head>'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle="new Promise(r=>setTimeout(r,70)).then(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))))";
 const snapshot=`(()=>{const ctx=document.createElement('canvas').getContext('2d');const rgba=v=>{ctx.clearRect(0,0,1,1);ctx.fillStyle='transparent';ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
 const properties=['display','width','height','position','alignSelf','flexDirection','flexShrink','marginLeft','marginRight','marginTop','marginBottom','paddingLeft','paddingRight','paddingTop','paddingBottom','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopStyle','borderLeftStyle','borderRadius','boxShadow','backgroundImage','fontSize','fontWeight','lineHeight','overflowX','textAlign','whiteSpace'];
 const style=(el,pseudo)=>{const s=getComputedStyle(el,pseudo);return {...Object.fromEntries(properties.map(k=>[k,s[k]])),color:rgba(s.color),background:rgba(s.backgroundColor),borderColor:rgba(s.borderColor),content:pseudo?s.content:null}};
 return [...document.querySelectorAll('#surfaces [id]')].map(el=>({id:el.id,tag:el.tagName,role:el.getAttribute('role'),hidden:el.getAttribute('aria-hidden'),orientation:el.getAttribute('aria-orientation'),css:style(el),...(el.id==='fuse-icon'?{inheritedColor:rgba(getComputedStyle(el.parentElement).color)}:{}),...(el.id.startsWith('label-')||el.id==='vertical-label'?{wrapper:style(el.querySelector('span')),before:style(el,'::before'),after:style(el,'::after')}:{})}));})()`;
 await send('Runtime.enable');await send('Accessibility.enable');let comparisons=0;
 for(const version of ['current','app']){
  const rows=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.surfaceControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Surface fixture unavailable')})()");
   const styles=[];
   for(const width of [420,1200])for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1400,deviceScaleFactor:1,mobile:false});
    await evaluate('window.renderSurfaces('+JSON.stringify({mode,rtl,variables,custom})+');'+settle);
    styles.push({width,mode,rtl,variables,custom,values:await evaluate(snapshot)});
   }
   assert.equal(await evaluate("window.surfaceControls.paper.current===document.querySelector('#paper-default')&&window.surfaceControls.icon.current===document.querySelector('#fuse-icon')&&window.surfaceControls.divider.current===document.querySelector('#divider-fullWidth')"),true,name+' forwarded refs');
   await evaluate("document.querySelector('#paper-default').focus();window.savedSurface=document.activeElement;window.renderSurfaces({mode:'light',variables:true,tick:1});"+settle);
   assert.equal(await evaluate('document.activeElement===window.savedSurface'),true,name+' retained focus');
   assert.equal(await evaluate("document.querySelector('#fuse-icon').classList.contains('notranslate')"),true,name+' Fuse fallback');
   const ax=await send('Accessibility.getFullAXTree');const names=ax.nodes.filter(n=>n.role?.value==='image').map(n=>n.name?.value).sort();
   for(const size of ['small','medium','large','inherit'])assert.ok(names.includes(size+' palette'),name+' named icon');
   if(process.env.VPM_MATERIAL_EVIDENCE){fs.mkdirSync(process.env.VPM_MATERIAL_EVIDENCE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(process.env.VPM_MATERIAL_EVIDENCE,name+'-surfaces.png'),Buffer.from(shot.data,'base64'));}
   rows.push({styles,names});
   await evaluate('window.unmountSurfaces();'+settle);
   assert.equal(await evaluate('Object.values(window.surfaceControls).every(ref=>ref.current===null)'),true,name+' ref cleanup');
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   assert.deepEqual(await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return window.hydrationReady;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration fixture unavailable')})()"),{same:true,errors:[]},name+' delivered SSR hydration');
  }
  if(version==='app')for(let i=0;i<rows[0].styles.length;i++){
   const legacy=rows[0].styles[i].values.find(x=>x.id==='fuse-icon').css,modern=rows[1].styles[i].values.find(x=>x.id==='fuse-icon').css;
   // App 7 consumes Icon API props as System styles. Current 9 forwards them;
   // VPM follows 9 for custom roots. Assert the divergence before normalizing.
   assert.equal(legacy.fontSize,'13px');assert.equal(modern.fontSize,'20px');
   assert.deepEqual(legacy.color,rows[0].styles[i].values.find(x=>x.id==='fuse-icon').inheritedColor);assert.deepEqual(modern.color,[36,89,169,255]);
   for(const key of ['fontSize','color','borderColor']){delete legacy[key];delete modern[key];}
  }
  try{assert.deepEqual(rows[1],rows[0],version+' surfaces');}catch(error){fs.writeFileSync(path.join(os.tmpdir(),'vpm-surfaces-style-failure.json'),JSON.stringify({version,rows},null,2));throw error;}
  comparisons+=rows[0].styles.length;
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' Paper/Divider/Icon theme+viewport comparisons pass; all elevations, RTL, variables, pseudo-elements, Fuse fallback, Motion Paper, refs, focus, accessibility and hydration');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child&&child.exitCode===null&&child.signalCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');const kill=setTimeout(()=>child.kill('SIGKILL'),3000);await done;clearTimeout(kill)}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}})().catch(e=>{console.error(e);process.exitCode=1});
