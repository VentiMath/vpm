"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-autocomplete-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./autocomplete-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/autocomplete-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/autocomplete-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};


 const settle='new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
 const wait=c=>evaluate(`(async()=>{for(let i=0;i<300;i++){if(${c})return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out: '+${JSON.stringify(c)})})()`);
 await send('Runtime.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 const key=async(k,code,extra={})=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code:k,windowsVirtualKeyCode:code,...extra});await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code:k,windowsVirtualKeyCode:code});await evaluate(settle);};
 const focus=async id=>{await evaluate('document.getElementById('+JSON.stringify(id)+').focus();'+settle);};
 const type=async text=>{await send('Input.insertText',{text});await evaluate(settle);};
 const snapshot=`(()=>{const n=document.activeElement,a=n?.getAttribute('aria-activedescendant');return {focus:n?.id,value:n?.value,active:a?document.getElementById(a)?.textContent:null,options:[...document.querySelectorAll('[role=option]')].map(n=>[n.textContent,n.getAttribute('aria-selected'),n.getAttribute('aria-disabled')]),values:window.autoControls.form.getValues(),student:document.getElementById('student').value,events:window.autoControls.events.slice()}})()`;
 let checks=0;for(const version of ['current','app']){const captures=[];
  for(const kind of ['upstream','vpm']){const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});await wait('window.autoControls');const out=[];const capture=async label=>{out.push({label,state:await evaluate(snapshot)});checks++;};
   await focus('student');await key('ArrowDown',40);await capture('open');await key('ArrowDown',40);await capture('skip disabled');await key('Enter',13);await capture('select student');
   await key('ArrowDown',40);await key('Home',36);await key('Enter',13);await capture('home selection');
   await key('ArrowDown',40);await evaluate(settle);
   const point=await evaluate('(()=>{const n=[...document.querySelectorAll("[role=option]")].find(n=>n.textContent==="Chris");n.scrollIntoView({block:"nearest"});const r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()');
   await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await evaluate(settle);await capture('pointer selection');assert.equal(await evaluate('document.getElementById("student").value'),'Chris');

   await evaluate('document.getElementById("student").closest(".MuiAutocomplete-root").querySelector("[title=Clear]").click();'+settle);await capture('clear student');
   await focus('schools');await type('New school');await key('Enter',13);await capture('create school');await key('Backspace',8);await capture('remove school');
   await type('ecole');await key('ArrowDown',40);await key('Enter',13);await capture('accent selection');
   await evaluate('window.autoControls.form.reset();window.autoControls.form.setFocus("schools");'+settle);await capture('form reset and ref');
   await key('ArrowLeft',37);assert.equal(await evaluate('document.activeElement.getAttribute("data-tag-index")??document.activeElement.getAttribute("data-item-index")'),'0');await key('ArrowRight',39);assert.equal(await evaluate('document.activeElement.id'),'schools');
   await focus('school');await type('New district');await key('Enter',13);await capture('controlled free solo');
   await focus('highlight');await key('ArrowDown',40);await capture('auto highlight');await evaluate('window.autoControls.setStudents([{id:"d",label:"Diana"},{id:"e",label:"Evan"}]);'+settle);await capture('replaced options');await key('Enter',13);await capture('new first option');
   await focus('controlled');await type('cam');await capture('controlled input');await key('Escape',27);await capture('controlled close');
   await focus('empty');await key('ArrowDown',40);assert.equal(await evaluate('document.querySelector(".MuiAutocomplete-loading").textContent'),'Loading…');await key('Escape',27);
   await focus('readonly');await key('ArrowDown',40);assert.equal(await evaluate('!!document.querySelector("[role=listbox]")'),false);
   await focus('schools');await type('Composing');await evaluate('document.getElementById("schools").dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}))');await key('Enter',229);await capture('IME does not select');await evaluate('document.getElementById("schools").dispatchEvent(new CompositionEvent("compositionend",{bubbles:true}))');await key('Escape',27);
   await focus('outside');await evaluate('window.savedInput=document.getElementById("student");window.renderAutocomplete({tick:1});'+settle);assert.equal(await evaluate('window.savedInput===document.getElementById("student")'),true);
   const styles=[];for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true]){await evaluate('window.renderAutocomplete('+JSON.stringify({mode,rtl,variables,custom})+');'+settle);styles.push(await evaluate(`['schools','student'].map(id=>{const n=document.getElementById(id),s=getComputedStyle(n),r=n.closest('.MuiInputBase-root'),rs=getComputedStyle(r);return {id,input:Object.fromEntries(['paddingTop','paddingBottom','paddingLeft','paddingRight','fontSize','color'].map(k=>[k,s[k]])),root:Object.fromEntries(['paddingTop','paddingBottom','gap','flexWrap'].map(k=>[k,rs[k]]))}})`));}
   out.push({styles});await evaluate('window.renderAutocomplete({});window.autoControls.form.reset();'+settle);await focus('schools');await key('ArrowDown',40);await evaluate(settle);
   const a11y=await send('Accessibility.getFullAXTree');assert(a11y.nodes.some(n=>n.role?.value==='combobox'&&n.name?.value==='Schools'));assert(a11y.nodes.some(n=>n.role?.value==='listbox'));
   assert.equal(await evaluate('document.activeElement.id'),'schools');const bounds=await evaluate('(()=>{const a=document.getElementById("schools").closest(".MuiInputBase-root").getBoundingClientRect(),b=document.querySelector(".MuiAutocomplete-popper").getBoundingClientRect();return {width:Math.abs(a.width-b.width),below:b.top>=a.bottom-1}})()');assert(bounds.width<1&&bounds.below,name+' anchored popup');
   await key('Escape',27);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await wait('window.autoControls&&window.hydrationReady');assert.equal(await evaluate('window.savedHydrated===document.getElementById("schools")'),true);captures.push(out);
  }
  fs.writeFileSync(path.join(profile,version+'-captures.json'),JSON.stringify(captures,null,2));// Material 9 stops showing unrelated options after a controlled free-solo
  // value is typed; app 7 keeps the full list. Match the current API explicitly.
  if(version==='app'){const legacy=captures[0].find(x=>x.label==='controlled free solo'),current=captures[1].find(x=>x.label==='controlled free solo');assert.equal(legacy.state.options.length,4);assert.deepEqual(current.state.options,[]);legacy.state.options=[];}
  assert.deepEqual(captures[1],captures[0],version+' Autocomplete interaction and styles');
 }
 assert.deepEqual(exceptions,[]);console.log(checks+' current/app interaction snapshots plus themes, positioning, Hook Form, IME, ARIA, stable nodes and hydration pass');
 }finally{require('./paths.cjs').esbuild.stop();socket?.close();child?.kill();server?.close();server?.closeAllConnections();for(const p of pending.values())clearTimeout(p.timer);if(process.env.VPM_KEEP_BROWSER)console.log('Browser evidence '+profile);else fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
