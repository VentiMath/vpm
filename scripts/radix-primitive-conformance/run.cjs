'use strict';
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{spawnSync}=require('node:child_process');
if(!process.argv.includes('--child')){
 for(const mode of ['upstream','legacy','vpm']){const r=spawnSync(process.execPath,[__filename,'--child',mode],{stdio:'inherit'});assert.equal(r.status,0,mode)}
}else{
 const mode=process.argv.at(-1),dom=new JSDOM('<body><button id="a">a</button><iframe></iframe></body>',{pretendToBeVisual:true});
 globalThis.window=dom.window;globalThis.document=dom.window.document;
 const api=require(mode==='upstream'?'@radix-ui/primitive':mode==='legacy'?'primitive-legacy':'../../packages/vradix-primitive');
 try{
  let cases=0;
  for(const first of [false,true])for(const second of [false,true])for(const prevented of [false,true])for(const check of [undefined,true,false]){
   const calls=[],event={defaultPrevented:false};const handle=api.composeEventHandlers(first?e=>{calls.push('first');e.defaultPrevented=prevented}:undefined,second?e=>{assert.equal(e,event);calls.push('second');return 42}:undefined,{checkForDefaultPrevented:check});
   const returned=handle(event),runSecond=second&&(!first||!prevented||check===false);assert.deepEqual(calls,[...(first?['first']:[]),...(runSecond?['second']:[])]);assert.equal(returned,runSecond?42:undefined);cases++;
  }
  assert.throws(()=>api.composeEventHandlers(()=>{throw Error('first')},()=>assert.fail())({}),/first/);
  if(mode!=='legacy'){
   assert.equal(api.canUseDOM,true);const d=dom.window.document,frame=d.querySelector('iframe'),other=frame.contentDocument,button=other.createElement('button');other.body.append(button);button.focus();
   assert.equal(api.getOwnerDocument(button),other);assert.equal(api.getOwnerWindow(button),frame.contentWindow);assert.equal(api.getActiveElement(d.body),button);assert(api.isFrame(frame));
   const option=other.createElement('div');option.id='chosen';other.body.append(option);button.setAttribute('aria-activedescendant','chosen');assert.equal(api.getActiveElement(d.body,true),option);
   const documentResult=api.getOwnerDocument(other);assert.equal(documentResult,mode==='vpm'?other:d);if(mode==='vpm')assert.equal(api.getOwnerWindow(other),frame.contentWindow);
   assert.equal(api.getActiveElement(button,true),option);assert.equal(api.composeEventHandlers(undefined,()=>42)(null),42);
  }
  console.log(mode+': '+cases+' event combinations, ordering/error propagation and supported DOM helpers passed.');
 }finally{dom.window.close()}
}
