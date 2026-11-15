"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-radio-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./radio-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/radio-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/radio-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
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
 const snapshot=`(()=>{const keys=['display','flexDirection','height','width','paddingTop','marginLeft','marginRight','color','fontSize','position','transform','gap'];return [...document.querySelectorAll('#radios .MuiRadio-root,#radios .MuiRadio-root > input,#radios .MuiRadio-root svg,#radios .MuiFormGroup-root')].map(el=>({tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]]))}))})()`;
 for(const version of ['current','app']){
  const captures=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.radioControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Radio fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true])for(const disabled of [false,true]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom,disabled})+');'+settle);styles.push(await evaluate(snapshot));
   }
   captures.push(styles);comparisons+=styles.length;
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('window.radioControls.refs.current.friends===document.getElementById("friends")'),true);
   assert.equal(await evaluate('window.radioControls.refs.current.group.getAttribute("role")'),'radiogroup');
   await click('#friends');assert.deepEqual(await evaluate('window.radioControls.events.current.slice(-2)'),[['radio','friends',true],['group','friends']]);
   assert.equal(await evaluate('new FormData(document.getElementById("radios")).get("team")'),'friends');comparisons++;
   await evaluate('document.getElementById("friends").focus();'+settle);await key('ArrowDown',40);assert.equal(await evaluate('document.activeElement.id'),'casual');assert.equal(await evaluate('document.getElementById("casual").checked'),true);comparisons++;
   await key('ArrowDown',40);assert.equal(await evaluate('document.activeElement.id'),'stacked');comparisons++;
   await evaluate('document.getElementById("outside").focus();window.radioControls.actions.current.focus();'+settle);assert.equal(await evaluate('document.activeElement.id'),'stacked');
   await click('#late');assert.deepEqual(await evaluate('[document.getElementById("early").checked,document.getElementById("late").checked]'),[false,true]);comparisons++;
   assert.equal(await evaluate('document.querySelector("#automatic-a input").name!==document.querySelector("#automatic-b input").name'),true);
   await click('#rhf-rtl');assert.equal(await evaluate('window.radioControls.form.getValues("direction")'),'rtl');await evaluate('window.radioControls.form.reset();'+settle);assert.equal(await evaluate('document.getElementById("rhf-ltr").checked'),true);comparisons++;
   await click('#blocked');assert.equal(await evaluate('window.radioControls.events.current.includes("unexpected")'),false);
   await evaluate('window.savedRadio=document.getElementById("friends");window.renderVariants({tick:2});'+settle);assert.equal(await evaluate('window.savedRadio===document.getElementById("friends")'),true);
   if(kind==='vpm'){
    await click('#reset');assert.deepEqual(await evaluate('[document.getElementById("early").checked,document.getElementById("late").checked]'),[true,false]);
    await click('#late');await evaluate('document.getElementById("radios").addEventListener("reset",e=>e.preventDefault(),{once:true});HTMLFormElement.prototype.reset.call(document.getElementById("radios"));'+settle);assert.equal(await evaluate('document.getElementById("late").checked'),true);comparisons++;
   }
   await evaluate('window.renderVariants({disabled:true});'+settle);assert.equal(await evaluate('document.getElementById("friends").disabled'),true);
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('window.radioControls.refs.current.friends'),null);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")&&document.getElementById("hydrated").checked'),true);comparisons++;
  }
  assert.deepEqual(captures[1],captures[0],version+' computed styles');
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' Radio native navigation, settings/signup, reset, hydration and computed-style checks pass');
 }finally{socket?.close();child?.kill();server?.close();for(const p of pending.values())clearTimeout(p.timer);fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});}})().catch(e=>{console.error(e);process.exitCode=1;});
