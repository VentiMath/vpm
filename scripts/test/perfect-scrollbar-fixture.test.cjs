'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('../perfect-scrollbar-conformance/dom.cjs');
const names=['window','document','Event','CustomEvent','Element','HTMLElement','getComputedStyle'];
const snapshot=()=>Object.fromEntries(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
test('scrollbar DOM fixtures restore native globals, including out-of-order cleanup',()=>{
 const before=snapshot(),a=fixture(),b=fixture();
 a.close();assert.equal(globalThis.window,b.win);b.close();b.close();assert.deepEqual(snapshot(),before);
 if(before.Event?.value && typeof EventTarget==='function')assert.equal(new EventTarget().dispatchEvent(new Event('test')),true);
});
