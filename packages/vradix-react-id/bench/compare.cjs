'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-id-conformance'),upstream=path.join(fixture,'node_modules/@radix-ui/react-id'),vpm=path.resolve(__dirname,'..');
const cases=[];
for(const version of ['19.1','19.2'])for(const operation of ['SSR 32 IDs','commit 32 IDs'])cases.push({name:'React '+version+' / '+operation,make:file=>{
 const {JSDOM}=require(path.join(fixture,'node_modules/jsdom')),dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{pretendToBeVisual:true});globalThis.window=dom.window;globalThis.document=dom.window.document;
 const {api,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm',version);
 function Leaf({tick}){const id=api.useId();return React.createElement('i',{id},tick);}
 const tree=tick=>React.createElement('div',null,Array.from({length:32},(_,key)=>React.createElement(Leaf,{key,tick})));
 if(operation.startsWith('SSR')){const {renderToString}=selected('react-dom/server');return()=>renderToString(tree(1));}
 const {createRoot}=selected('react-dom/client'),{flushSync}=selected('react-dom'),container=document.getElementById('root'),root=createRoot(container);let tick=0;
 return()=>{flushSync(()=>root.render(tree(++tick&1)));return container.firstChild;};
},validate:value=>{if(typeof value==='string'){assert.equal((value.match(/id="radix-/g)||[]).length,32);}else {assert.equal(value.children.length,32);assert.match(value.firstChild.id,/^radix-/);}}});
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/radix-id-conformance/load.cjs','../../scripts/radix-id-conformance/package-lock.json','../../scripts/radix-id-conformance/current/package-lock.json','../../scripts/radix-id-conformance/node_modules/@radix-ui/react-id']}).catch(error=>{console.error(error);process.exitCode=1});
