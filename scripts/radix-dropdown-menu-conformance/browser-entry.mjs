import React from 'react';
import * as ReactDOM from 'react-dom';
import {createRoot} from 'react-dom/client';
import * as P from '@radix-ui/react-dropdown-menu';
import {checks} from './checks.mjs';
const h=React.createElement,wait=()=>new Promise(r=>setTimeout(r,20));
window.runChecks=async variant=>{
 const root=createRoot(document.getElementById('root')),render=tree=>ReactDOM.flushSync(()=>root.render(tree));
 try{return {passed:true,checks:await checks({P,React,ReactDOM,document,variant,render,step:async fn=>fn()})};}
 finally{ReactDOM.flushSync(()=>root.unmount());await wait();}
};
let nativeRoot;
window.prepareNative=async()=>{
  nativeRoot=createRoot(document.getElementById('root'));window.nativeSelected=[];
  ReactDOM.flushSync(()=>nativeRoot.render(h(P.Root,null,h(P.Trigger,{id:'native-trigger',style:{position:'fixed',left:50,top:30,width:100,height:40}},'open'),h(P.Portal,null,h(P.Content,{id:'native-menu',style:{width:180,background:'white'}},h(P.Item,{id:'native-first',style:{height:30},onSelect:()=>window.nativeSelected.push('first')},'First'),h(P.Item,{id:'native-last',style:{height:30},onSelect:()=>window.nativeSelected.push('last')},'Last'))))));document.getElementById('native-trigger').focus();await wait();
};
window.finishNative=()=>ReactDOM.flushSync(()=>nativeRoot.unmount());
