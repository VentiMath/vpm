'use strict';
const assert=require('node:assert/strict');const variant=process.argv[2],version=process.argv[3],mode=process.argv[4];
(async()=>{let dom;if(mode==='client'){
 dom=new(require('jsdom').JSDOM)('<!doctype html><div id="root"></div>',{pretendToBeVisual:true});for(const key of ['window','document','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
 // CSSOM computed styles are live in browsers; jsdom's snapshots are not.
 const style=node=>new Proxy({}, {get:(_,key)=>node.style[key]||({animationName:'none',animationDuration:'0s',animationIterationCount:'1',animationDelay:'0s',display:'block'}[key])});
 dom.window.getComputedStyle=globalThis.getComputedStyle=style;globalThis.CSS={escape:s=>s.replace(/[^\w-]/g,c=>'\\'+c)};globalThis.IS_REACT_ACT_ENVIRONMENT=true;
}
const {api:P,React,selected}=require('./load.cjs')(variant,version),h=React.createElement;
assert.equal(P.Root,P.Presence);
const server=selected('react-dom/server'),tree=(present,opts={})=>h(P.Presence,{present},h(opts.tag||'div',{id:'item',ref:opts.ref,style:{animationName:present?'enter':opts.name||'exit',animationDuration:'1s',...opts.style}},h('span',{id:'descendant'})));
assert.equal(server.renderToString(h(P.Presence,{present:false},h('div'))),'');assert(server.renderToString(tree(true)).includes('id="item"'));assert(server.renderToString(h(P.Presence,{present:false},({present})=>h('i',null,String(present)))).includes('false'));
if(mode==='server'){console.log(variant,version,'server aliases/present/forceMount pass');return;}
const host=document.getElementById('root');let root=selected('react-dom/client').createRoot(host);const render=x=>React.act(()=>root.render(x));const item=()=>host.querySelector('#item');
const event=async(node,name,type='animationend',pseudoElement='')=>{await React.act(()=>{const e=new dom.window.Event(type,{bubbles:true});Object.defineProperties(e,{animationName:{value:name},pseudoElement:{value:pseudoElement}});node.dispatchEvent(e);});};
try{
 await render(tree(true));const first=item();await render(tree(false));assert.equal(item(),first);await event(first.firstChild,'exit');assert.equal(item(),first);await event(first,'other');assert.equal(item(),first);await event(first,'exit');assert.equal(item(),null);
 await render(tree(true));await render(tree(false));await render(tree(true));const reopened=item();await event(reopened,'exit');assert.equal(item(),reopened);
 await render(null);await render(tree(true));await render(tree(false,{style:{display:'none'}}));assert.equal(item(),null);
 await render(null);await render(tree(true,{style:{animationName:'same'}}));await render(tree(false,{style:{animationName:'same'}}));assert.equal(item(),null);
 await render(null);await render(tree(true));await render(tree(false));const prefix=item();await event(prefix,'ex');assert.equal(!!item(),variant==='vpm','exact names, not substrings');if(item())await event(item(),'exit');
 await render(null);await render(tree(true));await render(tree(false,{name:'short, long'}));const multi=item();await event(multi,'short');assert.equal(!!item(),variant==='vpm','all exits finish');if(item())await event(item(),'long','animationcancel');assert.equal(item(),null);
 await render(null);await render(tree(true));await render(tree(false));const pseudo=item();await event(pseudo,'exit','animationend','::before');assert.equal(!!item(),variant==='vpm','pseudo event ownership');if(item())await event(item(),'exit');
 const a=React.createRef(),b=React.createRef();await render(tree(true,{ref:a}));const saved=item();await render(tree(true,{ref:b}));assert.equal(item(),saved);assert.equal(a.current,variant==='vpm'?null:saved);assert.equal(b.current,variant==='vpm'?saved:null);await render(null);
 let cleaned=0;const ref=()=>()=>cleaned++;await render(tree(true,{ref}));await render(null);assert.equal(cleaned,1);
 if(variant==='vpm'){
  // Native identities settle together and stale promise completions cannot hide
  // a reopened element. Effects on descendants/pseudo-elements are excluded.
  await render(tree(true));let resolve1,resolve2;const native=item();const make=resolve=>{const a={animationName:'exit',playState:'running',effect:{target:native,getComputedTiming:()=>({endTime:100})}};a.finished=new Promise(resolve).then(()=>{a.playState='finished';});return a;};
  const one=make(r=>resolve1=r),two=make(r=>resolve2=r);native.getAnimations=()=>[one,two];await render(tree(false));await React.act(async()=>resolve1());assert.equal(item(),native);await render(tree(true));await React.act(async()=>resolve2());assert.equal(item(),native);
  let finish;const last=make(r=>finish=r);native.getAnimations=()=>[last,{...last,effect:{target:native,pseudoElement:'::before',getComputedTiming:()=>({endTime:100})},finished:new Promise(()=>{})},{...last,effect:{target:native,getComputedTiming:()=>({endTime:Infinity})},finished:new Promise(()=>{})}];await render(tree(false));await React.act(async()=>finish());assert.equal(item(),null);
  for(const [name,eventName]of [['none, exit','exit'],['"a,b"','a,b'],['escaped\\,name','escaped,name'],['\\65 xit','exit']]){await render(tree(true));await render(tree(false,{name,style:{animationDuration:name.startsWith('none')?'0s, 1s':'1s'}}));assert(item(),name);await event(item(),eventName);assert.equal(item(),null,name);}
  await render(tree(true));await render(tree(false,{style:{animationDuration:'0s'}}));assert.equal(item(),null);
  await render(tree(true));await render(tree(false,{style:{animationIterationCount:'infinite'}}));assert.equal(item(),null);
  const forced=present=>h(P.Presence,{present},state=>h('div',{id:'item','data-kept':String(state.present),style:{animationName:present?'enter':'exit',animationDuration:'1s'}}));await render(forced(true));await render(forced(false));await event(item(),'exit');assert.equal(item().dataset.kept,'false');assert.equal(item().style.animationFillMode,'');await render(null);
 }
 await React.act(()=>root.unmount());host.innerHTML=server.renderToString(tree(true));const before=item(),errors=[];await React.act(()=>{root=selected('react-dom/client').hydrateRoot(host,tree(true),{onRecoverableError:e=>errors.push(e)});});assert.equal(item(),before);assert.deepEqual(errors,[]);
 console.log(variant,version,'CSS event contracts, paired ownership/completion/ref fixes, native identities, forceMount, hydration and cleanup pass');
}finally{await React.act(()=>root.unmount());dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
