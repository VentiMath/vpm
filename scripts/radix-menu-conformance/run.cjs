'use strict';
const assert=require('node:assert/strict');
const [variant,version,mode]=process.argv.slice(2);
(async()=>{
  const {JSDOM}=require('jsdom');let dom;
  if(mode==='client'){
    dom=new JSDOM('<!doctype html><div id="root"></div>',{pretendToBeVisual:true});
    require('../radix-use-size-conformance/dom.cjs').install(dom.window);
    for(const key of ['window','document','navigator','Node','NodeFilter','HTMLElement','HTMLInputElement','Element','SVGElement','CustomEvent','MutationObserver','getComputedStyle','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
    dom.window.HTMLElement.prototype.getClientRects=()=>[{width:100,height:30}];dom.window.HTMLElement.prototype.checkVisibility=()=>true;
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  }
  const {api:P,React,selected}=require('./load.cjs')(variant,version),h=React.createElement,server=selected('react-dom/server');
  for(const name of ['Anchor','Portal','Content','Group','Label','Item','CheckboxItem','RadioGroup','RadioItem','ItemIndicator','Separator','Arrow','Sub','SubTrigger','SubContent'])assert.equal(P[name],P['Menu'+name]);assert.equal(P.Menu,P.Root);
  const tree=h(P.Root,{open:true,modal:false},h(P.Anchor,null,'anchor'),h(P.Content,null,h(P.Label,null,'label'),h(P.Item,null,'item'),h(P.CheckboxItem,{checked:'indeterminate'},h(P.ItemIndicator,null,'check')),h(P.Separator)));
  const markup=server.renderToString(tree);assert.match(markup,/role="menu"/);assert.match(markup,/aria-checked="mixed"/);assert.match(markup,/role="separator"/);
  if(mode==='server'){
    assert.equal(globalThis.document,undefined);assert.equal(server.renderToString(h(P.Root,null,h(P.Content,null,'hidden'))),'');
    const useScope=P.createMenuScope();function Scoped(){const scope=useScope();return h(P.Root,{...scope,open:true,modal:false},h(P.Root,null,h(P.Content,scope,h(P.Item,scope,'outer scope'))));}
    assert.match(server.renderToString(h(Scoped)),/outer scope/);assert.throws(()=>server.renderToString(h(P.Item,null,'orphan')),/must be used within/);console.log('SSR aliases, state, scopes, attributes and missing provider pass');return;
  }
  const host=document.getElementById('root');let root=selected('react-dom/client').createRoot(host);
  try{
    const results=await(await import('./checks.mjs')).checks({P,React,ReactDOM:selected('react-dom'),document,variant,render:tree=>React.act(()=>root.render(tree)),step:fn=>React.act(fn)});
    await React.act(()=>root.unmount());root=null;host.innerHTML=markup;const original=host.firstChild,errors=[];
    await React.act(()=>{root=selected('react-dom/client').hydrateRoot(host,tree,{onRecoverableError:e=>errors.push(e)});});assert.equal(host.firstChild,original);assert.deepEqual(errors,[]);
    console.log(variant,version,results.join('; '),'and hydration pass');
  }finally{if(root)await React.act(()=>root.unmount());await new Promise(r=>setTimeout(r,20));dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
