'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-effect-event-conformance'),upstream=path.join(fixture,'node_modules/@radix-ui/react-use-effect-event'),vpm=path.resolve(__dirname,'..');
const cases=[];
for(const version of ['19.1','19.2'])for(const operation of ['commit and invoke','retained invocation'])cases.push({name:'React '+version+' / '+operation,make:file=>{
 const {JSDOM}=require(path.join(fixture,'node_modules/jsdom')),dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{pretendToBeVisual:true});
 globalThis.window=dom.window;globalThis.document=dom.window.document;
 const {api,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm',version),{createRoot}=selected('react-dom/client'),{flushSync}=selected('react-dom');
 const root=createRoot(document.getElementById('root'));let event,iteration=0;
 function Consumer({value}){event=api.useEffectEvent(n=>n+value);return null;}
 flushSync(()=>root.render(React.createElement(Consumer,{value:1})));
 if(operation==='retained invocation'){const retained=event;return()=>retained(41);}
 return()=>{const value=++iteration&1;flushSync(()=>root.render(React.createElement(Consumer,{value})));return event(42-value);};
},validate:result=>assert.equal(result,42)});
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/radix-effect-event-conformance/load.cjs','../../scripts/radix-effect-event-conformance/package-lock.json','../../scripts/radix-effect-event-conformance/current/package-lock.json','../../scripts/radix-effect-event-conformance/node_modules/@radix-ui/react-use-effect-event']}).catch(error=>{console.error(error);process.exitCode=1});
