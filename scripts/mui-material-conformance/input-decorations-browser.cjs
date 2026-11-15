"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-input-decorations-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./input-decorations-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/input-decorations-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/input-decorations-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle="new Promise(r=>setTimeout(r,40)).then(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))))";
 const snapshot=`(()=>{const keys=['display','height','width','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','fontSize','fontWeight','lineHeight','color','borderRadius','borderTopWidth','borderTopColor','borderTopStyle','maxWidth','textAlign','visibility','transform','pointerEvents','transitionDuration','transitionTimingFunction'];return [...document.querySelectorAll('#variants input,#variants textarea:not([aria-hidden]),#variants fieldset,#variants legend,#variants label,#variants .MuiInputBase-root,#variants .MuiInputAdornment-root')].map(el=>({tag:el.tagName,id:el.id,text:['LEGEND','LABEL'].includes(el.tagName)?el.textContent:undefined,css:Object.fromEntries(keys.map(k=>[k,getComputedStyle(el)[k]])),before:el.classList.contains('MuiInput-root')?['borderBottomWidth','borderBottomColor','borderBottomStyle','transform'].map(k=>getComputedStyle(el,'::before')[k]):undefined,after:el.classList.contains('MuiInput-root')?['borderBottomWidth','borderBottomColor','transform'].map(k=>getComputedStyle(el,'::after')[k]):undefined}))})()`;
 await send('Runtime.enable');await send('Accessibility.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});let comparisons=0;
 for(const version of ['current','app']){
  const rows=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;console.log('Checking '+name);await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.variantControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Variant fixture unavailable')})()");
   const styles=[];
   for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true])for(const flags of [{},{disabled:true,error:true}]){
    await evaluate('window.renderVariants('+JSON.stringify({mode,rtl,variables,custom,...flags})+');'+settle);
    styles.push({mode,rtl,variables,custom,flags,values:await evaluate(snapshot)});
   }
   await evaluate('window.renderVariants({});'+settle);
   assert.equal(await evaluate('document.getElementById("context-isolation").textContent'),'isolated');
   assert.equal(await evaluate('document.querySelector("label[for=standard]").dataset.shrink'),'false');
   assert.equal(await evaluate('document.getElementById("plain-label").tagName'),'SPAN');
   const click=async expression=>{
    const point=await evaluate(`(()=>{const b=(${expression}).getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await evaluate(settle);
   };
   await click('document.querySelector("#standard-small").parentElement.querySelector(".MuiInputAdornment-positionStart")');
   assert.equal(await evaluate('document.activeElement.id'),'standard-small','pointer-transparent adornment focuses input');
   await click('document.querySelector("#standard-small").parentElement.querySelector("button")');
   assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Show fee','interactive adornment retains button focus');
   for(const id of ['standard','outlined'])assert.deepEqual(await evaluate(`[window.variantControls.refs.current.${id}Label===document.querySelector('label[for="${id}"]'),window.variantControls.refs.current.${id}Adornment===document.getElementById('${id}-small').parentElement.querySelector('.MuiInputAdornment-positionStart')]`),[true,true]);
   await evaluate('document.querySelector("#outside").focus();'+settle);
   const states=[];
   for(const id of ['standard','outlined']){
    assert.equal(await evaluate('window.variantControls.refs.current.'+id+'===document.getElementById('+JSON.stringify(id)+')'),true,name+' input ref');
    await evaluate('document.querySelector("#outside").focus();document.getElementById('+JSON.stringify(id)+').focus();'+settle);
    states.push(await evaluate(snapshot));assert.equal(await evaluate(`document.querySelector('label[for="${id}"]').dataset.shrink`),'true');
    assert.equal(await evaluate('JSON.parse(document.getElementById("'+id+'-state").textContent).focused'),true,name+' '+id+' '+JSON.stringify(await evaluate('[document.activeElement.id,document.getElementById("'+id+'").disabled,document.getElementById("'+id+'-state").textContent]')));
    await send('Input.insertText',{text:'AMC'});await evaluate(settle);
    assert.equal(await evaluate('JSON.parse(document.getElementById("'+id+'-state").textContent).filled'),true);
    await evaluate('window.savedField=document.getElementById('+JSON.stringify(id)+');window.savedField.setSelectionRange(1,2);window.renderVariants({tick:2});'+settle);
    assert.deepEqual(await evaluate('[window.savedField===document.activeElement,window.savedField.selectionStart,window.savedField.selectionEnd]'),[true,1,2]);
    await evaluate('window.variantControls.setValue("");document.querySelector("#outside").focus();'+settle);
   }
   await evaluate('window.variantControls.form.setValue("number",42);window.variantControls.form.setValue("notes","updated\\nnotes");window.variantControls.form.setFocus("number");'+settle);
   assert.deepEqual(await evaluate('[document.activeElement.id,document.getElementById("number").value,document.getElementById("rhf-notes").value]'),['number','42','updated\nnotes']);
   await evaluate('window.variantControls.form.reset();'+settle);assert.equal(await evaluate('document.getElementById("number").value'),'0');
   assert.equal(await evaluate('document.querySelector("[data-outline=Custom]").classList.contains("app-outline")'),true);
   const ax=await send('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='textbox'&&n.name?.value==='Contest'&&n.description?.value==='Choose a contest'));
   rows.push({styles,states});
   await evaluate('window.unmountVariants();'+settle);assert.equal(await evaluate('document.querySelectorAll("[data-vpm-input-measure]").length'),0);
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   await evaluate("(async()=>{for(let i=0;i<200;i++){if(window.hydrationReady)return;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration unavailable')})()");await evaluate(settle);
   assert.equal(await evaluate('window.savedHydrated===document.getElementById("hydrated")'),true,name+' hydration retains input');
  }
  // Material 9 removed the old per-input size/adornment override keys.
  // Preserve app 7 semantics, assert the exact differences, then compare the
  // remaining CSS. The app control below must match without this allowance.
  try{
  const comparable=structuredClone(rows[1]);
  // Independently serialized text can differ by one Chromium layout unit.
  // Bound only the intrinsic label width; all styles and transforms stay exact.
  for(const group of ['styles','states'])for(let i=0;i<comparable[group].length;i++){
   const a=group==='styles'?comparable[group][i].values:comparable[group][i];
   const b=group==='styles'?rows[0][group][i].values:rows[0][group][i];
   for(let j=0;j<a.length;j++)if(a[j].tag==='LABEL'){
    assert.ok(Math.abs(parseFloat(a[j].css.width)-parseFloat(b[j].css.width))<=.032,'label width within two layout units');
    a[j].css.width=b[j].css.width;
   }
  }
  if(version==='current')for(let i=0;i<comparable.styles.length;i++){
   const a=comparable.styles[i],b=rows[0].styles[i];if(!a.custom)continue;
   for(let j=0;j<a.values.length;j++)for(const key of Object.keys(a.values[j].css)){
    const v=a.values[j],u=b.values[j],actual=v.css[key],expected=u.css[key];if(actual===expected)continue;
    const name=v.id||v.tag;
    if(name==='outlined-small'&&['paddingTop','paddingBottom'].includes(key)||name==='number'&&['paddingTop','paddingBottom'].includes(key))assert.deepEqual([expected,actual],['6px','4px']);
    else if(name==='outlined-small'&&['paddingLeft','paddingRight'].includes(key))assert.deepEqual([expected,actual],['12px','8px']);
    else if(['DIV','FIELDSET'].includes(name)&&['height','width'].includes(key))assert.ok(Math.abs(parseFloat(expected)-parseFloat(actual)-(key==='height'?4:8))<.02,name+' '+key+' '+expected+' / '+actual+' legacy padding geometry '+JSON.stringify({mode:a.mode,rtl:a.rtl,variables:a.variables,flags:a.flags}));
    else assert.fail('Unexpected Material 9 difference '+name+' '+key+': '+expected+' / '+actual);
    v.css[key]=expected;
   }
  }
  assert.deepEqual(comparable,rows[0],version+' styles and focused state');}catch(error){fs.writeFileSync(path.join(os.tmpdir(),'vpm-input-decorations-failure.json'),JSON.stringify({version,upstream:rows[0],vpm:rows[1]},null,2));throw error;}
  comparisons+=rows[0].styles.length;
 }
 assert.equal(exceptions.length,0,JSON.stringify(exceptions));console.log(comparisons+' InputLabel/InputAdornment theme/state comparisons pass; focus, notch, refs, Hook Form, accessibility and hydration');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child){const exited=new Promise(r=>child.once('exit',r));child.kill();await Promise.race([exited,new Promise(r=>setTimeout(r,2000))]);}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
