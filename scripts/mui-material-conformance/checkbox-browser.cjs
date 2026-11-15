"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-checkbox-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./checkbox-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/checkbox-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/checkbox-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(x.method==='Runtime.consoleAPICalled'&&x.params.type==='error')exceptions.push(x.params.args.map(a=>a.value||a.description).join(' '));if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle='new Promise(r=>setTimeout(r,70))';
 await send('Runtime.enable');await send('Accessibility.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 const key=async(key,code)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key,windowsVirtualKeyCode:code});await evaluate(settle)};
 const click=async selector=>{await evaluate('document.querySelector('+JSON.stringify(selector)+').click();'+settle)};
 const snapshot=`(()=>{const keys=['display','flexDirection','height','width','paddingTop','paddingRight','paddingBottom','paddingLeft','marginLeft','marginRight','marginTop','color','backgroundColor','borderRadius','fontSize','fontWeight','lineHeight','position','opacity'];return [...document.querySelectorAll('#checks .MuiCheckbox-root,#checks .MuiCheckbox-root > input,#checks .MuiCheckbox-root > svg,#checks .MuiFormControlLabel-root,#checks .MuiFormControlLabel-label,#checks .MuiFormControlLabel-asterisk')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))}))})()`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.checkControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Checkbox fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true])for(const disabled of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom,disabled})+');'+settle);styles.push(await evaluate(snapshot));
   }
   captures.push(styles);comparisons+=styles.length;
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.checkControls.refs.current.input===document.getElementById("interest")'),true,name+' native ref');
   assert.equal(await evaluate('window.checkControls.refs.current.root.classList.contains("MuiCheckbox-root")'),true,name+' root ref');
   assert.deepEqual(await evaluate('[document.getElementById("all").indeterminate,document.getElementById("all").getAttribute("data-indeterminate")]'),[kind==='vpm'||version==='current', 'true'],name+' current mixed DOM property');
   await click('#interest-label');assert.deepEqual(await evaluate('[document.getElementById("interest").checked,window.checkControls.events.current.at(-1)]'),[true,[true,true,'interest']]);comparisons++;
   await evaluate('document.getElementById("interest").focus();'+settle);assert.equal(await evaluate('JSON.parse(document.getElementById("form-state").textContent).focused'),true);
   await key(' ',32);assert.equal(await evaluate('document.getElementById("interest").checked'),false);await key('Enter',13);assert.equal(await evaluate('document.getElementById("interest").checked'),false);comparisons++;
   await evaluate('window.checkControls.setChecked(true);'+settle);assert.equal(await evaluate('new FormData(document.getElementById("checks")).get("interest")'),'on');
   await click('#all');assert.deepEqual(await evaluate('[0,1,2].map(i=>document.getElementById("row-"+i).checked)'),[true,true,true]);await click('#row-1');assert.equal(await evaluate('document.getElementById("all").getAttribute("data-indeterminate")'),'true');await click('#all');await click('#all');assert.deepEqual(await evaluate('[0,1,2].map(i=>document.getElementById("row-"+i).checked)'),[false,false,false]);comparisons++;
   await click('#rhf');assert.equal(await evaluate('window.checkControls.form.getValues("interest")'),true);
   await evaluate('window.checkControls.form.reset();'+settle);await evaluate('window.checkControls.form.setFocus("interest");'+settle);assert.deepEqual(await evaluate('[document.getElementById("rhf").checked,document.activeElement.id]'),[false,'rhf']);comparisons++;
   await click('#remember');assert.equal(await evaluate('window.checkControls.form.getValues("remember")'),true);comparisons++;
   await click('#radio-label');await click('#switch-label');assert.deepEqual(await evaluate('[document.getElementById("radio").checked,document.getElementById("switch").checked]'),[true,true]);comparisons++;
   await click('#prevented');assert.equal(await evaluate('window.checkControls.events.current.includes("unexpected")'),false);comparisons++;
   await evaluate('window.savedCheck=document.getElementById("interest");window.renderVariants({tick:2,custom:true});'+settle);assert.equal(await evaluate('window.savedCheck===document.getElementById("interest")'),true);
   await evaluate('window.renderVariants({disabled:true});'+settle);await click('#interest-label');assert.equal(await evaluate('document.getElementById("interest").checked'),true);comparisons++;
   await evaluate('window.renderVariants({});'+settle);
   await click('#uncontrolled');assert.equal(await evaluate('document.getElementById("uncontrolled").checked'),false);await click('#reset');assert.equal(await evaluate('document.getElementById("uncontrolled").checked'),true);
   assert.equal(await evaluate('document.getElementById("uncontrolled").parentElement.classList.contains("Mui-checked")'),kind==='vpm',name+' reset icon follows native state');comparisons++;
   if(kind==='vpm'){
    await click('#uncontrolled');await evaluate('document.getElementById("checks").addEventListener("reset",e=>e.preventDefault(),{once:true})');await click('#reset');assert.equal(await evaluate('document.getElementById("uncontrolled").checked'),false);assert.equal(await evaluate('document.getElementById("uncontrolled").parentElement.classList.contains("Mui-checked")'),false);
   }
   const ax=await send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='checkbox'&&n.name?.value==='Join local ARML'),name+' label accessible name');
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('window.checkControls.refs.current.input'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});await evaluate("(async()=>{for(let i=0;i<200;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);assert.equal(await evaluate('window.savedHydrated===document.querySelector("#hydration input")'),true);comparisons++;
  }
  try{assert.deepEqual(captures[1],captures[0],version+' Checkbox/label CSS');}catch(error){fs.writeFileSync(path.join(os.tmpdir(),'vpm-checkbox-css.json'),JSON.stringify({version,upstream:captures[0],vpm:captures[1]},null,2));throw error;}
 }
 assert.equal(exceptions.length,0,JSON.stringify(exceptions));console.log(comparisons+' Checkbox/FormControlLabel browser comparisons pass; native form/keyboard, mixed selection, Hook Form, labels, refs and hydration');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await Promise.race([exited,new Promise(r=>setTimeout(r,2000))]);}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1});
