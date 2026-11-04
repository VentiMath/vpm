'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-hydrated-conformance'),root=path.resolve(__dirname,'..'),upstream=path.join(fixture,'node_modules/@radix-ui/react-use-is-hydrated'),cleanup=[];
require(path.join(fixture,'check-built.cjs'))();
const cases=['SSR 128 hooks','update 128 hooks'].map(name=>({name,make(file){
 const dom=new(require(path.join(fixture,'node_modules/jsdom')).JSDOM)('<div id="root"></div>');for(const key of ['window','document','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});cleanup.push(()=>dom.window.close());
 const {api,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm'),h=React.createElement;
 function Item(){return h('span',null,String(api.useIsHydrated()));}const tree=()=>h('div',null,Array.from({length:128},(_,key)=>h(Item,{key})));
 if(name.startsWith('SSR')){const render=selected('react-dom/server').renderToStaticMarkup;return()=>render(tree());}
 const {flushSync}=selected('react-dom'),r=selected('react-dom/client').createRoot(document.getElementById('root'));cleanup.push(()=>flushSync(()=>r.unmount()));flushSync(()=>r.render(tree()));return()=>{flushSync(()=>r.render(tree()));return document.getElementById('root').firstChild;};
},validate(value){if(typeof value==='string')assert.equal((value.match(/false/g)||[]).length,128);else{assert.equal(value.children.length,128);assert.equal(value.textContent,'true'.repeat(128));}}}));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs',...Object.keys(require(path.join(fixture,'sources.cjs')).sources()).map(file=>'../../'+file),'../../scripts/radix-hydrated-conformance/load.cjs','../../scripts/radix-hydrated-conformance/check-built.cjs','../../scripts/radix-hydrated-conformance/node_modules/@radix-ui/react-use-is-hydrated'],cleanup:()=>{for(const close of cleanup.reverse())close();}}).catch(e=>{console.error(e);process.exitCode=1;});
