'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-focus-guards-conformance'),upstream=path.join(fixture,'node_modules/@radix-ui/react-focus-guards'),vpm=path.resolve(__dirname,'..');
const cases=[{name:'DOM / mount two guard consumers and clean up',make:file=>{
 const {JSDOM}=require(path.join(fixture,'node_modules/jsdom')),dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{pretendToBeVisual:true});
 globalThis.window=dom.window;globalThis.document=dom.window.document;
 const React=require(path.join(fixture,'node_modules/react')),{createRoot}=require(path.join(fixture,'node_modules/react-dom/client')),{flushSync}=require(path.join(fixture,'node_modules/react-dom'));
 const {FocusGuards}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm'),root=createRoot(document.getElementById('root'));
 const tree=React.createElement(React.Fragment,null,React.createElement(FocusGuards,null,'one'),React.createElement(FocusGuards,null,'two'));
 return()=>{flushSync(()=>root.render(tree));const count=document.body.children.length;flushSync(()=>root.render(null));return count*10+document.body.children.length;};
},validate:count=>assert.equal(count,31)}];
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/radix-focus-guards-conformance/load.cjs','../../scripts/radix-focus-guards-conformance/package-lock.json','../../scripts/radix-focus-guards-conformance/node_modules/@radix-ui/react-focus-guards']}).catch(e=>{console.error(e);process.exitCode=1});
