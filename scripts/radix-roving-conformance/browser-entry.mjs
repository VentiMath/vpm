import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {flushSync,createPortal} from 'react-dom';
import {renderToString} from 'react-dom/server';
import * as P from '@radix-ui/react-roving-focus';
import * as Menu from '@radix-ui/react-dropdown-menu';
const h=React.createElement,wait=()=>new Promise(r=>setTimeout(r,15)),frame=()=>new Promise(r=>requestAnimationFrame(r));
const check=(x,m)=>{if(!x)throw Error(m);},until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await wait();}throw Error(label);};
const key=(node,key,extra={})=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}));
const list=(props={},order=['a','off','b','c'],itemProps={})=>h(P.Root,{id:'group',...props},order.map(id=>h(P.Item,{key:id,tabStopId:id,asChild:true,focusable:id!=='off',...itemProps},h('button',{id},id))));
window.runChecks=async variant=>{
 const host=document.getElementById('root'),root=createRoot(host),render=tree=>flushSync(()=>root.render(tree)),checks=[],outside=document.createElement('button');outside.id='outside';outside.textContent='outside';document.body.append(outside);let iframe;
 try{
  render(list({},undefined,{active:false}));await frame();document.getElementById('group').focus();await until(()=>document.activeElement.id==='a','entry first');
  for(const dir of ['ltr','rtl'])for(const orientation of ['horizontal','vertical']){
   render(list({dir,orientation,loop:true}));document.getElementById('a').focus();const next=orientation==='vertical'?'ArrowDown':dir==='rtl'?'ArrowLeft':'ArrowRight';key(document.activeElement,next);await until(()=>document.activeElement.id==='b','skip disabled');key(document.activeElement,'End');await until(()=>document.activeElement.id==='c','End');key(document.activeElement,next);await until(()=>document.activeElement.id==='a','loop');
   key(document.activeElement,next,{ctrlKey:true});await wait();check(document.activeElement.id==='a','modifier');
  }checks.push('entry and four orientation/direction combinations');
  render(list({},['c','a','off','b']));document.getElementById('a').focus();key(document.activeElement,'Home');await until(()=>document.activeElement.id==='c','reordered Home');key(document.activeElement,'PageDown');await until(()=>document.activeElement.id==='b','reordered PageDown');checks.push('live DOM order');
  let changes=[];render(null);render(list({currentTabStopId:'a',onCurrentTabStopIdChange:id=>changes.push(id)}));document.getElementById('b').focus();check(document.getElementById('a').tabIndex===0&&changes.at(-1)==='b','controlled proposal');render(list({currentTabStopId:'b'}));check(document.getElementById('b').tabIndex===0,'controlled update');render(null);
  render(list({onEntryFocus:e=>e.preventDefault()}));await frame();outside.focus();document.getElementById('group').focus();check(document.activeElement.id==='group','entry cancellation');checks.push('controlled tab stops and entry cancellation');
  render(null);render(list());await frame();document.getElementById('a').focus();key(document.activeElement,'ArrowRight');outside.focus();await wait();check(document.activeElement.id===(variant==='vpm'?'outside':'b'),'queued focus cannot steal a newer focus choice');checks.push('paired delayed-focus ownership');
  render(null);render(list());await frame();document.getElementById('a').focus();key(document.activeElement,'ArrowRight');render(null);await wait();check(document.activeElement===document.body,'unmounted timer has no focus target');checks.push('queued teardown');
  iframe=document.createElement('iframe');document.body.append(iframe);render(createPortal(list({},['a','b','c']),iframe.contentDocument.body));await frame();const doc=iframe.contentDocument;doc.getElementById('a').focus();key(doc.activeElement,'ArrowRight');await until(()=>doc.activeElement.id===(variant==='vpm'?'b':'c'),'iframe focus stopping');checks.push('paired iframe focus ownership');render(null);
  let entries=0;const swapped=tag=>h(P.Root,{asChild:true,onEntryFocus:e=>{entries++;e.preventDefault();}},h(tag,{id:'swapped'},h(P.Item,{asChild:true,tabStopId:'x'},h('button',{id:'swap-item'},'x'))));
  render(swapped('div'));await frame();outside.focus();document.getElementById('swapped').focus();check(entries===1,'initial entry event');render(swapped('section'));await frame();outside.focus();document.getElementById('swapped').focus();check(entries===(variant==='vpm'?2:1),'listener follows replaced root');check(document.activeElement.id===(variant==='vpm'?'swapped':'swap-item'),'entry cancellation on replaced root');checks.push('paired slotted-root listener ownership');
  render(null);const useScope=P.createRovingFocusGroupScope();
  function Scoped(){const scope=useScope();return h(P.Root,{...scope},h(P.Item,{...scope,asChild:true,tabStopId:'outer-a'},h('button',{id:'outer-a'},'outer-a')),h(P.Root,null,h(P.Item,{asChild:true,tabStopId:'inner-a'},h('button',{id:'inner-a'},'inner-a')),h(P.Item,{asChild:true,tabStopId:'inner-b'},h('button',{id:'inner-b'},'inner-b'))),h(P.Item,{...scope,asChild:true,tabStopId:'outer-b'},h('button',{id:'outer-b'},'outer-b')));}
  render(h(Scoped));await frame();document.getElementById('outer-a').focus();key(document.activeElement,'ArrowRight');await until(()=>document.activeElement.id==='outer-b','outer scope');document.getElementById('inner-a').focus();key(document.activeElement,'ArrowRight');await until(()=>document.activeElement.id==='inner-b','inner scope');checks.push('nested scoped groups');
  render(h(Menu.Root,{modal:false},h(Menu.Trigger,{id:'menu-trigger'},'open'),h(Menu.Portal,null,h(Menu.Content,null,['one','disabled','two'].map(id=>h(Menu.Item,{id:'menu-'+id,disabled:id==='disabled',key:id},id))))));await frame();const trigger=document.getElementById('menu-trigger');trigger.focus();key(trigger,'ArrowDown');await until(()=>document.querySelector('[role="menu"]'),'current Menu open');key(document.querySelector('[role="menu"]'),'Home');await until(()=>document.activeElement.id==='menu-one','Menu first');key(document.activeElement,'ArrowDown');await until(()=>document.activeElement.id==='menu-two','Menu disabled skip');key(document.activeElement,'Escape');await until(()=>!document.querySelector('[role="menu"]')&&document.activeElement===trigger,'Menu focus return');checks.push('unchanged current Dropdown Menu');
  render(null);return {passed:true,checks};
 }finally{flushSync(()=>root.unmount());outside.remove();iframe?.remove();}
};
let tabRoot;
window.prepareTabCheck=async()=>{
 const host=document.getElementById('root');tabRoot=createRoot(host);flushSync(()=>tabRoot.render(h('div',null,h('button',{id:'before'},'before'),h(P.Root,{orientation:'horizontal'},['a','b'].map(id=>h(P.Item,{key:id,tabStopId:id,asChild:true},h('button',{id:'native-'+id},id)))),h('button',{id:'after'},'after'))));await frame();document.getElementById('before').focus();
};
window.finishTabCheck=()=>flushSync(()=>tabRoot.unmount());
