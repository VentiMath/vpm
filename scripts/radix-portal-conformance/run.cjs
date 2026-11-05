'use strict';
const assert = require('node:assert/strict');
const [variant, version, mode] = process.argv.slice(2);
(async () => {
  const {JSDOM} = require('jsdom');
  let dom;
  if (mode === 'client') {
    dom = new JSDOM('<!doctype html><div id="root"></div>', {pretendToBeVisual:true});
    for (const key of ['window','document','navigator']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  }
  const {api:P,React,selected} = require('./load.cjs')(variant,version), h = React.createElement;
  const server = selected('react-dom/server');
  assert.equal(P.Root,P.Portal);
  assert.equal(server.renderToString(h(P.Portal,null,'hidden on server')),'');
  if (mode === 'server') {
    const isolated = new JSDOM();
    try {
      const explicit = h(P.Root,{container:isolated.window.document.body},'explicit');
      if (variant === 'vpm') assert.equal(server.renderToString(explicit),'');
      else assert.throws(()=>server.renderToString(explicit),/Portals are not currently supported/);
      assert.equal(globalThis.document,undefined);
    } finally {isolated.window.close();}
    console.log(variant,version,'SSR default and paired explicit-container behavior pass');
    return;
  }
  const host = document.getElementById('root');
  let root = selected('react-dom/client').createRoot(host);
  const render = tree => React.act(()=>root.render(tree));
  const item = () => document.getElementById('portaled');
  const target = document.createElement('section'), other = document.createElement('section');
  document.body.append(target,other);
  try {
    const ref = React.createRef();
    await render(h(P.Root,{id:'portaled',ref,className:'panel',style:{color:'red'},title:'title'},'text'));
    assert.equal(item().parentNode,document.body); assert.equal(ref.current,item()); assert.equal(host.childNodes.length,0);
    const original = item(); await render(h(P.Root,{id:'portaled',ref,title:'changed'},'updated'));
    assert.equal(item(),original); assert.equal(item().textContent,'updated'); assert.equal(item().title,'changed');
    await render(null); assert.equal(ref.current,null); assert.equal(item(),null);

    const initial = [];
    function Probe() {
      React.useLayoutEffect(()=>{initial.push(!!item());},[]);
      return h(P.Root,{id:'portaled'},'first commit');
    }
    await render(h(Probe)); assert.deepEqual(initial,[variant==='vpm']); assert(item()); await render(null);

    let cleaned = 0, events = [];
    const callback = element => {if(element) return ()=>cleaned++;};
    const Context = React.createContext('wrong');
    function Child(){return h('button',{id:'portaled',onClick:()=>events.push('child')},React.useContext(Context));}
    // Use a DOM child for the composed ref contract; functional descendants keep context.
    const withRef = container => h(Context.Provider,{value:'context'},h('div',{onClick:()=>events.push('parent')},
      h(P.Portal,{asChild:true,container,ref:callback,onClick:()=>events.push('portal'),className:'outer'},
        h('article',{className:'inner'},h(Child)))));
    await render(withRef(target)); assert.equal(target.children.length,1); assert.equal(target.firstChild.tagName,'ARTICLE');
    assert.equal(target.firstChild.className,'outer inner'); assert.equal(item().textContent,'context');
    await React.act(()=>item().click()); assert.deepEqual(events,['child','portal','parent']);
    await render(withRef(other)); assert.equal(target.children.length,0); assert.equal(other.children.length,1); assert.equal(cleaned,1);
    await render(null); assert.equal(other.children.length,0); assert.equal(cleaned,2);

    const fragment = document.createDocumentFragment();
    await render(h(P.Root,{container:fragment,id:'fragment'},'detached'));
    assert.equal(fragment.firstChild.id,'fragment'); await render(null); assert.equal(fragment.childNodes.length,0);
    await render(h(P.Root,{container:null,id:'portaled'},'fallback')); assert.equal(item().parentNode,document.body); await render(null);
    await render(h(React.StrictMode,null,h(P.Root,{id:'portaled',container:target,ref},'strict')));
    assert.equal(ref.current,item()); await render(null); assert.equal(ref.current,null); assert.equal(target.children.length,0);

    await React.act(()=>root.unmount());
    // A different root must hydrate correctly even after an earlier root mounted.
    for (const explicit of variant==='vpm' ? [false,true] : [false]) {
      const tree = h('main',null,h('span',{id:'sibling'},'preserve'),h(P.Root,{id:'portaled',...(explicit?{container:target}:{})},'hydrated'));
      host.innerHTML = server.renderToString(tree); const sibling = host.querySelector('#sibling'), errors = [];
      await React.act(()=>{root=selected('react-dom/client').hydrateRoot(host,tree,{onRecoverableError:error=>errors.push(error)});});
      assert.equal(host.querySelector('#sibling'),sibling); assert.deepEqual(errors,[]);
      assert.equal(item().parentNode,explicit?target:document.body);
      await React.act(()=>root.unmount()); root=null; assert.equal(item(),null);
    }
    console.log(variant,version,'container moves, context/events, slots/refs, fragments, StrictMode and independent-root hydration pass');
  } finally {if(root)await React.act(()=>root.unmount());dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
