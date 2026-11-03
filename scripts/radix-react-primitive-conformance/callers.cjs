'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body></body>',{pretendToBeVisual:true,url:'https://fixture.invalid'});
for(const key of ['window','document','navigator','HTMLElement','Node','MutationObserver'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{render,cleanup,fireEvent,act}=require('@testing-library/react'),h=React.createElement;
const variant=process.argv.includes('--upstream')?'upstream':'vpm',api=require('./load.cjs')(variant);
const file=require.resolve('@radix-ui/react-toggle'),local=createRequire(file),mod={exports:{}};let intercepted=0;
new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>{if(name==='@radix-ui/react-primitive'){intercepted++;return api}return local(name)},mod,mod.exports);
const {Toggle}=mod.exports;
try {
  for(const [tag,Component] of Object.entries(api.Primitive)) {
    const ref=React.createRef(),content=['input','img'].includes(tag)?undefined:tag==='select'?h('option',{value:'one'},'One'):tag==='svg'?h('path',{d:'M0 0L1 1'}):'Text';
    const native=render(h(Component,{ref,'data-tag':tag},content)),node=native.container.firstElementChild;
    assert.equal(ref.current,node);assert.equal(node.localName,tag);assert.equal(node.dataset.tag,tag);
    if(tag==='svg')assert(node instanceof window.SVGSVGElement);
    native.unmount();assert.equal(ref.current,null);
    const inner=React.createRef(),slotted=render(h(Component,{asChild:true,ref},h('button',{ref:inner},'slot')));
    assert.equal(ref.current,slotted.getByRole('button'));assert.equal(ref.current,inner.current);slotted.unmount();assert.equal(ref.current,null);assert.equal(inner.current,null);
  }
  for(const asChild of [false,true]) {
    const events=[],object=React.createRef(),child=node=>{events.push(node?'attach':'null');if(node)return()=>events.push('cleanup')};
    const tree=label=>h(React.StrictMode,null,h(api.Primitive.button,{ref:asChild?object:child,asChild,'data-owner':'primitive'},asChild?h('button',{ref:child},label):label));
    const view=render(tree('first')),node=view.getByRole('button');assert.equal(node.dataset.owner,'primitive');assert(!node.hasAttribute('asChild'));assert.deepEqual(events,['attach','cleanup','attach']);
    if(asChild)assert.equal(object.current,node);
    view.rerender(tree('second'));assert.equal(view.getByRole('button'),node);assert.deepEqual(events,['attach','cleanup','attach']);assert.equal(node.textContent,'second');
    view.unmount();assert.deepEqual(events,['attach','cleanup','attach','cleanup']);assert.equal(object.current,null);
  }
  assert.equal(window[Symbol.for('radix-ui')],true);
  for(const asChild of [false,true]) {
    const changes=[],ref=React.createRef();const view=render(h(Toggle,{asChild,ref,onPressedChange:x=>changes.push(x)},asChild?h('button',null,'Toggle'):'Toggle'));
    const button=view.getByRole('button');assert.equal(ref.current,button);assert.equal(button.getAttribute('aria-pressed'),'false');
    fireEvent.click(button);assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(button.dataset.state,'on');assert.deepEqual(changes,[true]);
    fireEvent.click(button);assert.deepEqual(changes,[true,false]);view.unmount();assert.equal(ref.current,null);
  }
  const controlled=[],view=render(h(Toggle,{pressed:false,onPressedChange:x=>controlled.push(x)},'controlled'));
  fireEvent.click(view.getByRole('button'));assert.deepEqual(controlled,[true]);assert.equal(view.getByRole('button').getAttribute('aria-pressed'),'false');view.rerender(h(Toggle,{pressed:true,disabled:true},'controlled'));fireEvent.click(view.getByRole('button'));assert.equal(view.getByRole('button').dataset.state,'on');view.unmount();
  const blocked=[],prevented=render(h(Toggle,{asChild:true,onPressedChange:x=>blocked.push(x)},h('button',{onClick:e=>e.preventDefault()},'prevented')));fireEvent.click(prevented.getByRole('button'));assert.deepEqual(blocked,[]);prevented.unmount();
  const target=document.createElement('div');let update;
  function Counter(){const [value,set]=React.useState(0);update=set;return h('output',null,value)}
  const counter=render(h(Counter));target.addEventListener('tick',()=>update(value=>value+1));
  act(()=>{target.dispatchEvent(new window.CustomEvent('tick'));assert.equal(counter.container.textContent,'0');});assert.equal(counter.container.textContent,'1');
  act(()=>{assert.equal(api.dispatchDiscreteCustomEvent(target,new window.CustomEvent('tick')),undefined);assert.equal(counter.container.textContent,'2');});counter.unmount();
  const container=document.createElement('div');const tree=h(Toggle,{defaultPressed:true},'hydrate');container.innerHTML=require('react-dom/server').renderToString(tree);document.body.append(container);
  const hydrated=render(tree,{container,hydrate:true});assert.equal(hydrated.getByRole('button').dataset.state,'on');fireEvent.click(hydrated.getByRole('button'));assert.equal(hydrated.getByRole('button').dataset.state,'off');hydrated.unmount();container.remove();
  assert.equal(intercepted,1);console.log(`${variant}: stable native/asChild refs, unchanged Toggle 1.1.10 interactions, prevention, disabled/controlled state, hydration and synchronous custom-event updates pass.`);
}finally{cleanup();dom.window.close()}
