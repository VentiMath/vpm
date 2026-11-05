'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-dismissable-conformance');
const root=path.resolve(__dirname,'..'),upstream=path.join(fixture,'node_modules/@radix-ui/react-dismissable-layer');
require(path.join(fixture,'check-built.cjs'))(true);
let dom;const cleanup=[];
const cases=['SSR 8 layers','unchanged 8 layers','outside pointer 8 layers','Escape 8 layers'].map(name=>({
  name,
  async make(file){
    if(!dom){
      dom=new(require(path.join(fixture,'node_modules/jsdom')).JSDOM)('<!doctype html>',{pretendToBeVisual:true});
      for(const key of ['window','document','navigator','Node','HTMLElement','CustomEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
    }
    // Dispose the preceding case outside timing so only this case owns listeners.
    while(cleanup.length)cleanup.pop()();
    const {api:P,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm','19.1',true),h=React.createElement;
    let dismissed=0;const onDismiss=()=>dismissed++;
    const tree=()=>h('main',null,Array.from({length:8},(_,i)=>h(P.Root,{key:i,onDismiss},h('button',null,String(i)))));
    if(name.startsWith('SSR')){const render=selected('react-dom/server').renderToStaticMarkup;return()=>render(tree());}
    const host=document.createElement('div'),outside=document.createElement('button');document.body.append(host,outside);
    const client=selected('react-dom/client').createRoot(host),ReactDOM=selected('react-dom');
    ReactDOM.flushSync(()=>client.render(tree()));cleanup.push(()=>{ReactDOM.flushSync(()=>client.unmount());host.remove();outside.remove();});
    await new Promise(r=>setTimeout(r,15));
    if(name.startsWith('unchanged'))return()=>{ReactDOM.flushSync(()=>client.render(tree()));return host.querySelectorAll('button').length;};
    return()=>{
      const before=dismissed;
      if(name.startsWith('Escape'))outside.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
      else outside.dispatchEvent(new dom.window.PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:7}));
      return dismissed-before;
    };
  },
  validate(value){if(typeof value==='string')assert.equal((value.match(/<button/g)||[]).length,8);else assert.equal(value,name.startsWith('Escape')?1:8);},
}));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,
  files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs',
    ...Object.keys(require(path.join(fixture,'sources.cjs')).sources()).map(file=>'../../'+file),
    '../../scripts/radix-dismissable-conformance/load.cjs','../../scripts/radix-dismissable-conformance/check-built.cjs',
    '../../scripts/radix-dismissable-conformance/node_modules/.vpm-dismissable-production',
    '../../scripts/radix-dismissable-conformance/node_modules/@radix-ui/react-dismissable-layer'],
  cleanup:async()=>{while(cleanup.length)cleanup.pop()();await new Promise(r=>setTimeout(r,10));dom?.window.close();},
}).catch(error=>{console.error(error);process.exitCode=1;});
