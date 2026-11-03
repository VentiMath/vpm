'use strict';
// Keep React's development diagnostics identical and explicit in every worker.
process.env.NODE_ENV='development';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/slot-conformance'),upstream=path.join(fixture,'node_modules/@radix-ui/react-slot'),vpm=path.resolve(__dirname,'..');
const React=require(path.join(fixture,'node_modules/react')),{renderToStaticMarkup:ssr}=require(path.join(fixture,'node_modules/react-dom/server'));
const h=React.createElement;
function make(kind){return file=>{
  const {Slot,Slottable}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm');
  let element;
  if(kind==='plain')element=h(Slot,{className:'outer',onClick(){}},h('button',{className:'inner',onClick(){}},'text'));
  if(kind==='many'){const props={};for(let i=0;i<64;i++)props['data-field-'+i]='value';element=h(Slot,{'aria-label':'many',onClick(){}},h('button',props,'text'));}
  if(kind==='marked')element=h(Slot,{className:'outer'},h('i',{key:'left'},'Left'),h(Slottable,{key:'target',child:h('button',null,'text')},content=>h('b',null,content)),h('i',{key:'right'},'Right'));
  return ()=>ssr(element);
}}
const cases=[
  {name:'SSR / ordinary button',make:make('plain'),validate:x=>assert.equal(x,'<button class="outer inner">text</button>')},
  {name:'SSR / child with 64 data props',make:make('many'),validate:x=>{assert.match(x,/data-field-63="value"/);assert.match(x,/aria-label="many"/)}},
  {name:'SSR / Slottable render function and siblings',make:make('marked'),validate:x=>assert.equal(x,'<button class="outer"><i>Left</i><b>text</b><i>Right</i></button>')},
];
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../vradix-react-compose-refs/index.cjs','../vradix-react-compose-refs/package.json','../../scripts/slot-conformance/load.cjs','../../scripts/slot-conformance/package-lock.json','../../scripts/slot-conformance/node_modules/@radix-ui/react-slot']}).catch(e=>{console.error(e);process.exitCode=1});
