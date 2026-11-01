'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
// Import without DOM globals, then use a subsequently created document.
const api=require('..'),{JSDOM}=require('../../../scripts/tabbable-conformance/node_modules/jsdom');
test('SSR import, late DOM creation, exports and live changes',async()=>{
 const esm=await import('../runtime.mjs');assert.equal(api.tabbable,esm.tabbable);
 const dom=new JSDOM('<button id="a">A</button><button id="b" tabindex="2">B</button><input type="hidden">');
 try{const body=dom.window.document.body,options={displayCheck:'none'};assert.deepEqual(api.tabbable(body,options).map(n=>n.id),['b','a']);body.querySelector('#a').disabled=true;assert.deepEqual(api.tabbable(body,options).map(n=>n.id),['b']);body.inert=true;body.setAttribute('inert','');assert.deepEqual(api.focusable(body,options),[]);}finally{dom.window.close();}
 for(const fn of [api.isTabbable,api.isFocusable,api.getTabIndex])assert.throws(()=>fn(null),/No node provided/);
});
