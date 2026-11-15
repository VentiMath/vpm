"use strict";
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const {fixture,peer}=require('./paths.cjs'),base=fixture+'/node_modules/.vpm-material',profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-material-input-'));
let server,child,socket,sequence=0;const pending=new Map(),exceptions=[];
(async()=>{try{
 if(!process.env.VPM_MATERIAL_SKIP_BUILD)require('./input-build.cjs');
 server=http.createServer((req,res)=>{
  const file=/^\/(current|app)-(upstream|vpm)\.js$/.exec(req.url);
  if(file){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(base+'/'+file[1]+'-'+file[2]+'/input-browser.js'));return;}
  const hydration=req.url.endsWith('-hydrate'),variant=req.url.slice(1).replace(/-hydrate$/,'')||'current-vpm';
  let markup='',styles='';if(hydration){markup=require(base+'/'+variant+'/input-ssr.cjs').hydrate();markup=markup.replace(/<style[\s\S]*?<\/style>/g,tag=>{styles+=tag;return '';});}
  res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head><body style="margin:0">'+(hydration?'<div id="hydration">'+markup+'</div>':'')+'<script src="/'+variant+'.js"></script></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const chrome=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);let port;({child,port}=await require('../vlx-conformance/launch-chrome.cjs')(chrome,profile));
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 socket.onmessage=e=>{const x=JSON.parse(e.data),p=pending.get(x.id);if(x.method==='Runtime.exceptionThrown')exceptions.push(x.params.exceptionDetails);if(p){pending.delete(x.id);clearTimeout(p.timer);x.error?p.reject(Error(JSON.stringify(x.error))):p.resolve(x.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('CDP timeout '+method)),45000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};

 const settle="new Promise(r=>setTimeout(r,70)).then(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))))";
 const snapshot=`(()=>{const props=['display','width','height','position','flexDirection','marginLeft','marginRight','marginTop','marginBottom','paddingTop','paddingBottom','borderRadius','fontSize','fontWeight','lineHeight','letterSpacing','color','textAlign','textDecorationLine'];return [...document.querySelectorAll('#forms [id]')].filter(el=>el.tagName!=='OUTPUT'&&!el.closest('#inputcases')).map(el=>{const style=getComputedStyle(el);return {id:el.id,tag:el.tagName,classes:[...el.classList].filter(c=>c.startsWith('Mui')&&!['MuiInputBase-inputSizeSmall','MuiInputBase-inputMultiline','MuiInputBase-inputAdornedStart','MuiInputBase-inputAdornedEnd','MuiInputBase-inputHiddenLabel'].includes(c)).sort(),css:Object.fromEntries(props.map(p=>[p,style[p]])),star:el.querySelector('[aria-hidden]')?.textContent}})})()`;
 const state=()=>evaluate("JSON.parse(document.querySelector('#state').textContent)");
 await send('Runtime.enable');await send('Accessibility.enable');let comparisons=0;
 for(const version of ['current','app']){
  const rows=[];
  for(const kind of ['upstream','vpm']){
   const name=version+'-'+kind;await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name});
   await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.formControls)return;await new Promise(r=>setTimeout(r,20))}throw Error('Form fixture unavailable')})()");
   const styles=[];
   for(const width of [420,1200])for(const mode of ['light','dark'])for(const rtl of [false,true])for(const variables of [false,true])for(const custom of [false,true])for(const flags of [{}]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1400,deviceScaleFactor:1,mobile:false});
    await evaluate('window.renderForms('+JSON.stringify({mode,rtl,variables,custom,...flags})+');'+settle);
    styles.push({width,mode,rtl,variables,custom,flags,values:await evaluate(snapshot)});
   }
   assert.equal(await evaluate("window.formControls.control.current===document.querySelector('#control')&&window.formControls.label.current===document.querySelector('#label')&&window.formControls.helper.current===document.querySelector('#help')"),true,name+' forwarded refs');
   await evaluate("window.renderForms({});"+settle);
   const states=[];states.push(await state());
   assert.equal(states.at(-1).filled,false);assert.equal(states.at(-1).focused,false);
   const nested=await evaluate("JSON.parse(document.querySelector('#nested-state').textContent)");assert.equal(nested.filled,true);assert.equal(nested.adornedStart,true);assert.equal(nested.required,false);
   const labelBox=await evaluate("(()=>{const r=document.querySelector('#label').getBoundingClientRect();return {x:r.left+10,y:r.top+5}})()");
   await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...labelBox});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...labelBox});await evaluate(settle);
   assert.equal(await evaluate('document.activeElement.id'),'contest',name+' native label activation');
   states.push(await state());assert.equal(states.at(-1).focused,true);assert.equal(await evaluate('window.formControls.counts.current.focus'),1,name+' single bubbling callback');
   await send('Input.insertText',{text:'AMC'});await evaluate(settle);states.push(await state());assert.equal(states.at(-1).filled,true);
   await evaluate("window.savedInput=document.querySelector('#contest');window.renderForms({tick:1});"+settle);assert.equal(await evaluate("window.savedInput===document.querySelector('#contest')&&document.activeElement===window.savedInput"),true,name+' retained node/focus');
   // InputBase's real change path must clear filled state too.
   await evaluate("(()=>{const el=document.querySelector('#contest');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'');el.dispatchEvent(new Event('input',{bubbles:true}));})()");await evaluate(settle);states.push(await state());assert.equal(states.at(-1).filled,false);
   await evaluate("document.querySelector('#contest').dispatchEvent(new AnimationEvent('animationstart',{animationName:'mui-auto-fill',bubbles:true}));"+settle);assert.equal((await state()).filled,true,name+' autofill signal');
   await evaluate("document.querySelector('#contest').dispatchEvent(new AnimationEvent('animationstart',{animationName:'mui-auto-fill-cancel',bubbles:true}));"+settle);assert.equal((await state()).filled,false,name+' autofill cancellation');
   await evaluate("window.renderForms({disabled:true,error:true});"+settle);states.push(await state());assert.equal(states.at(-1).focused,false);assert.equal(await evaluate("document.querySelector('#contest').disabled"),true);
   await evaluate("window.renderForms({disabled:false});"+settle);states.push(await state());assert.equal(states.at(-1).focused,false,name+' no stale focus after enable');
   await evaluate("window.renderForms({focused:true});document.querySelector('#outside').focus();"+settle);states.push(await state());assert.equal(states.at(-1).focused,true);
   await evaluate("window.renderForms({focused:false});"+settle);states.push(await state());assert.equal(states.at(-1).focused,false);
   const ax=await send('Accessibility.getFullAXTree');const field=ax.nodes.find(n=>n.role?.value==='textbox'&&n.name?.value==='Contest');assert.ok(field,name+' named textbox');assert.equal(field.description.value,'Enter the contest name');assert.equal(field.properties.find(p=>p.name==='required').value.value,true);const names=[field.name.value,field.description.value];
   await evaluate("window.renderForms({mount:false});"+settle);assert.equal(await evaluate("['control','label','helper'].every(k=>window.formControls[k].current===null)"),true,name+' input registration/ref cleanup');
   await evaluate("window.renderForms({});"+settle);assert.equal((await state()).filled,false,name+' remounted empty state');
   await evaluate("window.renderForms({});"+settle);
   await evaluate("document.querySelector('#controlled').focus();document.querySelector('#controlled').select();window.inputCases.events.current=[];");
   await send('Input.insertText',{text:'edited'});await evaluate(settle);
   assert.equal(await evaluate("document.querySelector('#controlled').value"),'edited');
   assert.deepEqual(await evaluate('window.inputCases.events.current'),['input-change','top-change'],name+' event order');
   await evaluate("window.inputCases.form.setValue('number',42);window.inputCases.form.setValue('notes','updated\\nnotes');"+settle);
   assert.equal(await evaluate("document.querySelector('#number').value"),'42',name+' RHF controlled update');
   await evaluate("window.inputCases.form.setFocus('number');"+settle);assert.equal(await evaluate('document.activeElement.id'),'number',name+' RHF ref focus');
   const heights=[];
   for(const narrow of [false,true])for(const text of ['', 'short', 'one\ntwo\nthree\nfour\nfive\nsix', 'Contest travel arrangements '.repeat(12)]){
    await evaluate('window.inputCases.setNarrow('+narrow+');window.inputCases.setText('+JSON.stringify(text)+');'+settle);
    heights.push(await evaluate("['auto','fixed','placeholder','rhf-notes'].map(id=>{const n=document.getElementById(id),s=getComputedStyle(n);return {id,height:s.height,overflow:s.overflowY,width:s.width,rows:n.rows,font:s.font,letterSpacing:s.letterSpacing,padding:s.padding,boxSizing:s.boxSizing}})"));
   }
   await evaluate("window.inputCases.setText('selection persists');"+settle);
   await evaluate("(()=>{const n=document.querySelector('#auto');n.focus();n.setSelectionRange(2,5);window.oldTextArea=n;window.inputCases.setNarrow(false);})()");await evaluate(settle);
   assert.deepEqual(await evaluate("[document.activeElement===window.oldTextArea,window.oldTextArea.selectionStart,window.oldTextArea.selectionEnd]"),[true,2,5],name+' autosize keeps selection');
   await evaluate("window.inputCases.refs.current.callback.focus();window.inputCases.setDisabled(true);"+settle);
   assert.equal(await evaluate("document.querySelector('#custom-field').disabled"),true,name+' custom disabled');
   await evaluate("window.inputCases.setShown(false);"+settle);assert.equal(await evaluate('window.inputCases.refs.current.callback===null'),true,name+' React19 callback ref cleanup');
   await evaluate("document.querySelector('#required-field').checkValidity();");assert.deepEqual((await evaluate('window.inputCases.events.current')).slice(-2),['input-invalid','invalid'],name+' native validation bubbles once in order');
   await evaluate("window.inputCases.form.reset({number:0,notes:'reset'});"+settle);assert.equal(await evaluate("document.querySelector('#number').value"),'0',name+' RHF reset');
   await evaluate("window.oldTextArea=document.querySelector('#auto');window.inputCases.setAlternateRoot(true);"+settle);
   assert.equal(await evaluate("document.querySelector('#auto')!==window.oldTextArea&&parseFloat(document.querySelector('#auto').style.height)>0"),true,name+' replaced root resubscribes textarea measurement');
   await evaluate("window.inputCases.setAlternateRoot(false);"+settle);
   for(const noObserver of [false,true]){
    await evaluate('window.mountForeignInput('+noObserver+');'+settle);
    const foreign=await evaluate("(()=>{const {doc}=window.foreignInput,n=doc.getElementById('foreign');n.focus();return {height:doc.defaultView.getComputedStyle(n).height,focused:doc.activeElement===n,name:n.getAttribute('aria-label')}})()");
    assert.deepEqual(foreign,{height:'69px',focused:true,name:'Foreign notes'},name+' owner document, ResizeObserver='+!noObserver);
    assert.deepEqual(await evaluate('window.unmountForeignInput()'),{inputs:0,mirrors:0},name+' iframe cleanup');
    await evaluate('window.foreignInput.frame.remove();');
   }
   rows.push({styles,names,states,heights});

   await evaluate('window.unmountForms();'+settle);
   assert.equal(await evaluate("['control','label','helper'].every(k=>window.formControls[k].current===null)"),true,name+' ref cleanup');
   assert.equal(await evaluate("document.querySelectorAll('[data-vpm-input-measure]').length"),0,name+' textarea measurement cleanup');
   await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+name+'-hydrate'});
   assert.deepEqual(await evaluate("(async()=>{for(let i=0;i<300;i++){if(window.hydrationReady)return window.hydrationReady;await new Promise(r=>setTimeout(r,20))}throw Error('Hydration fixture unavailable')})()"),{same:true,errors:[]},name+' delivered SSR hydration');
  }
  try{assert.deepEqual(rows[1],rows[0],version+' forms');}catch(error){fs.writeFileSync(path.join(os.tmpdir(),'vpm-input-style-failure.json'),JSON.stringify({version,rows},null,2));throw error;}
  comparisons+=rows[0].styles.length;
 }
 assert.deepEqual(exceptions,[]);console.log(comparisons+' InputBase theme/viewport comparisons pass; controlled/uncontrolled events, custom refs, React Hook Form, multiline sizing, accessibility and hydration');
}finally{for(const p of pending.values())clearTimeout(p.timer);socket?.close();if(child&&child.exitCode===null&&child.signalCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');const kill=setTimeout(()=>child.kill('SIGKILL'),3000);await done;clearTimeout(kill)}if(server)await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}})().catch(e=>{console.error(e);process.exitCode=1});
