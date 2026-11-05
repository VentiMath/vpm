import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync,createPortal} from 'react-dom';
import * as P from '@radix-ui/react-focus-scope';
import * as Menu from '@radix-ui/react-dropdown-menu';
const h=React.createElement,wait=()=>new Promise(r=>setTimeout(r,15));
const check=(value,label)=>{if(!value)throw Error(label);};
const until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await wait();}throw Error(label);};
const key=(node,extra={})=>{const e=new node.ownerDocument.defaultView.KeyboardEvent('keydown',{key:'Tab',bubbles:true,composed:true,cancelable:true,...extra});node.dispatchEvent(e);return e;};
const scope=(props={},children)=>h(P.Root,{id:'scope',...props},children||[h('button',{id:'first',key:'a'},'first'),h('button',{id:'last',key:'b'},'last')]);
window.runChecks=async variant=>{
  const host=document.getElementById('root'),root=createRoot(host),render=tree=>flushSync(()=>root.render(tree)),checks=[];
  const trigger=document.createElement('button'),outside=document.createElement('button');trigger.id='trigger';outside.id='outside';document.body.append(trigger,outside);let iframe,branch;
  const stop=async()=>{render(null);await wait();};
  try{
    trigger.focus();render(scope({loop:true,trapped:true}));await until(()=>document.activeElement.id==='first','mount autofocus');outside.focus();check(document.activeElement.id==='first','programmatic trap');
    document.getElementById('last').focus();check(key(document.activeElement).defaultPrevented&&document.activeElement.id==='first','forward loop');key(document.activeElement,{shiftKey:true});check(document.activeElement.id==='last','reverse loop');
    await stop();await until(()=>document.activeElement===trigger,'restore trigger');checks.push('autofocus, trap, loops and restoration');

    let handled=0;render(scope({loop:true,onKeyDown:e=>{handled++;e.preventDefault();}}));await until(()=>document.activeElement.id==='first','handler mount');document.getElementById('last').focus();key(document.activeElement);check(handled===(variant==='vpm'?1:0),'consumer key handler');check(document.activeElement.id===(variant==='vpm'?'last':'first'),'consumer cancellation');await stop();checks.push('paired consumer key cancellation');
    render(scope({loop:true},[h('button',{id:'two',tabIndex:2,key:'a'},'two'),h('button',{id:'one',tabIndex:1,key:'b'},'one')]));await until(()=>document.activeElement.id===(variant==='vpm'?'one':'two'),'positive tabindex autofocus');document.getElementById('two').focus();const positive=key(document.activeElement);check(positive.defaultPrevented===(variant==='vpm'),'positive tabindex last boundary');if(variant==='vpm')check(document.activeElement.id==='one','actual sequential ordering');await stop();
    render(scope({loop:true},[h('button',{id:'valid',key:'a'},'valid'),h('div',{inert:true,key:'b'},h('button',{id:'inert'},'inert'))]));await until(()=>document.activeElement.id==='valid','inert fixture');check(key(document.activeElement).defaultPrevented===(variant==='vpm'),'inert last candidate');await stop();checks.push('paired sequential order and inert eligibility');

    trigger.focus();let done;const unmounted=new Promise(r=>done=r);
    render(scope({key:'old',onUnmountAutoFocus:()=>done()}));await until(()=>document.activeElement.id==='first','old scope');
    render(scope({key:'new'},h('button',{id:'new'},'new')));await unmounted;
    await until(()=>document.activeElement.id===(variant==='vpm'?'new':'trigger'),'new scope owns focus');await stop();checks.push('paired deferred restoration ownership');

    branch=document.createElement('aside');branch.innerHTML='<button id="branch">branch</button>';document.body.append(branch);
    render(scope({trapped:true,branches:[branch]}));await until(()=>document.activeElement.id==='first','branch fixture');branch.firstChild.focus();check(document.activeElement===branch.firstChild,'branch allowed');outside.focus();check(document.activeElement===branch.firstChild,'branch last focus retained');await stop();checks.push('portalled branches');

    const nested=show=>h(P.Root,{id:'parent',trapped:true},h('button',{id:'parent-button'},'parent'),h('i',{id:'removed'},'remove'),show&&createPortal(h(P.Root,{id:'child',trapped:true},h('button',{id:'child-button'},'child')),branch));
    render(nested(false));await until(()=>document.activeElement.id==='parent-button','parent autofocus');render(nested(true));await until(()=>document.activeElement.id==='child-button','nested autofocus');
    const parent=document.getElementById('parent'),original=parent.focus.bind(parent);let stolen=0;parent.focus=(...args)=>{stolen++;return original(...args);};
    document.activeElement.blur();document.getElementById('removed').remove();await wait();check(stolen===(variant==='vpm'?0:1),'paused scope must not recover mutation');parent.focus=original;
    document.getElementById('child-button').focus();render(nested(false));await until(()=>document.activeElement.id==='parent-button','nested return');await stop();checks.push('paired paused mutation and nested restoration');
    if(variant==='vpm'){
      trigger.focus();render(nested(true));await until(()=>document.activeElement.id==='child-button','simultaneous nested portals');outside.focus();check(document.activeElement.id==='child-button','logical inner scope remains active');await stop();await until(()=>document.activeElement===trigger,'simultaneous nested cleanup');
      render(scope({trapped:true}));await until(()=>document.activeElement.id==='first','removal fixture');document.getElementById('first').remove();await until(()=>host.contains(document.activeElement),'removed active node recovery');await stop();checks.push('logical portal nesting and active removal');
    }

    iframe=document.createElement('iframe');document.body.append(iframe);const doc=iframe.contentDocument;doc.body.innerHTML='<button id="frame-out">outside</button>';
    render(createPortal(scope({trapped:true,loop:true}),doc.body));await until(()=>doc.getElementById('first'),'iframe mounted');doc.getElementById('first').focus();doc.getElementById('frame-out').focus();check(doc.activeElement.id===(variant==='vpm'?'first':'frame-out'),'paired iframe trap');doc.getElementById('last').focus();check(key(doc.activeElement).defaultPrevented===(variant==='vpm'),'iframe loop');await stop();checks.push('paired owner-document trap and keyboard');
    render(h(React.Fragment,null,scope({loop:true}),createPortal(scope({onMountAutoFocus:e=>e.preventDefault()}),doc.body)));await wait();document.getElementById('last').focus();check(key(document.activeElement).defaultPrevented===(variant==='vpm'),'separate document stacks');await stop();checks.push('paired independent document stacks');

    if(variant==='vpm'){
      render(scope({loop:true},[h('button',{id:'live-first',key:'a'},'first'),h('button',{id:'live-last',key:'b'},'last'),h('fieldset',{disabled:true,key:'c'},h('button',{id:'fieldset-off'},'off')),h('input',{type:'radio',name:'edge',id:'checked',defaultChecked:true,key:'d'}),h('input',{type:'radio',name:'edge',id:'unchecked',key:'e'})]));await until(()=>document.activeElement.id==='live-first','eligibility fixture');document.getElementById('checked').focus();check(key(document.activeElement).defaultPrevented&&document.activeElement.id==='live-first','radio/fieldset edges');document.getElementById('checked').disabled=true;document.getElementById('live-last').style.display='none';document.getElementById('unchecked').disabled=true;check(key(document.activeElement).defaultPrevented&&document.activeElement.id==='live-first','live disabled/hidden edges');await stop();checks.push('live boundary eligibility');
      const Shadow=({rootHost})=>{const ref=React.useCallback(node=>{if(node&&!node.shadowRoot){const shadow=node.attachShadow({mode:'open'});shadow.innerHTML='<button id="shadow-first">first</button><button id="shadow-last">last</button>'; }},[]);return rootHost?h(P.Root,{id:'shadow-host',ref,tabIndex:0,loop:true,trapped:true}):scope({loop:true,trapped:true},h('div',{id:'shadow-host',ref}));};
      for(const rootHost of [false,true]){render(h(Shadow,{rootHost}));const shadow=document.getElementById('shadow-host').shadowRoot;await until(()=>shadow.activeElement?.id==='shadow-first','shadow autofocus');shadow.lastChild.focus();outside.focus();check(shadow.activeElement===shadow.lastChild,'shadow last focus retained');key(shadow.lastChild);check(shadow.activeElement.id==='shadow-first','shadow loop');await stop();}checks.push('open shadow focus order');
      trigger.focus();render(h(React.StrictMode,null,scope({trapped:true})));await until(()=>document.activeElement.id==='first','strict autofocus');await stop();await until(()=>document.activeElement===trigger,'strict restoration');checks.push('StrictMode owned cleanup');
    }
    for(const modal of [false,true]){
      render(h(Menu.Root,{modal},h(Menu.Trigger,{id:'menu-trigger'},'menu'),h(Menu.Portal,null,h(Menu.Content,null,h(Menu.Item,{id:'menu-first'},'one'),h(Menu.Item,{id:'menu-last'},'two')))));
      const trigger=document.getElementById('menu-trigger');trigger.focus();key(trigger,{key:'ArrowDown'});await until(()=>document.querySelector('[role="menu"]'),'Menu open');key(document.querySelector('[role="menu"]'),{key:'Home'});await until(()=>document.activeElement.id==='menu-first','Menu first');key(document.activeElement,{key:'ArrowDown'});await until(()=>document.activeElement.id==='menu-last','Menu last');key(document.activeElement,{key:'Escape'});await until(()=>!document.querySelector('[role="menu"]')&&document.activeElement===trigger,'Menu close and return');await stop();
    }checks.push('unchanged modal and nonmodal Dropdown Menu');
    return {passed:true,checks};
  }finally{flushSync(()=>root.unmount());await wait();trigger.remove();outside.remove();branch?.remove();iframe?.remove();}
};
let tabRoot;
window.prepareTabCheck=async()=>{tabRoot=createRoot(document.getElementById('root'));flushSync(()=>tabRoot.render(scope({loop:true,trapped:true})));await until(()=>document.activeElement.id==='first','native Tab ready');};
window.finishTabCheck=async()=>{flushSync(()=>tabRoot.unmount());await wait();};
