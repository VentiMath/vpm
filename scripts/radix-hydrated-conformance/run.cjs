'use strict';
const assert=require('node:assert/strict');
const [variant='vpm',version='19.1',mode='client']=process.argv.slice(2);
let dom;
if(mode==='client'){
 dom=new(require('jsdom').JSDOM)('<div id="a"></div><div id="b"></div>',{pretendToBeVisual:true});
 for(const name of ['window','document','navigator','HTMLElement','Element','Node','CustomEvent'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
}
const {api,React,selected}=require('./load.cjs')(variant,version),h=React.createElement,{act}=React,{renderToString}=selected('react-dom/server');
let values=[];
function State(){const hydrated=api.useIsHydrated();values.push(hydrated);return h('output',null,String(hydrated));}
const tree=h(React.StrictMode,null,h(State));
assert.equal(renderToString(tree),'<output>false</output>');assert(values.every(x=>x===false));
if(mode==='server'){assert.equal(typeof window,'undefined');console.log(variant,version,'DOM-free SSR false');}
else(async()=>{
 const roots=[];try{
  const client=selected('react-dom/client');let root=client.createRoot(document.getElementById('a'));roots.push(root);values=[];
  await act(()=>root.render(tree));assert(values.every(x=>x===true));assert.equal(document.getElementById('a').textContent,'true');
  // Rendering on the server after a client mount must still use a false snapshot.
  assert.equal(renderToString(tree),'<output>false</output>');
  for(const id of ['b','a']){
   if(id==='a'){await act(()=>root.unmount());roots.splice(roots.indexOf(root),1);}
   const host=document.getElementById(id);host.innerHTML=renderToString(tree);const before=host.firstChild,errors=[];values=[];
   let hydrating;await act(()=>{hydrating=client.hydrateRoot(host,tree,{onRecoverableError:e=>errors.push(e)});});roots.push(hydrating);
   assert.equal(values[0],false,'each root starts with server snapshot');assert.equal(values.at(-1),true);assert.equal(host.firstChild,before);assert.deepEqual(errors,[]);
   values=[];await act(()=>hydrating.render(h(React.StrictMode,null,h(State))));assert(values.every(x=>x===true));
  }
  for(const r of roots.splice(0))await act(()=>r.unmount());
  // The real caller counts focusable children across SSR and hydration.
  const P=api.Roving,caller=h(P.Root,{orientation:'horizontal'},h(P.Item,{tabStopId:'one',asChild:true},h('button',null,'one')),h(P.Item,{tabStopId:'two',focusable:false},'two'));
  const host=document.getElementById('a');host.innerHTML=renderToString(caller);const before=host.firstChild;assert.equal(before.tabIndex,-1);
  const errors=[];await act(()=>{root=client.hydrateRoot(host,caller,{onRecoverableError:e=>errors.push(e)});});roots.push(root);assert.equal(host.firstChild,before);assert.equal(before.tabIndex,0);assert.deepEqual(errors,[]);
  console.log(variant,version,'client true, independent hydration roots false→true, SSR after mount, StrictMode, node identity and unchanged Roving Focus hydration');
 }finally{for(const r of roots)await act(()=>r.unmount());dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
