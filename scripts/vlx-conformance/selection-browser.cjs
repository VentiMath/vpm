'use strict';
// Isolated real-Chrome fixture: no user profile, application state or clipboard.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const packageDir=path.resolve(process.env.VPM_VLX_PACKAGE_DIR||path.join(__dirname,'../../packages/vlx'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-browser-'));
const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert.ok(chrome,'Set CHROME_BIN to Chrome');
let server,child,socket,loaded;const errors=[];const pending=new Map();let sequence=0;
const output=process.env.VLX_BROWSER_OUTPUT; if(output)fs.mkdirSync(output,{recursive:true});
(async()=>{
 const entry=path.join(temp,'entry.mjs');fs.writeFileSync(entry,`import * as vlx from ${JSON.stringify(path.join(packageDir,'index.mjs'))};import {observeMath} from ${JSON.stringify(path.join(packageDir,'dom.mjs'))};window.vlx=vlx;window.observeMath=observeMath;window.ready=true;`);
 const build=spawnSync('bun',['build',entry,'--target=browser','--outfile='+path.join(temp,'bundle.js')],{encoding:'utf8'});assert.equal(build.status,0,build.stdout+build.stderr);
 const html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>VLX browser acceptance</title><style>body{overflow-wrap:anywhere;margin:0;padding:24px;font:20px/1.6 system-ui;background:#fff;color:#172332}*{box-sizing:border-box}main{max-width:100%;min-width:0}section{padding:12px;margin:12px 0;border:1px solid #8b939e;min-width:0}h1{font-size:24px}h2{font-size:18px;margin:0 0 8px}button{font:inherit;max-width:100%}body.dark{background:#131b26;color:#f5f7ff}body.dark section{border-color:#8b939e}</style></head><body><h1>VLX browser acceptance</h1><button id="before">Before formulas</button><main id="fixture"></main><button id="after">After formulas</button><script type="module" src="/bundle.js"></script></body></html>';
 server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?fs.readFileSync(path.join(temp,'bundle.js')):html)});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 const profile=path.join(temp,'profile');let port;({child,port}=await require('./launch-chrome.cjs')(chrome,profile));
 const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});socket.onmessage=e=>{const x=JSON.parse(e.data);if(x.method==='Page.loadEventFired')loaded?.();if(x.method==='Runtime.exceptionThrown'){errors.push(x.params.exceptionDetails);console.error(JSON.stringify(x.params.exceptionDetails));}const p=pending.get(x.id);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
 await send('Runtime.enable');await send('Page.enable');await send('Accessibility.enable');await send('Emulation.setDeviceMetricsOverride',{width:1000,height:900,deviceScaleFactor:1,mobile:false});const loadedPromise=new Promise(r=>{loaded=r});await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});await loadedPromise;await evaluate('(async()=>{for(let i=0;i<100;i++){if(window.ready)return true;await new Promise(r=>setTimeout(r,10));}throw Error("Bundle did not load: "+location.href)})()');



 const cases=[['power','n^6-1','n6'],['subscript','x_2+1','x2'],['fraction','\\frac{1}{2}+1','12'],['sum','\\sum_{i=1}^{n}i^2+1',null]];
 const katex=require('katex'),dist=path.dirname(require.resolve('katex/package.json'));
 const css=fs.readFileSync(path.join(dist,'dist/katex.min.css'),'utf8').replace(/url\((fonts\/[^)]+)\)/g,(_,file)=>'url(data:font/woff2;base64,'+fs.readFileSync(path.join(dist,'dist',file)).toString('base64')+')');
 await evaluate('(()=>{const s=document.createElement("style");s.textContent='+JSON.stringify(css)+';document.head.append(s);return true})()');
 await evaluate('document.getElementById("fixture").innerHTML='+JSON.stringify(katex.renderToString('n^6-1'))+';true');
 await evaluate('document.fonts.ready.then(()=>true)');
 const baseline=await evaluate('(()=>{const root=document.querySelector(".katex-html"),nodes=[];const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walk.nextNode())if(walk.currentNode.textContent.trim())nodes.push(walk.currentNode);const n=nodes.find(n=>n.textContent==="n"),six=nodes.find(n=>n.textContent==="6"),r=document.createRange();r.setStart(n,0);r.setEnd(six,1);getSelection().removeAllRanges();getSelection().addRange(r);return getSelection().toString().replace(/\\s/g,"")})()');
 assert.equal(baseline,'n6');
 await evaluate('document.getElementById("fixture").innerHTML="<p id=demo></p>";window.disconnect=observeMath(document.body);true');
 const report=[];
 const copy=()=>evaluate('(()=>{const d=new DataTransfer(),e=new ClipboardEvent("copy",{clipboardData:d,cancelable:true});document.dispatchEvent(e);return {native:getSelection().toString(),text:d.getData("text/plain"),handled:e.defaultPrevented}})()');
 for(const [name,tex,expected]of cases)for(const display of [false,true]){
  await evaluate('document.querySelector("#demo").innerHTML="Before "+vlx.renderMath('+JSON.stringify(tex)+',{display:'+display+'}).html+" after";true');
  const points=await evaluate('[...document.querySelectorAll("#demo .vlx-select")].map(e=>{const r=e.getBoundingClientRect();return {c:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height}})');
  const a=points[0],b=points[1],ax=a.x+.1,ay=a.y+a.h*.6,bx=b.x+b.w-.1,by=b.y+b.h*.6;
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:ax,y:ay,button:'left',clickCount:1});
  for(let i=1;i<=16;i++)await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:ax+(bx-ax)*i/16,y:ay+(by-ay)*i/16,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:bx,y:by,button:'left',clickCount:1});
  const partial=await copy();assert(partial.handled,name+' copy');assert.equal(partial.text,expected||a.c+b.c,name+' native drag');
  assert(!partial.text.includes('$')&&!partial.text.includes('\\['),'Partial copies stay partial');
  const before=await evaluate('getSelection().focusNode.textContent+":"+getSelection().focusOffset');
  for(let i=0;i<3;i++){
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39,modifiers:8});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39,modifiers:8});
  }
  const after=await evaluate('getSelection().focusNode.textContent+":"+getSelection().focusOffset');
  assert.notEqual(before,after,name+' keyboard extends native selection');
  await evaluate('(()=>{const r=document.createRange();r.selectNode(document.querySelector("#demo .vlx-math"));getSelection().removeAllRanges();getSelection().addRange(r);return true})()');
  assert.equal((await copy()).text,display?'\\['+tex+'\\]':'$'+tex+'$');
  report.push({name,display,partial:partial.text,keyboardAdvanced:true});
 }
 // Desktop CDP emulation cannot verify Android/iOS native selection handles.
 await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await evaluate('document.querySelector("#demo").innerHTML=vlx.renderMath("n^6-1").html;getSelection().removeAllRanges();true');
 const touch=await evaluate('(()=>{const r=document.querySelector(".vlx-select").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await new Promise(r=>setTimeout(r,750));await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const touchSelection=await evaluate('getSelection().toString()');
 assert.equal(await evaluate('getComputedStyle(document.querySelector(".vlx-select")).userSelect'),'text');
 await send('Emulation.setTouchEmulationEnabled',{enabled:false});
 assert.equal(errors.length,0);
 console.log(JSON.stringify({katexPartial:baseline,cases:report,touchEmulationSelection:touchSelection,physicalTouch:'not verified'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}if(server)await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});});
