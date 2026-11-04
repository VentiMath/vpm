import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync, createPortal} from 'react-dom';
import {createCollection} from '@radix-ui/react-collection';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as Roving from '@radix-ui/react-roving-focus';
const h=React.createElement,frame=()=>new Promise(r=>requestAnimationFrame(r));
const check=(value,message)=>{if(!value)throw Error(message);};
const until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error(label);};
const key=(node,key)=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
window.runChecks=async()=>{
 const host=document.getElementById('root'),root=createRoot(host),render=tree=>flushSync(()=>root.render(tree)),checks=[];
 const [C,useItems,createScope]=createCollection('Browser');let read;
 function Capture(){read=useItems(undefined);return null;}
 const list=ids=>h(C.Provider,{scope:undefined},h(C.Slot,{scope:undefined},h('div',null,ids.map(id=>h(C.ItemSlot,{scope:undefined,id,key:id},h('button',{'data-item':id},id))))),h(Capture));
 let frameElement;
 try {
  render(list(['a','b','c']));await frame();check(read().map(x=>x.id).join()==='a,b,c','registered DOM order');
  const node=host.querySelector('[data-item="a"]');node.focus();render(list(['c','a','b']));check(node===host.querySelector('[data-item="a"]')&&document.activeElement===node,'preserve focused node during reorder');
  node.parentNode.prepend(node);check(read().map(x=>x.id).join()==='a,c,b','manual order without observer delay');checks.push('live DOM ordering and focused node identity');
  const stale=read;render(null);check(stale().length===0,'empty after root removal');checks.push('root cleanup');
  frameElement=document.createElement('iframe');document.body.append(frameElement);
  render(createPortal(list(['iframe']),frameElement.contentDocument.body));await frame();check(read()[0].ref.current.ownerDocument===frameElement.contentDocument,'iframe registration');checks.push('iframe realm');
  render(null);
  function Items({ids}){return h(Menu.Root,{modal:false},h(Menu.Trigger,{id:'trigger'},'open'),h(Menu.Portal,null,h(Menu.Content,null,ids.map(id=>h(Menu.Item,{key:id,id:'menu-'+id,disabled:id==='disabled'},id)))));}
  render(h(Items,{ids:['alpha','disabled','charlie','delta']}));await frame();const trigger=document.getElementById('trigger');trigger.focus();key(trigger,'ArrowDown');
  await until(()=>document.querySelector('[role="menu"]'),'menu opens');key(document.querySelector('[role="menu"]'),'Home');await until(()=>document.activeElement.id==='menu-alpha','Home first');
  key(document.activeElement,'ArrowDown');await until(()=>document.activeElement.id==='menu-charlie','skip disabled');
  render(h(Items,{ids:['delta','disabled','charlie','alpha']}));key(document.activeElement,'Home');await until(()=>document.activeElement.id==='menu-delta','Home follows reorder');
  key(document.activeElement,'End');await until(()=>document.activeElement.id==='menu-alpha','End follows reorder');
  key(document.activeElement,'c');await until(()=>document.activeElement.id==='menu-charlie','typeahead');
  key(document.activeElement,'Escape');await until(()=>!document.querySelector('[role="menu"]')&&document.activeElement===trigger,'Escape focus return');checks.push('current Menu keyboard, disabled items, reorder, typeahead and dismissal');
  for(const dir of ['ltr','rtl']){
   render(h(Roving.Root,{dir,orientation:'horizontal',loop:true},['a','off','c'].map(id=>h(Roving.Item,{key:id,id:'roving-'+id,focusable:id!=='off',asChild:true},h('button',null,id)))));
   const first=document.getElementById('roving-a');first.focus();key(first,dir==='ltr'?'ArrowRight':'ArrowLeft');await until(()=>document.activeElement.id==='roving-c','roving next');key(document.activeElement,dir==='ltr'?'ArrowRight':'ArrowLeft');await until(()=>document.activeElement===first,'roving loop');
  }checks.push('current Roving Focus LTR/RTL and looping');
  const scoped=createScope();let outer,inner;
  function ReadScope({scope,nested}){const get=useItems(scope);if(nested)inner=get;else outer=get;return null;}
  function Nested(){const scope=scoped(undefined).__scopeBrowserCollectionProvider;return h(C.Provider,{scope:undefined},h(C.Slot,{scope:undefined},h('div',null,h(C.ItemSlot,{scope:undefined,id:'outer'},h('b',null,'outer')),h(C.Provider,{scope},h(C.Slot,{scope},h('div',null,h(C.ItemSlot,{scope,id:'inner'},h('b',null,'inner')))),h(ReadScope,{scope,nested:true})),h(ReadScope,{scope:undefined}))));}
  render(h(Nested));await frame();check(outer().map(x=>x.id).join()==='outer'&&inner().map(x=>x.id).join()==='inner','scopes stay isolated');checks.push('nested independent scopes');
  return {passed:true,checks};
 }finally{flushSync(()=>root.unmount());frameElement?.remove();}
};
