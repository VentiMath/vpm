'use strict';
// Isolated Chrome/SwiftShader: no app account, user profile, or clipboard.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const file=path.resolve(process.argv[2]),revision=process.argv[3]||'187',output=process.env.VLX_THREE_OUTPUT;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-three-browser-'));
const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
let child,socket,sequence=0;const pending=new Map(),errors=[];
(async()=>{
 assert(chrome,'Set CHROME_BIN');if(output)fs.mkdirSync(output,{recursive:true});
 child=spawn(chrome,['--headless=new','--no-sandbox','--no-first-run','--no-default-browser-check','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=0','--user-data-dir='+temp,'about:blank'],{stdio:['ignore','ignore','pipe']});
 const port=await require('../vlx-conformance/launch-chrome.cjs').waitForPort(child,path.join(temp,'DevToolsActivePort'));
 const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data);if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails);const p=pending.get(x.id);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
 const wait=()=>evaluate('(async()=>{for(let i=0;i<300;i++){if(window.vlxSurfaceReceipt?.ready||window.vlxSurfaceReceipt?.failures.length)return window.vlxSurfaceReceipt;await new Promise(r=>setTimeout(r,50));}throw Error("Surface did not initialize")})()');
 const capture=async name=>{if(output){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(shot.data,'base64'));}};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:require('node:url').pathToFileURL(file).href});
 const initial=await wait();assert.equal(initial.three,revision);assert.equal(initial.ready,true,JSON.stringify(initial));assert.deepEqual(initial.failures,[]);assert.equal(initial.tex.length,12);assert.equal(initial.textures-initial.internalTextures,3);
 // Origin-clean pixels, distinct outlines, bounded dimensions, and sRGB textures.
 const textures=await evaluate(`vlxSurfaceTest.pageMeshes.map(m=>{const t=m.material.map,c=t.image,ctx=c.getContext('2d');return {width:c.width,height:c.height,colorSpace:t.colorSpace,anisotropy:t.anisotropy,ink:m.userData.hits.map(h=>{const a=ctx.getImageData(Math.floor(h.x*c.width),Math.floor(h.y*c.height),Math.max(1,Math.floor(h.width*c.width)),Math.max(1,Math.floor(h.height*c.height))).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]<120&&a[i+1]<120&&a[i+2]<120)n++;return n;})}})`);
 for(const t of textures){assert.equal(t.width,1024);assert.equal(t.height,1366);assert.equal(t.colorSpace,'srgb');assert(t.anisotropy>=1);assert(t.ink.every(n=>n>5),JSON.stringify(t));}
 await capture('desk');
 for(const view of ['close','angle']){await evaluate(`document.querySelector('[data-view="${view}"]').click();true`);await capture(view);}
 // Replace resolution without accumulating GPU textures; latest async update wins.
 const resized=await evaluate('(async()=>{await Promise.all([vlxSurfaceTest.quality(512),vlxSurfaceTest.quality(2048),vlxSurfaceTest.quality(1024)]);return vlxSurfaceReceipt})()');assert.equal(resized.width,1024);assert.equal(resized.textures,initial.textures);
 // A real raycast click opens the same source formula in the readable view.
 const point=await evaluate(`(()=>{document.querySelector('[data-view="close"]').click();const s=vlxSurfaceTest,m=s.pageMeshes[0],h=m.userData.hits[0],p=s.camera.position.clone().set((h.x+h.width/2-.5)*2.1,(.5-h.y-h.height/2)*2.8,.08).applyMatrix4(m.matrixWorld).project(s.camera),r=s.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
 assert.equal(await evaluate('document.activeElement.id'),'formula-0-0');assert.equal(await evaluate('document.querySelector("#reader").hidden'),false);
 assert.equal(await evaluate('document.querySelectorAll("#reader math").length'),12);
 const copied=await evaluate(`(()=>{const nodes=document.querySelectorAll('#formula-0-0 .vlx-select'),r=document.createRange();r.setStart(nodes[0].firstChild,0);r.setEnd(nodes[1].firstChild,nodes[1].textContent.length);getSelection().removeAllRanges();getSelection().addRange(r);const d=new DataTransfer(),e=new ClipboardEvent('copy',{clipboardData:d,cancelable:true});document.dispatchEvent(e);return d.getData('text/plain');})()`);assert.equal(copied,'$n^6$');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await capture('reader-mobile');
 await evaluate('vlxSurfaceTest.dispose();true');assert.equal(await evaluate('vlxSurfaceReceipt.disposedTextures'),initial.internalTextures);
 // A device without WebGL still gets the complete source/MathML reader.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:getContext.call(this,type,...args)};'});
 await send('Page.reload');const fallback=await wait();assert.equal(fallback.ready,false);assert(fallback.failures.length>0);assert.equal(await evaluate('document.querySelector("#reader").hidden'),false);assert.equal(await evaluate('document.querySelectorAll("#reader math").length'),12);
 assert.deepEqual(errors,[]);
 const report={three:revision,initial,textures,partialCopy:copied,raycast:true,latestUpdateWins:true,disposed:true,noWebGLReader:true,physicalGPUAndScreenReader:'not verified'};
 if(output)fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
