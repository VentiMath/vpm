 'use strict';
const assert=require('node:assert/strict'),variant=process.argv[2],environment=process.argv[3];
if(environment==='client'){const {JSDOM}=require('jsdom');const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement});globalThis.IS_REACT_ACT_ENVIRONMENT=true;}
const React=require('react'),api=require('./load.cjs')(variant),h=React.createElement;
if(environment==='server'){
 const {renderToString}=require('react-dom/server');let called=0;
 function Component(){api.useLayoutEffect(()=>{called++},[]);return h('b',null,'server')}
 assert.equal(renderToString(h(Component)),'<b>server</b>');assert.equal(called,0);assert.notEqual(api.useLayoutEffect,React.useLayoutEffect);
 globalThis.document={};api.useLayoutEffect(()=>{called++},[]);assert.equal(called,0);
}else{
 assert.equal(api.useLayoutEffect,React.useLayoutEffect);
 // Load the unchanged Radix caller with only its leaf import redirected.
 const Module=require('node:module'),original=Module._load;
 Module._load=function(id,...args){return id==='@radix-ui/react-use-layout-effect'?api:original.call(this,id,...args)};
 const {useCallbackRef}=require('@radix-ui/react-use-callback-ref');Module._load=original;
 const {render,act}=require('@testing-library/react'),events=[];let stable,callback;
 function Component({value}){callback=useCallbackRef(()=>value);stable??=callback;assert.equal(callback,stable);api.useLayoutEffect(()=>{events.push('layout '+value);return()=>events.push('clean '+value)},[value]);React.useEffect(()=>{events.push('passive '+value)},[value]);return h('b',null,value)}
 const view=render(h(Component,{value:1}));assert.deepEqual(events,['layout 1','passive 1']);assert.equal(callback(),1);
 view.rerender(h(Component,{value:2}));assert.deepEqual(events,['layout 1','passive 1','clean 1','layout 2','passive 2']);assert.equal(callback(),2);
 view.rerender(h(Component,{value:2}));assert.equal(events.length,5);view.unmount();assert.equal(events.at(-1),'clean 2');
 events.length=0;stable=undefined;const strict=render(h(React.StrictMode,null,h(Component,{value:3})));assert.deepEqual(events,['layout 3','passive 3','clean 3','layout 3','passive 3']);strict.unmount();assert.equal(events.at(-1),'clean 3');
}
console.log(variant+' '+environment+' layout effect, cleanup, environment and unchanged callback-ref caller pass');
