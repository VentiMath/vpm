'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-dropdown-menu-conformance'),root=path.resolve(__dirname,'..'),upstream=path.join(fixture,'node_modules/@radix-ui/react-dropdown-menu');
require(path.join(fixture,'check-built.cjs'))(true);
let dom;const cleanup=[];
const cases=['closed trigger SSR','open 16 items SSR','unchanged 16 items','canceled selection'].map(name=>({name,
  async make(file){
    if(!dom){
      dom=new(require(path.join(fixture,'node_modules/jsdom')).JSDOM)('<!doctype html>',{pretendToBeVisual:true});
      require('../../../scripts/radix-use-size-conformance/dom.cjs').install(dom.window);
      for(const key of ['window','document','navigator','Node','NodeFilter','HTMLElement','HTMLInputElement','Element','SVGElement','CustomEvent','MutationObserver','getComputedStyle','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
      dom.window.HTMLElement.prototype.getClientRects=()=>[{width:100,height:30}];dom.window.HTMLElement.prototype.checkVisibility=()=>true;
    }
    while(cleanup.length)cleanup.pop()();await new Promise(r=>setTimeout(r,10));
    const {api:P,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm','19.1',true),h=React.createElement;
    let selections=0;const select=e=>{e.preventDefault();selections++;};
    const tree=()=>h(P.Root,{open:!name.startsWith('closed'),modal:false},h(P.Trigger,null,'Open'),h(P.Content,{avoidCollisions:false},Array.from({length:16},(_,i)=>h(P.Item,{key:i,onSelect:select},'Item '+i))));
    if(name.endsWith('SSR')){const render=selected('react-dom/server').renderToStaticMarkup;return()=>render(tree());}
    const host=document.createElement('div');document.body.append(host);const client=selected('react-dom/client').createRoot(host),ReactDOM=selected('react-dom');
    ReactDOM.flushSync(()=>client.render(tree()));cleanup.push(()=>{ReactDOM.flushSync(()=>client.unmount());host.remove();});await new Promise(r=>setTimeout(r,20));
    if(name.startsWith('unchanged'))return()=>{ReactDOM.flushSync(()=>client.render(tree()));return host.querySelectorAll('[role="menuitem"]').length;};
    const item=host.querySelector('[role="menuitem"]');return()=>{const before=selections;item.click();return selections-before;};
  },validate(value){if(typeof value==='string')assert.equal((value.match(/role="menuitem"/g)||[]).length,name.startsWith('closed')?0:16);else assert.equal(value,name==='canceled selection'?1:16);}
}));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs',...Object.keys(require(path.join(fixture,'sources.cjs')).sources()).map(file=>'../../'+file),'../../scripts/radix-dropdown-menu-conformance/load.cjs','../../scripts/radix-dropdown-menu-conformance/check-built.cjs','../../scripts/radix-dropdown-menu-conformance/node_modules/.vpm-dropdown-menu-production','../../scripts/radix-dropdown-menu-conformance/node_modules/@radix-ui/react-dropdown-menu','../../scripts/radix-use-size-conformance/dom.cjs'],cleanup:async()=>{while(cleanup.length)cleanup.pop()();await new Promise(r=>setTimeout(r,20));dom?.window.close();}}).catch(error=>{console.error(error);process.exitCode=1;});
