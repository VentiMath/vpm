'use strict';
const assert=require('node:assert/strict');
const [variant='vpm',version='19.1',mode='client']=process.argv.slice(2);let dom;
if(mode==='client'){
 dom=new(require('jsdom').JSDOM)('<div id="root"></div><button id="outside">outside</button>',{pretendToBeVisual:true});
 for(const name of ['window','document','navigator','HTMLElement','Element','Node','CustomEvent','MutationObserver'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
}
const {api:P,React,selected}=require('./load.cjs')(variant,version),h=React.createElement,{act}=React,{renderToString}=selected('react-dom/server');
assert.equal(P.Root,P.RovingFocusGroup);assert.equal(P.Item,P.RovingFocusGroupItem);assert.equal(P.createRovingFocusGroupScope.scopeName,'RovingFocusGroup');
const ids=['a','off','b','c'];
function Tree({order=ids,props={},itemProps={},active,child='button',scope,blocked}={}){
 return h(P.Root,{id:'group',__scopeRovingFocusGroup:scope,...props},order.map(id=>h(P.Item,{key:id,tabStopId:id,asChild:true,focusable:id!=='off'&&id!==blocked,active:id===active,__scopeRovingFocusGroup:scope,...itemProps},h(child,{id},id))));
}
if(mode==='server'){
 assert.equal(typeof window,'undefined');const html=renderToString(h(Tree,{props:{orientation:'vertical',defaultCurrentTabStopId:'b'}}));assert(html.includes('id="group"'));assert(html.includes('data-orientation="vertical"'));assert.equal((html.match(/tabindex="0"/g)||[]).length,1);assert(html.includes('data-radix-collection-item'));
 assert.throws(()=>renderToString(h(P.Item,null,'orphan')));const state=[];renderToString(h(P.Root,{currentTabStopId:'x'},h(P.Item,{tabStopId:'x'},value=>{state.push(value);return 'x';})));assert.deepEqual(state,[{hasTabStop:true,isCurrentTabStop:true}]);console.log(variant,version,'DOM-free SSR, aliases, render-prop state, missing context');
}else(async()=>{
 const roots=[],host=document.getElementById('root');let root=selected('react-dom/client').createRoot(host);roots.push(root);
 const render=tree=>act(()=>root.render(h(React.StrictMode,null,tree))),tick=()=>new Promise(r=>setTimeout(r,8));
 const by=id=>document.getElementById(id),key=(node,key,extra={})=>{const event=new window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra});node.dispatchEvent(event);return event;};
 const press=async(node,k,extra)=>act(async()=>{key(node,k,extra);await tick();});
 const focus=async node=>act(()=>node.focus());
 try{
  await render(h(Tree,{active:'b'}));await focus(by('group'));assert.equal(document.activeElement,by('b'),'active entry');
  await render(h(Tree,{props:{defaultCurrentTabStopId:'c'}}));await focus(by('a'));
  await press(by('a'),'ArrowRight');assert.equal(document.activeElement,by('b'),'disabled skip');
  await press(by('b'),'End');assert.equal(document.activeElement,by('c'));await press(by('c'),'ArrowRight');assert.equal(document.activeElement,by('c'),'edge does not loop');
  await press(by('c'),'Home');assert.equal(document.activeElement,by('a'));await press(by('a'),'PageDown');assert.equal(document.activeElement,by('c'));await press(by('c'),'PageUp');assert.equal(document.activeElement,by('a'));
  for(const dir of ['ltr','rtl'])for(const orientation of ['horizontal','vertical']){
   await render(h(Tree,{props:{dir,orientation,loop:true}}));await focus(by('a'));
   const next=orientation==='vertical'?'ArrowDown':dir==='rtl'?'ArrowLeft':'ArrowRight';await press(by('a'),next);assert.equal(document.activeElement,by('b'));
   await focus(by('c'));await press(by('c'),next);assert.equal(document.activeElement,by('a'),'loop');
   const ignored=orientation==='vertical'?'ArrowLeft':'ArrowDown';let event;await act(()=>{event=key(by('a'),ignored);});assert.equal(event.defaultPrevented,false);assert.equal(document.activeElement,by('a'));
   for(const modifier of ['ctrlKey','metaKey','altKey','shiftKey']){await press(by('a'),next,{[modifier]:true});assert.equal(document.activeElement,by('a'));}
  }
  await render(null);const changed=[];await render(h(Tree,{props:{currentTabStopId:'a',onCurrentTabStopIdChange:x=>changed.push(x)}}));await focus(by('b'));assert.equal(by('a').tabIndex,0);assert.equal(by('b').tabIndex,-1);assert.equal(changed.at(-1),'b');
  await render(h(Tree,{props:{currentTabStopId:'b'}}));assert.equal(by('b').tabIndex,0);await render(null);
  await render(h(Tree,{props:{onEntryFocus:e=>e.preventDefault()}}));await focus(by('outside'));await focus(by('group'));assert.equal(document.activeElement,by('group'),'cancelled entry');
  await render(h(Tree,{itemProps:{onKeyDown:e=>e.preventDefault()}}));await focus(by('a'));await press(by('a'),'End');assert.equal(document.activeElement,by('a'),'consumer cancellation');
  await render(h(Tree,{}));await focus(by('a'));await press(by('a'),'Tab',{shiftKey:true});assert.equal(by('group').tabIndex,-1);await focus(by('outside'));assert.equal(by('group').tabIndex,0);
  const mouse=new window.MouseEvent('mousedown',{bubbles:true,cancelable:true});await act(()=>by('off').dispatchEvent(mouse));assert(mouse.defaultPrevented);
  await render(h(Tree,{order:['c','a','off','b']}));await focus(by('a'));await press(by('a'),'ArrowRight');assert.equal(document.activeElement,by('b'),'live order');
  // A queued action may not override a later focus choice.
  await render(h(Tree,{}));await focus(by('a'));await act(async()=>{key(by('a'),'ArrowRight');by('outside').focus();await tick();});assert.equal(document.activeElement,by(variant==='vpm'?'outside':'b'),'queued focus ownership');
  // Read current registration and connectivity at timer delivery.
  await focus(by('a'));await act(()=>{key(by('a'),'ArrowRight');root.render(h(React.StrictMode,null,h(Tree,{blocked:'b'})));});await act(tick);assert.equal(document.activeElement,by(variant==='vpm'?'c':'b'),'newly disabled next item');
  await render(h(Tree,{props:{currentTabStopId:'off'}}));assert.equal(by('off').tabIndex,variant==='vpm'?-1:0,'nonfocusable current item');
  await render(null);
  const iframe=document.createElement('iframe');document.body.append(iframe);
  try{
   await render(selected('react-dom').createPortal(h(Tree,{order:['a','b','c']}),iframe.contentDocument.body));const doc=iframe.contentDocument;
   await focus(doc.getElementById('a'));await press(doc.getElementById('a'),'ArrowRight');assert.equal(doc.activeElement.id,variant==='vpm'?'b':'c','owner-document focus stop');
  }finally{await render(null);iframe.remove();}
  const ref=React.createRef(),nodeRef=React.createRef(),errors=[];await act(()=>root.unmount());roots.splice(0);
  const tree=h(P.Root,{ref},h(P.Item,{tabStopId:'one',ref:nodeRef},'one'));host.innerHTML=renderToString(tree);const before=host.firstChild;
  await act(()=>{root=selected('react-dom/client').hydrateRoot(host,tree,{onRecoverableError:e=>errors.push(e)});});roots.push(root);assert.equal(ref.current,before);assert.equal(nodeRef.current,before.firstChild);assert.deepEqual(errors,[]);assert.equal(before.tabIndex,0);
  console.log(variant,version,'entry/active, disabled/controlled, keyboard/RTL/looping/modifiers, cancellation, Shift-Tab, reorder, explicit queued/iframe differences, refs and hydration');
 }finally{for(const r of roots)await act(()=>r.unmount());dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
