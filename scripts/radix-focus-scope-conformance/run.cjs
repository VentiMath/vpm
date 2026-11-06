'use strict';
const assert = require('node:assert/strict');
const [variant,version,mode] = process.argv.slice(2);
(async()=>{
  let dom;
  if(mode==='client'){
    dom=new(require('jsdom').JSDOM)('<!doctype html><button id="trigger">trigger</button><button id="outside">outside</button><div id="root"></div>',{pretendToBeVisual:true});
    for(const key of ['window','document','navigator','NodeFilter','HTMLElement','CustomEvent','MutationObserver'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
    globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
    // jsdom has no layout. Model connected visible boxes; Chrome tests real CSS.
    dom.window.HTMLElement.prototype.getClientRects=function(){for(let n=this;n;n=n.parentElement)if(n.hidden||n.style.display==='none')return [];return this.isConnected?[{width:20,height:20}]:[];};
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  }
  const {api:P,React,selected}=require('./load.cjs')(variant,version),h=React.createElement;
  const server=selected('react-dom/server');
  assert.equal(P.FocusScope,P.Root);
  const html=server.renderToString(h(P.Root,{id:'scope',loop:true,trapped:true},h('button',null,'one')));
  assert.match(html,/tabindex="-1"/);assert.doesNotMatch(html,/loop=|trapped=/);
  if(mode==='server'){assert.equal(globalThis.document,undefined);console.log(variant,version,'SSR and aliases pass');return;}
  const host=document.getElementById('root'),trigger=document.getElementById('trigger'),outside=document.getElementById('outside');
  let root=selected('react-dom/client').createRoot(host);
  const render=x=>React.act(()=>root.render(x)),tick=()=>React.act(()=>new Promise(r=>setTimeout(r,5)));
  const stop=async()=>{await render(null);await tick();};
  const scope=(props={},ids=['first','last'])=>h(P.Root,{id:'scope',...props},ids.map(id=>h('button',{id,key:id},id)));
  const key=async(node,extra={})=>{let e;await React.act(()=>{e=new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true,...extra});node.dispatchEvent(e);});return e;};
  try{
    trigger.focus();await render(scope({loop:true,trapped:true}));assert.equal(document.activeElement.id,'first');
    outside.focus();assert.equal(document.activeElement.id,'first');document.getElementById('last').focus();assert((await key(document.activeElement)).defaultPrevented);assert.equal(document.activeElement.id,'first');
    await key(document.activeElement,{shiftKey:true});assert.equal(document.activeElement.id,'last');assert.equal((await key(document.activeElement,{ctrlKey:true})).defaultPrevented,false);
    await stop();assert.equal(document.activeElement,trigger);

    trigger.focus();let mount=0,unmount=0;await render(scope({onMountAutoFocus:e=>{mount++;e.preventDefault();},onUnmountAutoFocus:e=>{unmount++;e.preventDefault();}}));
    assert.equal(document.activeElement,trigger);assert.equal(mount,1);document.getElementById('first').focus();await stop();assert.equal(unmount,1);assert.equal(document.activeElement,document.body);
    trigger.focus();await render(scope({onMountAutoFocus:e=>e.preventDefault()}));await render(scope({onMountAutoFocus:e=>e.preventDefault(),onUnmountAutoFocus:e=>{e.preventDefault();outside.focus();}}));await stop();assert.equal(document.activeElement,outside);

    let keys=0;await render(scope({loop:true,onKeyDown:e=>{keys++;e.preventDefault();}}));document.getElementById('last').focus();await key(document.activeElement);
    assert.equal(keys,variant==='vpm'?1:0);assert.equal(document.activeElement.id,variant==='vpm'?'last':'first');await stop();
    await render(scope({trapped:true}));document.getElementById('last').focus();const boundary=await key(document.activeElement);assert(boundary.defaultPrevented);assert.equal(document.activeElement.id,'last');await stop();
    await render(scope({loop:true},[]));assert.equal(document.activeElement.id,'scope');assert((await key(document.activeElement)).defaultPrevented);await stop();

    // Keep the later focus in the same task as unmount; async act can drain
    // upstream's zero-delay restoration before the simulated later interaction.
    trigger.focus();await render(scope());React.act(()=>root.render(null));outside.focus();await tick();assert.equal(document.activeElement,variant==='vpm'?outside:trigger);
    trigger.focus();await render(scope({trapped:true}));document.getElementById('first').remove();await tick();assert(host.contains(document.activeElement));await stop();

    const branch=document.createElement('aside');branch.innerHTML='<button id="branch">branch</button>';document.body.append(branch);
    await render(scope({trapped:true,branches:[branch]}));branch.firstChild.focus();assert.equal(document.activeElement,branch.firstChild);outside.focus();assert.equal(document.activeElement,branch.firstChild);await stop();branch.remove();
    let registryState;
    function Registry(){registryState=P.useFocusScopeBranchRegistry();return null;}
    await render(h(Registry));const node=document.createElement('div');await React.act(()=>{registryState.registry.add(node);registryState.registry.add(node);});assert.equal(registryState.nodes.length,1);
    await React.act(()=>registryState.registry.remove(node));assert.equal(registryState.nodes.length,variant==='vpm'?1:0);
    await React.act(()=>registryState.registry.remove(node));assert.equal(registryState.nodes.length,0);await stop();
    function Branch({node}){P.useFocusScopeBranch(node);return null;}
    function Registered({show}){const state=P.useFocusScopeBranchRegistry();registryState=state;return h(P.FocusScopeBranchProvider,{registry:state.registry},h(P.FocusScopeBranchProvider,{registry:null},show&&h(Branch,{node})));}
    await render(h(Registered,{show:true}));assert.equal(registryState.nodes[0],node);await render(h(Registered,{show:false}));assert.equal(registryState.nodes.length,0);await stop();

    const child=show=>h(P.Root,{id:'parent',trapped:true},h('button',{id:'parent-button'},'parent'),show&&h(P.Root,{id:'child',trapped:true},h('button',{id:'child-button'},'child')));
    await render(child(false));await render(child(true));assert.equal(document.activeElement.id,'child-button');await render(child(false));await tick();assert.equal(document.activeElement.id,'parent-button');outside.focus();assert.equal(document.activeElement.id,'parent-button');await stop();

    if(variant==='vpm'){
      trigger.focus();await render(child(true));assert.equal(document.activeElement.id,'child-button');outside.focus();assert.equal(document.activeElement.id,'child-button');await stop();assert.equal(document.activeElement,trigger);
      trigger.focus();await render(h(React.StrictMode,null,scope({trapped:true})));await stop();assert.equal(document.activeElement,trigger);
      let releases=0;const ref=node=>node?()=>releases++:undefined;await render(scope({ref}));await stop();assert.equal(releases,1);
    }
    await React.act(()=>root.unmount());root=null;
    host.innerHTML=server.renderToString(scope({onMountAutoFocus:e=>e.preventDefault()}));const before=host.firstChild,errors=[];
    await React.act(()=>{root=selected('react-dom/client').hydrateRoot(host,scope({onMountAutoFocus:e=>e.preventDefault()}),{onRecoverableError:e=>errors.push(e)});});
    assert.equal(host.firstChild,before);assert.deepEqual(errors,[]);
    console.log(variant,version,'autofocus, trap/loop, cancellation, restoration, branches, nesting, refs and hydration pass');
  }finally{if(root)await React.act(()=>root.unmount());await tick();dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
