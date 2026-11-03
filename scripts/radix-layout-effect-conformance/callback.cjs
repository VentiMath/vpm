'use strict';
const assert=require('node:assert/strict'),variant=process.argv[2],environment=process.argv[3];
let dom;
if(environment==='client'){const {JSDOM}=require('jsdom');dom=new JSDOM('<!doctype html><body></body>',{url:'https://callback.test'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement});globalThis.IS_REACT_ACT_ENVIRONMENT=true;}
const React=require('react'),{useCallbackRef}=require('./callback-load.cjs')(variant),h=React.createElement;
if(environment==='server'){
 const {renderToString}=require('react-dom/server');
 function Component(){const call=useCallbackRef((a,b)=>a+b),empty=useCallbackRef(undefined);assert.equal(empty(),undefined);return h('b',null,call(2,3));}
 assert.equal(renderToString(h(Component)),'<b>5</b>');
}else{
 const {render,act,cleanup}=require('@testing-library/react');let call,first,aborted;const layout=[];
 function Component({value,absent=false,suspend=false}){
  call=useCallbackRef(absent?undefined:(...args)=>[value,...args]);first??=call;assert.equal(call,first);
  React.useLayoutEffect(()=>{layout.push(call('layout'))});
  if(suspend){aborted=true;throw new Promise(()=>{});}
  return h('b',null,value);
 }
 try{
  const view=render(h(React.StrictMode,null,h(Component,{value:1})));
  assert.deepEqual(call('a',2),[1,'a',2]);assert.deepEqual(layout.at(-1),[1,'layout']);
  view.rerender(h(React.StrictMode,null,h(Component,{value:2})));assert.deepEqual(layout.at(-1),[2,'layout']);
  view.rerender(h(React.StrictMode,null,h(Component,{value:3,absent:true})));assert.equal(call(),undefined);
  view.rerender(h(React.StrictMode,null,h(Component,{value:4})));assert.deepEqual(call(),[4]);
  act(()=>{React.startTransition(()=>view.rerender(h(React.StrictMode,null,h(Component,{value:5,suspend:true}))))});
  assert.equal(aborted,true);assert.deepEqual(first(),[4],'uncommitted render must not publish its callback');
  view.rerender(h(React.StrictMode,null,h(Component,{value:6})));assert.deepEqual(first(),[6]);view.unmount();
  // Return values, thrown values and async results pass through without wrapping.
  let forwarded;function Values(){forwarded=useCallbackRef(value=>{if(value instanceof Error)throw value;return value});return null;}
  const v=render(h(Values)),error=new Error('fixture'),promise=Promise.resolve(7);
  assert.throws(()=>forwarded(error),e=>e===error);assert.equal(forwarded(promise),promise);v.unmount();
 }finally{cleanup();dom.window.close();}
}
console.log(variant+' '+environment+': callback identity, committed targets and forwarding pass');
