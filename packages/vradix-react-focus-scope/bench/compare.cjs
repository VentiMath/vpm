'use strict';
process.env.NODE_ENV = 'production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-focus-scope-conformance');
const root=path.resolve(__dirname,'..'),upstream=path.join(fixture,'node_modules/@radix-ui/react-focus-scope');
require(path.join(fixture,'check-built.cjs'))(true);
let dom;const cleanup=[];
const cases=['SSR 8 scopes','unchanged 8 scopes','Tab loop 32 controls'].map(name=>({
  name,
  make(file){
    if(!dom){
      dom=new(require(path.join(fixture,'node_modules/jsdom')).JSDOM)('<!doctype html>',{pretendToBeVisual:true});
      for(const key of ['window','document','navigator','NodeFilter','HTMLElement','CustomEvent','MutationObserver'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
      // Identical visible-box model for both implementations; no CSS/layout timing.
      dom.window.getComputedStyle=globalThis.getComputedStyle=()=>({display:'block',visibility:'visible'});
      dom.window.HTMLElement.prototype.getClientRects=()=>[{width:20,height:20}];
      dom.window.HTMLElement.prototype.checkVisibility=()=>true;
    }
    const {api:P,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm','19.1',true),h=React.createElement;
    const cancel=e=>e.preventDefault(),loop=name.startsWith('Tab');
    const tree=()=>h('main',null,Array.from({length:loop?1:8},(_,i)=>h(P.Root,{key:i,loop,onMountAutoFocus:cancel,onUnmountAutoFocus:cancel},Array.from({length:loop?32:4},(_,j)=>h('button',{key:j},String(j))))));
    if(name.startsWith('SSR')){const render=selected('react-dom/server').renderToStaticMarkup;return()=>render(tree());}
    const host=document.createElement('div');document.body.append(host);const client=selected('react-dom/client').createRoot(host),{flushSync}=selected('react-dom');
    flushSync(()=>client.render(tree()));cleanup.push(()=>{flushSync(()=>client.unmount());host.remove();});
    if(loop){const buttons=host.querySelectorAll('button');return()=>{buttons[31].focus();const event=new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true});buttons[31].dispatchEvent(event);return {focused:document.activeElement===buttons[0],prevented:event.defaultPrevented};};}
    return()=>{flushSync(()=>client.render(tree()));return host.querySelectorAll('button').length;};
  },
  validate(value){if(typeof value==='string')assert.equal((value.match(/<button/g)||[]).length,32);else if(typeof value==='number')assert.equal(value,32);else assert.deepEqual(value,{focused:true,prevented:true});},
}));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,
  files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs',
    ...Object.keys(require(path.join(fixture,'sources.cjs')).sources()).map(file=>'../../'+file),
    '../../scripts/radix-focus-scope-conformance/load.cjs','../../scripts/radix-focus-scope-conformance/check-built.cjs',
    '../../scripts/radix-focus-scope-conformance/node_modules/.vpm-focus-scope-production',
    '../../scripts/radix-focus-scope-conformance/node_modules/@radix-ui/react-focus-scope'],
  cleanup:async()=>{for(const close of cleanup.reverse())close();await new Promise(r=>setTimeout(r,10));dom?.window.close();},
}).catch(error=>{console.error(error);process.exitCode=1;});
