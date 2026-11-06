import React from 'react';
import * as ReactDOM from 'react-dom';
import {createRoot} from 'react-dom/client';
import * as P from '@radix-ui/react-menu';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import {checks} from './checks.mjs';
const h=React.createElement,wait=()=>new Promise(r=>setTimeout(r,20));
const until=async(test,label)=>{for(let i=0;i<100;i++){if(test())return;await wait();}throw Error(label);};
const key=(node,key)=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,composed:true,cancelable:true}));
window.runChecks=async variant=>{
  const root=createRoot(document.getElementById('root')),render=tree=>ReactDOM.flushSync(()=>root.render(tree));
  try{
    const list=await checks({P,React,ReactDOM,document,variant,render,step:async fn=>fn(),browser:true});
    for(const modal of [false,true]){
      render(h(Dropdown.Root,{modal},h(Dropdown.Trigger,{id:'trigger'},'menu'),h(Dropdown.Portal,null,h(Dropdown.Content,{id:'dropdown',style:{width:200}},h(Dropdown.Item,{id:'first'},'first'),h(Dropdown.Item,{id:'last'},'last'),h(Dropdown.Arrow)))));
      const trigger=document.getElementById('trigger');trigger.focus();key(trigger,'ArrowDown');await until(()=>document.activeElement.id==='first','Dropdown keyboard entry');
      key(document.activeElement,'ArrowDown');await until(()=>document.activeElement.id==='last','Dropdown next item');key(document.activeElement,'Escape');await until(()=>!document.getElementById('dropdown')&&document.activeElement===trigger,'Dropdown Escape return');
      trigger.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));await until(()=>document.getElementById('dropdown'),'Dropdown pointer open');await wait();
      if(document.activeElement.id!=='dropdown')throw Error('pointer entry must leave items unfocused');
      document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));await until(()=>!document.getElementById('dropdown'),'Dropdown outside close');render(null);await wait();
    }list.push('unchanged modal/nonmodal Dropdown Menu keyboard, pointer and return');
    // Real layout: diagonal travel toward an open submenu must not focus a sibling.
    function Grace(){const [open,setOpen]=React.useState(false);return h(P.Root,{open:true,modal:false},h(P.Anchor,{style:{position:'fixed',left:100,top:100,width:100,height:30}},'anchor'),h(P.Content,{id:'grace-menu',style:{width:160},avoidCollisions:false},h(P.Sub,{open,onOpenChange:setOpen},h(P.SubTrigger,{id:'grace-trigger',style:{height:30}},'More'),h(P.Portal,null,h(P.SubContent,{id:'grace-sub',style:{width:140,height:140},avoidCollisions:false},h(P.Item,null,'child')))),h(P.Item,{id:'grace-sibling',style:{height:30}},'Sibling')));}
    render(h(Grace));await wait();document.getElementById('grace-trigger').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:100,clientY:100}));await until(()=>document.getElementById('grace-sub')?.closest('[data-radix-popper-content-wrapper]')?.style.transform.includes('translate('),'grace positioned');await wait();
    const trigger=document.getElementById('grace-trigger'),sibling=document.getElementById('grace-sibling'),sub=document.getElementById('grace-sub');trigger.focus();
    const box=trigger.getBoundingClientRect(),child=sub.getBoundingClientRect(),x=box.right-4,y=box.bottom-2;
    const move=(node,type,x,y,relatedTarget)=>node.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'mouse',clientX:x,clientY:y,relatedTarget}));
    move(trigger,'pointermove',x-2,y);move(trigger,'pointerout',x,y,sibling);move(sibling,'pointerover',x+1,y+1,trigger);move(sibling,'pointermove',x+1,y+1);await wait();
    if(document.activeElement!==trigger||!document.getElementById('grace-sub'))throw Error('diagonal submenu grace');
    await new Promise(r=>setTimeout(r,330));move(sibling,'pointermove',box.left+5,box.bottom+15);await until(()=>document.activeElement===sibling&&!document.getElementById('grace-sub'),'grace expiry');render(null);await wait();list.push('submenu diagonal pointer grace and expiry');
    return{passed:true,checks:list};
  }finally{ReactDOM.flushSync(()=>root.unmount());await wait();}
};
let nativeRoot;
window.prepareNative=async()=>{
  nativeRoot=createRoot(document.getElementById('root'));window.nativeSelected=[];
  ReactDOM.flushSync(()=>nativeRoot.render(h(Dropdown.Root,null,h(Dropdown.Trigger,{id:'native-trigger',style:{position:'fixed',left:50,top:30,width:100,height:40}},'open'),h(Dropdown.Portal,null,h(Dropdown.Content,{id:'native-menu',style:{width:180,background:'white'}},h(Dropdown.Item,{id:'native-first',style:{height:30},onSelect:()=>window.nativeSelected.push('first')},'First'),h(Dropdown.Item,{id:'native-last',style:{height:30},onSelect:()=>window.nativeSelected.push('last')},'Last'))))));document.getElementById('native-trigger').focus();await wait();
};
window.finishNative=()=>ReactDOM.flushSync(()=>nativeRoot.unmount());
