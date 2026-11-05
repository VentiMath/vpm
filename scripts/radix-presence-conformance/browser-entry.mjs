import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync,createPortal} from 'react-dom';
import * as P from '@radix-ui/react-presence';
import * as Menu from '@radix-ui/react-dropdown-menu';
const h=React.createElement, wait=()=>new Promise(r=>setTimeout(r,10));
const check=(value,label)=>{if(!value)throw Error(label);};
const until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await wait();}throw Error(label);};
const css=`@keyframes enter{from{opacity:.9}to{opacity:1}}@keyframes short{to{opacity:.3}}@keyframes long{to{transform:translateX(2px)}}
[data-open="true"]{animation:enter 60s} [data-open="false"]{animation:short 60s} [data-multiple="true"][data-open="false"]{animation:short 60s,long 120s}
[data-pseudo="true"]::before{content:'pseudo';animation:short 60s}
[role="menu"][data-state="open"]{animation:enter 60s}[role="menu"][data-state="closed"]{animation:short 60s}`;
window.runChecks=async variant=>{
 const host=document.getElementById('root'),root=createRoot(host),render=x=>flushSync(()=>root.render(x)),checks=[];
 const sheet=document.createElement('style');sheet.textContent=css;document.head.append(sheet);let iframe;
 const item=()=>host.querySelector('#item');
 const tree=(present,props={})=>h(P.Presence,{present},h(props.tag||'div',{id:'item','data-open':String(present),...props},h('span',null,'child')));
 const owned=node=>node.getAnimations().filter(a=>a.effect.target===node&&!a.effect.pseudoElement);
 const finish=async(node,name)=>{const a=owned(node).find(a=>a.animationName===name);check(a,'animation exists: '+name);a.finish();await wait();};
 try{
  render(tree(true));const original=item();render(tree(false));check(item()===original,'exit retains DOM');await finish(original,'short');await until(()=>!item(),'finished exit removes DOM');checks.push('native exit lifecycle');
  render(tree(true));render(tree(false,{'data-multiple':'true'}));const multiple=item();await finish(multiple,'short');if(variant==='upstream')await until(()=>!item(),'upstream first completion');check(!!item()===(variant==='vpm'),'paired multiple exits');if(item())await finish(multiple,'long');await until(()=>!item(),'last exit removes DOM');checks.push('paired multiple native animations');
  render(tree(true));render(tree(false));const reopened=item(),old=owned(reopened)[0];render(tree(true));try{old.finish();}catch{}await wait();check(item()===reopened,'stale completion after reopen');checks.push('reopen keeps DOM');
  if(variant==='vpm'){render(null);render(tree(true));render(tree(false));const cancelled=item();owned(cancelled)[0].cancel();await until(()=>!item(),'cancel removes DOM');checks.push('native cancellation');}
  render(tree(true));render(tree(false,{'data-pseudo':'true'}));const pseudo=item();const pseudoAnimation=pseudo.getAnimations({subtree:true}).find(a=>a.effect.pseudoElement);check(pseudoAnimation,'real pseudo animation');pseudoAnimation.finish();await wait();if(variant==='upstream')await until(()=>!item(),'upstream pseudo completion');check(!!item()===(variant==='vpm'),'paired pseudo completion');if(item())await finish(pseudo,'short');checks.push('paired pseudo-element ownership');
  render(tree(true));render(tree(false));const replaced=item();render(tree(false,{tag:'section'}));check(item()!==replaced,'changed child element');if(variant==='vpm'){check(item(),'replacement exit retained');await finish(item(),'short');await until(()=>!item(),'replacement exit completion');}render(null);checks.push('replaced child teardown');
  if(variant==='vpm'){
   render(tree(true));render(tree(false));const changed=item();render(tree(false,{style:{animationName:'long',animationDuration:'60s'}}));await wait();check(item()===changed,'replacement animation retained');await finish(changed,'long');await until(()=>!item(),'replacement animation completion');checks.push('exit animation replacement');
   const forced=present=>h(P.Presence,{present},state=>h('div',{id:'item','data-open':String(present),'data-kept':String(state.present),style:{animationFillMode:'both'}}));render(forced(true));render(forced(false));await finish(item(),'short');await until(()=>item().dataset.kept==='false','forceMount completion');check(item().style.animationFillMode==='both','fill restored');render(null);
   for(const style of [{animation:'short 0s'},{animation:'short 1s infinite'},{animation:'missing 60s'}]){render(tree(true));render(tree(false,{style}));check(!item(),'nonblocking zero/infinite/missing animation');}checks.push('forceMount and nonblocking animations');
  }
  iframe=document.createElement('iframe');document.body.append(iframe);const frameStyle=iframe.contentDocument.createElement('style');frameStyle.textContent=css;iframe.contentDocument.head.append(frameStyle);
  render(createPortal(tree(true),iframe.contentDocument.body));render(createPortal(tree(false),iframe.contentDocument.body));const inFrame=iframe.contentDocument.getElementById('item');check(inFrame,'iframe exit retained');await finish(inFrame,'short');await until(()=>!iframe.contentDocument.getElementById('item'),'iframe exit completion');render(null);checks.push('owner-document styles');
  render(h(React.StrictMode,null,tree(true)));render(h(React.StrictMode,null,tree(false)));await finish(item(),'short');await until(()=>!item(),'StrictMode exit');render(null);checks.push('StrictMode lifecycle');
  render(h(Menu.Root,{modal:false},h(Menu.Trigger,{id:'trigger'},'open'),h(Menu.Portal,null,h(Menu.Content,null,h(Menu.Item,{id:'first'},'first')))));
  const trigger=document.getElementById('trigger');trigger.focus();const key=(node,key)=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
  key(trigger,'ArrowDown');await until(()=>document.querySelector('[role="menu"]'),'Menu opened');const menu=document.querySelector('[role="menu"]');key(menu,'Home');await until(()=>document.activeElement.id==='first','Menu focus');key(document.activeElement,'Escape');await until(()=>menu.dataset.state==='closed','Menu closed state');check(menu.isConnected,'Menu waits for exit');await finish(menu,'short');await until(()=>!menu.isConnected&&document.activeElement===trigger,'Menu exit and focus return');checks.push('unchanged Dropdown Menu exit and focus return');
  return {passed:true,checks};
 }finally{flushSync(()=>root.unmount());sheet.remove();iframe?.remove();}
};
