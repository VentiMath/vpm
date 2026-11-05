import React from 'react';
import * as ReactDOM from 'react-dom';
import {createRoot} from 'react-dom/client';
import * as P from '@radix-ui/react-dismissable-layer';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {checks} from './checks.mjs';
const h=React.createElement, wait=()=>new Promise(r=>setTimeout(r,15));
const until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await wait();}throw Error(label);};
const key=(node,key)=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,composed:true,cancelable:true}));
window.runChecks=async variant=>{
  const root=createRoot(document.getElementById('root')),render=tree=>ReactDOM.flushSync(()=>root.render(tree));
  try{
    const list=await checks({P,React,ReactDOM,root,document,variant,render,step:async fn=>fn(),browser:true});
    for(const modal of [false,true]){
      render(h(Menu.Root,{modal},h(Menu.Trigger,{id:'menu-trigger'},'menu'),h(Menu.Portal,null,h(Menu.Content,null,h(Menu.Item,{id:'first'},'first'),h(Menu.Item,{id:'last'},'last')))));
      const trigger=document.getElementById('menu-trigger');trigger.focus();key(trigger,'ArrowDown');
      await until(()=>document.querySelector('[role="menu"]'),'open Menu');key(document.querySelector('[role="menu"]'),'Home');await until(()=>document.activeElement.id==='first','first Menu item');
      key(document.activeElement,'ArrowDown');await until(()=>document.activeElement.id==='last','second Menu item');key(document.activeElement,'Escape');await until(()=>!document.querySelector('[role="menu"]') && document.activeElement===trigger,'Escape closes Menu and restores focus');
      key(trigger,'ArrowDown');await until(()=>document.querySelector('[role="menu"]'),'reopen Menu');await wait();
      document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:5}));document.body.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      await until(()=>!document.querySelector('[role="menu"]'),'outside closes Menu');render(null);await wait();
    }
    list.push('unchanged modal/nonmodal Dropdown Menu keyboard and outside dismissal');return{passed:true,checks:list};
  }finally{ReactDOM.flushSync(()=>root.unmount());await wait();}
};
let nativeRoot;
window.prepareNative=async()=>{
  nativeRoot=createRoot(document.getElementById('root'));window.nativeDismiss=0;
  ReactDOM.flushSync(()=>nativeRoot.render(h(React.Fragment,null,h('button',{id:'native-outside',style:{position:'fixed',left:300,top:50,width:100,height:40}},'outside'),h(P.Root,{disableOutsidePointerEvents:true,deferPointerDownOutside:true,onDismiss:()=>window.nativeDismiss++,style:{position:'fixed',left:20,top:50,width:100,height:40,background:'white'}},'layer'))));await wait();
};
window.finishNative=()=>ReactDOM.flushSync(()=>nativeRoot.unmount());
