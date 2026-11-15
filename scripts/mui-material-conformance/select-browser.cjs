"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-select-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./select-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/select-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/select-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle="new Promise(r=>setTimeout(r,60)).then(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))))";
 await send('Runtime.enable');await send('Accessibility.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 const key=async(key,code)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});await evaluate(settle)};
 const focusOpen=async id=>{await evaluate('document.getElementById('+JSON.stringify(id)+').focus()');await key('ArrowDown',40)};
 const styleControl=[];
 for(const version of ['current','app'])for(const kind of ['upstream','vpm']){
  const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
  await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.selectControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Select fixture unavailable')})()");
  assert.deepEqual(await evaluate('[document.getElementById("multi").textContent,document.getElementById("empty").textContent,document.getElementById("number").textContent]'),['B','All','None']);comparisons++;
  assert.equal(await evaluate('window.selectControls.refs.current.root.classList.contains("MuiInputBase-root")'),true);
  await evaluate('window.selectControls.refs.current.roster.focus()');assert.equal(await evaluate('document.activeElement.id'),'roster');
  await focusOpen('roster');assert.equal(await evaluate('document.querySelector("[role=listbox]").getAttribute("aria-labelledby")'),'roster-label');
  assert.equal(await evaluate('document.activeElement.textContent'),'Self');await key('ArrowDown',40);assert.equal(await evaluate('document.activeElement.textContent'),'Alice');await key('ArrowDown',40);assert.equal(await evaluate('document.activeElement.textContent'),'Chris');await key('Enter',13);
  assert.deepEqual(await evaluate('[document.getElementById("roster").textContent,document.activeElement.id,window.selectControls.events.current.at(-1).name,window.selectControls.events.current.at(-1).value]'),['Chris','roster','roster','c']);comparisons++;
  assert.equal(await evaluate('new FormData(document.getElementById("fixture")).get("roster")'),'c');
  await focusOpen('roster');await key('Home',36);assert.equal(await evaluate('document.activeElement.textContent'),'Self');await key('End',35);assert.equal(await evaluate('document.activeElement.textContent'),'Chris');await key('a',65);assert.equal(await evaluate('document.activeElement.textContent'),'Alice');await key('Escape',27);assert.equal(await evaluate('document.activeElement.id'),'roster');comparisons++;
  await focusOpen('multi');assert.equal(await evaluate('document.querySelector("[role=listbox]").getAttribute("aria-multiselectable")'),'true');await key('Home',36);await key('Enter',13);
  assert.deepEqual(await evaluate('[document.getElementById("multi").textContent,window.selectControls.events.current.at(-1).value,!!document.querySelector("[role=listbox]")]'),['A, B',['b','a'],true]);await key('Enter',13);assert.equal(await evaluate('document.getElementById("multi").textContent'),'B');await key('Tab',9);assert.equal(await evaluate('document.activeElement.id'),'multi');comparisons++;
  await focusOpen('readonly');assert.equal(await evaluate('!!document.querySelector("[role=listbox]")'),false);comparisons++;
  await focusOpen('controlled');assert.equal(await evaluate('window.selectControls.events.current.at(-1)'),'open');await key('Escape',27);assert.equal(await evaluate('window.selectControls.events.current.at(-1)'),'close');comparisons++;
  await focusOpen('number');await key('End',35);await key('Enter',13);assert.equal(await evaluate('window.selectControls.form.getValues("number")'),10);await evaluate('window.selectControls.form.reset();window.selectControls.form.setFocus("number");'+settle);assert.deepEqual(await evaluate('[document.getElementById("number").textContent,document.activeElement.id]'),['None','number']);comparisons++;
  await focusOpen('filter');await key('Home',36);await key('Enter',13);await key('ArrowDown',40);await key('Enter',13);await key('Escape',27);assert.deepEqual(await evaluate('window.selectControls.form.getValues("filter")'),['a','b']);comparisons++;
  await evaluate('window.savedSelect=document.getElementById("roster");window.renderVariants({tick:2,custom:true});'+settle);assert.equal(await evaluate('window.savedSelect===document.getElementById("roster")'),true);
  await evaluate('document.getElementById("roster-label").click();'+settle);assert.equal(await evaluate('document.activeElement.id'),'roster');
  await evaluate('window.renderVariants({disabled:true});'+settle);await focusOpen('roster');assert.equal(await evaluate('!!document.querySelector("[role=listbox]")'),false);comparisons++;
  await evaluate('window.renderVariants({});'+settle);
  // Browser autofill targets the hidden input; React must receive a real native
  // value change instead of a synthetic fixture callback.
  await evaluate('(()=>{const n=window.selectControls.refs.current.auto.node;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(n,"b");n.dispatchEvent(new Event("input",{bubbles:true}));})()');await evaluate(settle);
  assert.equal(await evaluate('document.getElementById("auto").textContent'),'Selected b');comparisons++;
  if(version==='current'){
   let index=0;
   for(const mode of ['light','dark'])for(const variables of [false,true])for(const custom of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,variables,custom})+');'+settle);
    const styles=await evaluate(`(()=>{const keys=['height','width','paddingTop','paddingRight','paddingBottom','paddingLeft','color','backgroundColor','fontSize','borderRadius','position','top','right','transform'];return [...document.querySelectorAll('#fixture .MuiSelect-select,#fixture .MuiSelect-icon,#native')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))}))})()`);
    if(kind==='upstream')styleControl.push(styles);else {
     // Input/OutlinedInput retain the app7 small-input padding override,
     // removed by current9. Assert exactly that inherited difference.
     if(custom)for(let j=0;j<styles.length;j++)if(['roster','multi','number'].includes(styles[j].id)){
      for(const key of ['paddingTop','paddingBottom']){assert.deepEqual([styles[j].css[key],styleControl[index][j].css[key]],['4px','6px']);styles[j].css[key]='6px';}
      assert.deepEqual([styles[j+1].css.top,styleControl[index][j+1].css.top],['3.5px','5.5px']);styles[j+1].css.top='5.5px';
     }
     assert.deepEqual(styles,styleControl[index],name+' display/icon CSS '+JSON.stringify({mode,variables,custom}));
    }index++;
   }
   comparisons+=index;
  }
  await evaluate('document.getElementById("auto").dispatchEvent(new MouseEvent("mousedown",{bubbles:true,button:0}));'+settle);
  assert.equal(await evaluate('document.querySelectorAll("[role=option]").length'),3,name+' pointer opening');
  await evaluate('document.querySelector("[role=option][data-value=c]").click();'+settle);
  assert.deepEqual(await evaluate('[document.getElementById("auto").textContent,document.activeElement.id]'),['Selected c','auto']);comparisons++;
  await evaluate('(()=>{const n=document.getElementById("native");n.value="b";n.dispatchEvent(new Event("change",{bubbles:true}));})()');
  assert.equal(await evaluate('new FormData(document.getElementById("fixture")).get("native")'),'b');comparisons++;
  const ax=await send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='combobox'&&n.name?.value?.includes('View as')),name+' accessible roster name');
  await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('document.querySelectorAll("[role=listbox]").length'),0);assert.equal(await evaluate('document.body.style.overflow'),'');
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
  await evaluate("(async()=>{for(let i=0;i<200;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
  assert.equal(await evaluate('window.savedHydrated===document.querySelector("#hydration [role=combobox]")'),true,name+' hydration retains display');comparisons++;
 }
 assert.equal(exceptions.length,0,JSON.stringify(exceptions));console.log(comparisons+' Select browser scenarios pass; scalar/multiple selection, form events, Hook Form, focus, hydration and labels');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await Promise.race([exited,new Promise(r=>setTimeout(r,2000))]);}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
