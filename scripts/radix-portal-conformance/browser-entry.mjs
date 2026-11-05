import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {renderToString} from 'react-dom/server';
import * as P from '@radix-ui/react-portal';
import * as Menu from '@radix-ui/react-dropdown-menu';
const h=React.createElement, wait=()=>new Promise(r=>setTimeout(r,10));
const check=(value,label)=>{if(!value)throw Error(label);};
const until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await wait();}throw Error(label);};
window.runChecks=async variant=>{
  const host=document.getElementById('root'), checks=[], extras=[];
  let root=createRoot(host);
  const render=tree=>flushSync(()=>root.render(tree));
  const target=document.createElement('section'), other=document.createElement('section');
  document.body.append(target,other); extras.push(target,other);
  const Context=React.createContext('wrong');
  function Value(){return h('span',null,React.useContext(Context));}
  const portal=(container,props={})=>h(P.Portal,{container,id:'portal',...props},h(Value));
  try{
    let first;
    function Probe(){React.useLayoutEffect(()=>{first=!!document.getElementById('portal');},[]);return portal();}
    render(h(Probe));await until(()=>document.getElementById('portal'),'default mounted');
    check(first===(variant==='vpm'),'paired first-commit placement');check(document.getElementById('portal').parentNode===document.body,'default body');render(null);
    checks.push('paired fresh-client first commit');

    const ref=React.createRef();let clicks=0;
    const tree=container=>h(Context.Provider,{value:'context'},h('main',{onClick:()=>clicks++},portal(container,{ref})));
    render(tree(target));const original=target.firstChild;check(ref.current===original,'forwarded ref');check(original.textContent==='context','context crosses portal');
    original.click();check(clicks===1,'logical event propagation');render(tree(target));check(target.firstChild===original,'stable container identity');
    render(tree(other));check(!target.firstChild&&other.firstChild!==original&&ref.current===other.firstChild,'container change replaces DOM/ref');render(null);check(ref.current===null&&!other.firstChild,'container cleanup');
    checks.push('container identity, context, events and cleanup');

    let cleaned=0;const callback=node=>node?()=>cleaned++:undefined;
    render(h(P.Root,{container:target,asChild:true,ref:callback,className:'outer'},h('button',{id:'slotted',className:'inner'},'button')));
    check(target.children.length===1&&target.firstChild.tagName==='BUTTON','asChild without wrapper');check(target.firstChild.className==='outer inner','class merge');target.firstChild.focus();check(document.activeElement===target.firstChild,'native focus');render(null);check(cleaned===1,'React19 callback cleanup');
    checks.push('asChild focus and ref cleanup');

    const fragment=document.createDocumentFragment();render(portal(fragment));check(fragment.firstChild?.id==='portal','detached fragment');render(null);check(!fragment.firstChild,'fragment cleanup');
    const shadow=target.attachShadow({mode:'open'});render(h(P.Root,{container:shadow,asChild:true},h('button',{id:'shadow-button'},'shadow')));
    shadow.firstChild.focus();check(shadow.activeElement===shadow.firstChild,'shadow-root focus');render(null);check(!shadow.firstChild,'shadow cleanup');
    checks.push('document fragments and shadow roots');

    const iframe=document.createElement('iframe');document.body.append(iframe);extras.push(iframe);
    const frameBody=iframe.contentDocument.body;render(h(P.Portal,{container:frameBody,asChild:true},h('button',{id:'frame-button'},'frame')));
    check(frameBody.firstChild.ownerDocument===iframe.contentDocument,'iframe document');frameBody.firstChild.focus();check(iframe.contentDocument.activeElement===frameBody.firstChild,'iframe native focus');render(null);check(!frameBody.firstChild,'iframe cleanup');
    checks.push('iframe container and focus');

    render(h(React.StrictMode,null,portal(other)));check(other.children.length===1,'strict portal');render(null);check(!other.firstChild,'strict cleanup');
    checks.push('StrictMode teardown');

    render(h(Menu.Root,{modal:false},h(Menu.Trigger,{id:'trigger'},'open'),h(Menu.Portal,{container:other},h(Menu.Content,null,h(Menu.Item,{id:'first'},'one'),h(Menu.Item,{id:'second'},'two')))));
    const key=(node,key)=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})), trigger=document.getElementById('trigger');trigger.focus();key(trigger,'ArrowDown');
    await until(()=>other.querySelector('[role="menu"]'),'Menu custom portal');const menu=other.querySelector('[role="menu"]');key(menu,'Home');await until(()=>document.activeElement.id==='first','Menu first');key(document.activeElement,'ArrowDown');await until(()=>document.activeElement.id==='second','Menu next');key(document.activeElement,'Escape');await until(()=>!other.querySelector('[role="menu"]')&&document.activeElement===trigger,'Menu escape/focus return');render(null);
    checks.push('unchanged Dropdown Menu custom container');

    flushSync(()=>root.unmount());root=null;
    for(const explicit of variant==='vpm'?[false,true]:[false]){
      const tree=h('div',null,h('p',{id:'sibling'},'preserved'),portal(explicit?other:undefined));
      host.innerHTML=renderToString(tree);const sibling=host.querySelector('#sibling'),errors=[];
      root=hydrateRoot(host,tree,{onRecoverableError:error=>errors.push(String(error))});
      await until(()=>document.getElementById('portal'),'independent-root hydration');check(host.querySelector('#sibling')===sibling&&!errors.length,'hydration preserves sibling');
      check(document.getElementById('portal').parentNode===(explicit?other:document.body),'hydrated destination');flushSync(()=>root.unmount());root=null;check(!document.getElementById('portal'),'hydrated teardown');
    }
    checks.push('independent roots and hydration identity');
    return {passed:true,checks};
  }finally{if(root)flushSync(()=>root.unmount());for(const element of extras)element.remove();}
};
