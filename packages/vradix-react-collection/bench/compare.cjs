'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-collection-conformance'),root=path.resolve(__dirname,'..');
require(path.join(fixture,'check-built.cjs'))();
const upstream=path.join(fixture,'node_modules/@radix-ui/react-collection'),cleanup=[];
const cases=['SSR 16 items','read 16 items','read 256 items','unchanged 16-item render'].map(name=>({name,make(file){
 const dom=new (require(path.join(fixture,'node_modules/jsdom')).JSDOM)('<div id="root"></div>');
 for(const key of ['window','document','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});cleanup.push(()=>dom.window.close());
 const {api,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm'),h=React.createElement,[C,useItems]=api.createCollection('Bench');
 const count=name.includes('256')?256:16;let get;
 function Read(){get=useItems(undefined);return null;}
 const tree=()=>h(C.Provider,{scope:undefined},h(C.Slot,{scope:undefined},h('div',null,Array.from({length:count},(_,id)=>h(C.ItemSlot,{key:id,scope:undefined,id},h('button',null,String(id)))))),h(Read));
 if(name.startsWith('SSR')){const {renderToStaticMarkup}=selected('react-dom/server');return()=>renderToStaticMarkup(tree());}
 const {flushSync}=selected('react-dom'),r=selected('react-dom/client').createRoot(document.getElementById('root'));cleanup.push(()=>flushSync(()=>r.unmount()));flushSync(()=>r.render(tree()));assert.equal(get().length,count);
 return name.startsWith('read')?()=>get():()=>{flushSync(()=>r.render(tree()));return document.getElementById('root').firstChild;};
},validate(result){if(typeof result==='string')assert.equal((result.match(/data-radix-collection-item/g)||[]).length,16);else if(Array.isArray(result)){assert.equal(result.length,name.includes('256')?256:16);assert.equal(result[0].id,0);assert.equal(result.at(-1).id,result.length-1);}else assert.equal(result.children.length,16);}}));
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs',...Object.keys(require(path.join(fixture,'sources.cjs')).sources()).map(file=>'../../'+file),'../../scripts/radix-collection-conformance/load.cjs','../../scripts/radix-collection-conformance/check-built.cjs','../../scripts/radix-collection-conformance/node_modules/@radix-ui/react-collection'],cleanup:()=>{for(const close of cleanup.reverse())close();}}).catch(e=>{console.error(e);process.exitCode=1;});
