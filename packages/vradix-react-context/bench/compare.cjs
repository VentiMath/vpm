'use strict';
process.env.NODE_ENV='development';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-context-conformance'),upstream=path.join(fixture,'node_modules/@radix-ui/react-context'),vpm=path.resolve(__dirname,'..');
const React=require(path.join(fixture,'node_modules/react')),{renderToStaticMarkup:ssr}=require(path.join(fixture,'node_modules/react-dom/server')),h=React.createElement,load=require(path.join(fixture,'load.cjs'));
const cases=[
 {name:'create context',make:file=>{const api=load(file===upstream?'upstream':'vpm');return()=>api.createContext('Root',{n:1})},validate:pair=>{assert.equal(pair[0].displayName,'RootProvider');assert.equal(typeof pair[1],'function')}},
 {name:'create scope / 16 contexts',make:file=>{const api=load(file===upstream?'upstream':'vpm');return()=>{const [create,scope]=api.createContextScope('Root');for(let i=0;i<16;i++)create('C'+i,{n:i});return scope()}},validate:scope=>assert.equal(typeof scope,'function')},
 {name:'SSR / provider and consumer',make:file=>{const [Provider,use]=load(file===upstream?'upstream':'vpm').createContext('Root');function Child(){return h('span',null,use('Child').n)}const tree=h(Provider,{n:42},h(Child));return()=>ssr(tree)},validate:html=>assert.equal(html,'<span>42</span>')},
];
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/radix-context-conformance/load.cjs','../../scripts/radix-context-conformance/package-lock.json','../../scripts/radix-context-conformance/node_modules/@radix-ui/react-context']}).catch(e=>{console.error(e);process.exitCode=1});
