'use strict';
// Verify the actual network boundary, not just a bundler's metadata.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const cwd=process.argv[2],chunks=JSON.parse(fs.readFileSync(path.join(cwd,'react-chunks.json'))),requests=[];
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vlx-react-chrome-'));
const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
let server,child,socket,loaded,denyGlyph=false,sequence=0;const pending=new Map();
(async()=>{try{
 let port;
 server=http.createServer((req,res)=>{requests.push(req.url);if(req.url.split('?')[0]==='/'){res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',"require-trusted-types-for 'script'");res.end('<!doctype html><html lang="en"><title>VLX React loading</title><div id="root"></div><script type="module" src="/'+chunks.entry+'"></script></html>');return;}
  const file=path.join(cwd,'react-dist',path.basename(req.url));if((denyGlyph&&chunks.glyph.includes(path.basename(req.url)))||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(file));});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
 ({child,port}=await require('./launch-chrome.cjs')(chrome,profile));
 const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Page.loadEventFired')loaded?.();if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Page.enable');await send('Accessibility.enable');
 const wait=condition=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${condition})return true;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out');})()`);
 for(const mode of ['lazy','preloaded','unavailable']){
 denyGlyph=mode==='unavailable';
 requests.length=0;await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 const loadedPromise=new Promise(r=>{loaded=r});await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'?'+mode});await loadedPromise;
 await wait('window.ready && document.getElementById("root").textContent==="Plain prose"');
 assert.equal(await evaluate(`(()=>{try{document.createElement('span').innerHTML='<b>blocked</b>';return false;}catch(e){return e instanceof TypeError;}})()`),true,'Trusted Types enforcement is active, without a permissive policy');
 for(const file of chunks.glyph)assert(!requests.includes('/'+file),'Plain prose must not request the glyph chunk');
 await evaluate(`window.htmlWrites=0;const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  Object.defineProperty(Element.prototype,'innerHTML',{...descriptor,set(value){window.htmlWrites++;return descriptor.set.call(this,value);}});true`);
 await evaluate('window.mountMath().then(()=>true)');
 if(denyGlyph){await wait('document.querySelector("[data-load-error]")');assert.equal(await evaluate('document.querySelectorAll("math").length'),0);await evaluate('window.unmountMath();true');continue;}
 await wait('document.querySelectorAll("math").length===4 && document.querySelector("[data-case=display] [tabindex]")');
 for(const file of chunks.glyph)assert(requests.includes('/'+file),'Math must request deferred glyphs');
 assert.equal(await evaluate('window.htmlWrites'),0,'Initial math mounts without HTML insertion');
 await evaluate(`window.originalFormulas=[...document.querySelectorAll('[data-vlx="math"]')];true`);
 for(const kind of ['display','inline','text']){
  const preserved=await evaluate(`(()=>{
   const formula=document.querySelector('[data-case=${kind}] [data-vlx="math"]');
   formula.focus();formula.scrollLeft=77;const before=formula.scrollLeft;
   if(before!==77||document.activeElement!==formula)throw Error('Fixture must have a focused, horizontally scrolled formula');
   for(let i=0;i<20;i++)window.updateMath({});
   return {same:window.originalFormulas.every((node,i)=>node===document.querySelectorAll('[data-vlx="math"]')[i]),focus:document.activeElement===formula,scroll:document.querySelector('[data-case=${kind}] [data-vlx="math"]').scrollLeft===before,writes:window.htmlWrites};
  })()`);
  assert.deepEqual(preserved,{same:true,focus:true,scroll:true,writes:0},mode+' '+kind+': timer updates preserve formula nodes, focus and scroll');
 }
 assert.equal(await evaluate(`window.updateMath({label:'Translated expression'});window.originalFormulas.every(node=>node.isConnected)&&document.querySelector('[data-case=display] [data-vlx="math"]').getAttribute('aria-label')==='Translated expression'&&window.htmlWrites===0`),true,mode+': provider defaults update without replacing content');
 assert.equal(await evaluate(`window.updateMath({tex:'y+1'});document.querySelector('[data-case=display] math').textContent.includes('y')&&window.originalFormulas[0]===document.querySelector('[data-case=display] [data-vlx="math"]')&&window.htmlWrites===0`),true,mode+': changed TeX reconciles existing DOM without HTML insertion');
 if(mode==='preloaded')for(const display of [false,true]){
  await evaluate(`window.mountCases(${display});true`);
  const state=await evaluate(`(()=>({count:document.querySelectorAll('math').length,expected:window.cases.length,writes:window.htmlWrites,slanted:getComputedStyle(document.querySelector('.vlx-slanted')).fontStyle,overflow:[...document.querySelectorAll('.vlx-math svg')].some(s=>{const g=s.querySelector('g'),b=g.getBBox(),v=s.viewBox.baseVal,t=g.transform.baseVal.consolidate().matrix;return b.x+t.e<-.01||b.y+t.f<-.01||b.x+b.width+t.e>v.width+.01||b.y+b.height+t.f>v.height+.01})}))()`);
  assert.equal(state.count,state.expected);assert.equal(state.writes,0);assert.equal(state.slanted,'oblique');assert.equal(state.overflow,false,'Native SVG bounds');
  const ax=await send('Accessibility.getFullAXTree'),visible=ax.nodes.filter(node=>!node.ignored);
  assert.equal(visible.filter(node=>node.role?.value==='MathMLMath').length,state.expected,'Native MathML remains accessible');
  assert.equal(visible.filter(node=>node.role?.value==='image').length,0,'Native decorative SVG remains hidden');
  for(const role of ['MathMLFraction','MathMLSquareRoot','MathMLSubSup','MathMLTable',...(display?['MathMLUnderOver']:[])])assert(visible.some(node=>node.role?.value===role),role);
  await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
  assert.equal(await evaluate(`(()=>{const i=window.cases.findIndex(c=>c[0]==='colored formula');return getComputedStyle(document.querySelector('[data-fixture="'+i+'"] path')).fill===getComputedStyle(document.body).color;})()`),true,'Native colored math honors forced system colors');
  await send('Emulation.setEmulatedMedia',{features:[]});
 }
 await evaluate('window.unmountMath();true');await wait('!document.getElementById("root").hasChildNodes()');
 }
 console.log('Chrome React: zero HTML writes from initial mounts through changed/unchanged updates under Trusted Types; stable focus/scroll, 114 native formula layouts, MathML accessibility, oblique/forced-color styles, lazy loading, error boundaries and unmount pass.');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}await new Promise(r=>server?server.close(r):r());fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
