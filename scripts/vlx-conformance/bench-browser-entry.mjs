import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {InlineMath,MathText,preloadMath} from 'vlx/react';
const h=React.createElement,host=document.getElementById('root'),root=createRoot(host);
const paper=Array.from({length:20},(_,i)=>`Question ${i}: $x_{${i}}^2+1$.`).join(' ');
const matrix='\\begin{pmatrix}'+Array.from({length:12},(_,r)=>Array.from({length:12},(_,c)=>String(r*12+c)).join('&')).join('\\\\')+'\\end{pmatrix}';
function Page({tick,source,tex,remount}){return h('section',{'data-tick':tick},source?h(MathText,{source,key:remount?tick:0}):h(InlineMath,{tex,key:remount?tick:0}));}
window.runBench=async()=>{
 await preloadMath();const rows=[];
 for(const spec of [
  {name:'first mount / cached formula',mount:true,n:20},
  {name:'first mount / uncached formula',mount:true,cold:true,n:20},
  {name:'first mount / 20-formula paper',mount:true,paper:true,n:2},
  {name:'first mount / 12x12 matrix',mount:true,large:true,n:2},
  {name:'unchanged single formula',n:200},
  {name:'unchanged 20-formula paper',paper:true,n:200},
  {name:'changed formula',changing:true,n:20},
 ]){
  let tick=0;
  const update=()=>{tick++;flushSync(()=>root.render(h(Page,{tick,source:spec.paper?paper:undefined,tex:spec.large?matrix:spec.cold?'x^{'+(100000+tick)+'}+1':spec.changing&&tick%2?'x^3+1':'x^2+1',remount:spec.mount})));return host.getBoundingClientRect().width;};
  const measure=()=>{const start=performance.now();let width=0;for(let i=0;i<spec.n;i++)width+=update();return {ms:(performance.now()-start)/spec.n,width};};
  const until=performance.now()+150;do{measure();}while(performance.now()<until);
  const samples=[];let observed=0;for(let i=0;i<12;i++){const r=measure();samples.push(r.ms);observed+=r.width;}
  if(observed<=0||host.querySelectorAll('math').length!==(spec.paper?20:1))throw Error('Invalid benchmark output');
  rows.push({case:spec.name,iterations:spec.n,samples});
  flushSync(()=>root.render(null));await new Promise(resolve=>requestAnimationFrame(resolve));
 }
 root.unmount();return rows;
};
window.ready=true;
