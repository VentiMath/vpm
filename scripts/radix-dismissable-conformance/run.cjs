'use strict';
const assert=require('node:assert/strict');
const [variant,version,mode]=process.argv.slice(2);
(async()=>{
  const {JSDOM}=require('jsdom');let dom;
  if(mode==='client'){
    dom=new JSDOM('<!doctype html><div id="root"></div>',{pretendToBeVisual:true});
    for(const key of ['window','document','navigator','Node','HTMLElement','CustomEvent','MutationObserver'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  }
  const {api:P,React,selected}=require('./load.cjs')(variant,version),h=React.createElement,server=selected('react-dom/server');
  assert.equal(P.Root,P.DismissableLayer);assert.equal(P.Branch,P.DismissableLayerBranch);
  const markup=server.renderToString(h(P.Root,{id:'hydrated',disableOutsidePointerEvents:true,deferPointerDownOutside:true,title:'pass'},h('button',null,'inside')));
  assert.match(markup,/<div id="hydrated" title="pass"><button>inside<\/button><\/div>/);assert.doesNotMatch(markup,/disableOutside|deferPointer/);
  if(mode==='server'){assert.equal(globalThis.document,undefined);console.log('SSR aliases and attributes pass');return;}
  const host=document.getElementById('root');let root=selected('react-dom/client').createRoot(host);
  try{
    const list=await (await import('./checks.mjs')).checks({P,React,ReactDOM:selected('react-dom'),root,document,variant,render:tree=>React.act(()=>root.render(tree)),step:fn=>React.act(fn)});
    await React.act(()=>root.unmount());root=null;
    host.innerHTML=markup;const original=host.firstChild,errors=[];
    await React.act(()=>{root=selected('react-dom/client').hydrateRoot(host,h(P.Root,{id:'hydrated',disableOutsidePointerEvents:true,deferPointerDownOutside:true,title:'pass'},h('button',null,'inside')),{onRecoverableError:e=>errors.push(e)});});
    assert.equal(host.firstChild,original);assert.deepEqual(errors,[]);
    console.log(variant,version,list.join('; '),'and hydration pass');
  }finally{if(root)await React.act(()=>root.unmount());await new Promise(r=>setTimeout(r,10));dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
