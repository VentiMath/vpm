"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-text-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./text-build.cjs');
 server=http.createServer((req,res)=>{const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/text-browser.js'));}else{const variant=req.url.slice(1)||'current-vpm';res.setHeader('content-type','text/html');res.end('<!doctype html><html><body style="margin:0"><script src="/'+variant+'.js"></script></body></html>');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
 const settle="new Promise(r=>setTimeout(r,60))";
 const colorCode=`const ctx=document.createElement('canvas').getContext('2d');const rgba=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle='transparent';ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};`;
 const snapshot=`(()=>{${colorCode}return [...document.querySelectorAll('#text-scene [id]')].map(el=>{const s=getComputedStyle(el);return {id:el.id,tag:el.tagName,viewBox:el.getAttribute('viewBox'),role:el.getAttribute('role'),hidden:el.getAttribute('aria-hidden'),title:el.querySelector('title')?.textContent||null,css:Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','textAlign','whiteSpace','textOverflow','overflowX','marginBottom','marginTop','paddingLeft','paddingRight','borderLeftWidth','borderRightWidth','width','height','fill','textDecorationLine','textDecorationThickness','textUnderlineOffset'].map(k=>[k,s[k]])),color:rgba(s.color),decoration:rgba(s.textDecorationColor)};});})()`;
 await send('Runtime.enable');await send('Accessibility.enable');let comparisons=0;
 for(const version of ['current','app']){
  const rows=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.textControls&&document.querySelector('#upstream-print'))return true;await new Promise(r=>setTimeout(r,20))}throw Error('Text fixture unavailable')})()");
   const styles=[];
   for(const width of [420,1200])for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1700,deviceScaleFactor:1,mobile:false});
    await evaluate('window.renderTextCase('+JSON.stringify({mode,rtl,variables})+');'+settle);
    styles.push(await evaluate(snapshot));
   }
   const hover=[];
   for(const underline of ['always','hover','none']){
    const rect=await evaluate("(()=>{const el=document.querySelector('#link-"+underline+"');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await evaluate(settle);
    const result=await evaluate("(()=>{"+colorCode+"const s=getComputedStyle(document.querySelector('#link-"+underline+"'));return {line:s.textDecorationLine,color:rgba(s.textDecorationColor)};})()");
    assert.equal(result.line,underline==='none'?'none':'underline');hover.push(result);
   }
   await evaluate("document.querySelector('#router').focus();"+settle);
   assert.equal(await evaluate("window.textControls.linkRef.current===document.activeElement"),true,name+' router ref');
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});await evaluate(settle);
   const focus=await evaluate("({id:document.activeElement.id,visible:document.activeElement.classList.contains('Mui-focusVisible'),outline:getComputedStyle(document.activeElement).outlineStyle})");
   assert.equal(focus.id,'link-button');assert.equal(focus.visible,true);assert.notEqual(focus.outline,'none');
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await evaluate(settle);
   assert.deepEqual(await evaluate('window.textControls.events.current'),['button'],name+' keyboard button click');
   assert.equal(await evaluate("window.textControls.iconRef.current===document.querySelector('#outline')"),true);
   await evaluate("window.savedTextNode=document.activeElement;window.renderTextCase({mode:'dark',rtl:true,variables:true,tick:1});"+settle);
   assert.equal(await evaluate('document.activeElement===window.savedTextNode'),true,name+' focus after rerender');
   const ax=await send('Accessibility.getFullAXTree');const names=ax.nodes.filter(n=>n.role?.value==='image').map(n=>n.name?.value).sort();
   for(const label of ['small contest','medium contest','large contest','inherit contest','Outline','Custom contest','Back'])assert.ok(names.includes(label),name+' accessible '+label);
   const React=peer('react'),h=React.createElement,api=kind==='vpm'?require(require('./prepare.cjs')):peer(version==='current'?'@mui/material':'mui-material-app');
   const html=peer('react-dom/server').renderToString(h(React.Fragment,null,h(api.Typography,{variant:'h2'},'Contest'),h(api.Link,{href:'#local'},'Details'),h(api.SvgIcon,{titleAccess:'Contest icon'},h('path',{d:'M1 1h20v20H1z'}))));
   const hydration=await evaluate('window.textHydrate('+JSON.stringify(html)+')');assert.deepEqual(hydration,{same:true,errors:[]});
   if(process.env.VPM_MATERIAL_EVIDENCE){fs.mkdirSync(process.env.VPM_MATERIAL_EVIDENCE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(process.env.VPM_MATERIAL_EVIDENCE,name+'-text.png'),Buffer.from(shot.data,'base64'));}
   rows.push({styles,focus,names,hover});
   await evaluate('window.unmountTextCase();'+settle);
   assert.equal(await evaluate('window.textControls.linkRef.current===null && window.textControls.iconRef.current===null'),true,name+' ref cleanup');
  }
  try{assert.deepEqual(rows[1],rows[0],version+' text/icon rendering');}catch(e){fs.writeFileSync(path.join(os.tmpdir(),'vpm-text-style-failure.json'),JSON.stringify({version,rows},null,2));throw e;}
  comparisons+=rows[0].styles.length;
 }
 assert.deepEqual(exceptions,[]);console.log('Chrome text/icon styling: '+comparisons+' theme/viewport comparisons; unchanged Material icon callers, keyboard links, accessibility names, refs, focus and hydration pass');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child&&child.exitCode===null&&child.signalCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');const kill=setTimeout(()=>child.kill('SIGKILL'),3000);await done;clearTimeout(kill)}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
