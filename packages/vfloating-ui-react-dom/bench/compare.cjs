'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),path=require('node:path');
const fixture=path.resolve(__dirname,'../../../scripts/floating-react-dom-conformance');
require(path.join(fixture,'prepare.cjs'));
const root=path.resolve(__dirname,'..');
const cases=[
 {name:'hook / mounted controlled-platform update',async:true,make:async directory=>{
   const {JSDOM}=require(path.join(fixture,'node_modules/jsdom'));
   const env=new JSDOM('<!doctype html><div id="root"></div>',{pretendToBeVisual:true});
   for(const key of ['window','document','HTMLElement','Element','Node'])globalThis[key]=env.window[key];
   const React=require(path.join(fixture,'node_modules/react')),{createRoot}=require(path.join(fixture,'node_modules/react-dom/client')),{flushSync}=require(path.join(fixture,'node_modules/react-dom'));
   const api=require(directory);let current,done,x=0;
   const platform={isRTL:()=>false,getElementRects:()=>({reference:{x,y:0,width:20,height:10},floating:{x:0,y:0,width:10,height:5}})},middleware=[api.offset(4)];
   function App(){current=api.useFloating({platform,middleware});React.useLayoutEffect(()=>{if(current.isPositioned)done?.(current.x);},[current.x,current.isPositioned]);return React.createElement(React.Fragment,null,React.createElement('button',{ref:current.refs.setReference}),React.createElement('div',{ref:current.refs.setFloating}));}
   const mounted=new Promise(resolve=>done=resolve);const reactRoot=createRoot(document.getElementById('root'));flushSync(()=>reactRoot.render(React.createElement(App)));await mounted;
   return()=>new Promise(resolve=>{x=x===0?10:0;done=result=>resolve(result===x+5&&current.y===14);current.update();});
 },validate:r=>assert.equal(r,true)},
 {name:'middleware / popover chain',make:directory=>{const a=require(directory);return()=>[a.offset(4),a.flip({fallbackAxisSideDirection:'end',crossAxis:false}),a.shift({limiter:a.limitShift({offset:4})})];},validate:r=>assert.deepEqual(r.map(m=>m.name),['offset','flip','shift'])},
 ...[false,true].map(configured=>({name:'server render / '+(configured?'popover options':'defaults'),make:directory=>{
   const api=require(directory),React=require(path.join(fixture,'node_modules/react')),{renderToString}=require(path.join(fixture,'node_modules/react-dom/server'));
   function App(){const f=api.useFloating(configured?{placement:'bottom-start',middleware:[api.offset(4),api.flip(),api.shift()]}:undefined);return React.createElement('div',{style:f.floatingStyles},f.placement);}
   return()=>renderToString(React.createElement(App));
 },validate:r=>assert.ok(r.includes(configured?'bottom-start':'bottom'))})),
];
require('../../../scripts/bench-process.cjs').run({root,upstream:path.join(fixture,'node_modules/@floating-ui/react-dom'),vpm:root,cases,validationOnly:process.argv.includes('--validate'),files:['package.json','index.cjs','runtime.mjs','equivalent.mjs','bench/compare.cjs',...['vfloating-ui-dom','vfloating-ui-core','vfloating-ui-utils'].flatMap(name=>require('node:fs').readdirSync(path.resolve(root,'..',name)).filter(n=>n.endsWith('.mjs')||n==='package.json').map(n=>'../'+name+'/'+n)),'../../scripts/floating-react-dom-conformance/prepare.cjs','../../scripts/floating-react-dom-conformance/package-lock.json','../../scripts/floating-react-dom-conformance/node_modules/@floating-ui/react-dom','../../scripts/floating-react-dom-conformance/node_modules/@floating-ui/dom','../../scripts/floating-react-dom-conformance/node_modules/@floating-ui/core','../../scripts/floating-react-dom-conformance/node_modules/@floating-ui/utils','../../scripts/floating-react-dom-conformance/node_modules/react','../../scripts/floating-react-dom-conformance/node_modules/react-dom','../../scripts/floating-react-dom-conformance/node_modules/scheduler','../../scripts/floating-react-dom-conformance/node_modules/jsdom']}).catch(e=>{console.error(e);process.exitCode=1;});
