'use strict';
const assert=require('node:assert/strict'),variant=process.argv[2],mode=process.argv[3]||'client',React=require('react'),h=React.createElement;
const api=require('./load.cjs')(variant),{FocusGuards,Root,useFocusGuards}=api;
assert.equal(FocusGuards,Root);
if(mode==='server'){
 const {renderToString}=require('react-dom/server');assert.equal(renderToString(h(Root,null,h('b',null,'child'))),'<b>child</b>');console.log(variant+': server render has no DOM access');
}else{
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<!doctype html><body></body>',{pretendToBeVisual:true});
 function select(document){for(const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','CustomEvent','getComputedStyle','HTMLInputElement'])Object.defineProperty(globalThis,key,{value:key==='document'?document:document.defaultView[key],configurable:true});}
 select(dom.window.document);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const {render,cleanup,act,fireEvent}=require('@testing-library/react');const nodes=body=>[...body.querySelectorAll('[data-radix-focus-guard]')];
 function Hook(){useFocusGuards();return h('button',null,'hook');}
 function check(body){const pair=nodes(body);assert.equal(pair.length,2);assert.equal(body.firstElementChild,pair[0]);assert.equal(body.lastElementChild,pair[1]);for(const node of pair){assert.equal(node.tabIndex,0);assert.equal(node.style.opacity,'0');assert.equal(node.style.pointerEvents,'none');assert.equal(node.style.position,'fixed');}return pair;}
 (async()=>{try{
  const first=render(h(React.StrictMode,null,h(Root,null,h('button',null,'first'))));const pair=check(document.body);
  const second=render(h(Hook));assert.deepEqual(check(document.body),pair);first.unmount();assert.deepEqual(check(document.body),pair);second.unmount();assert.equal(nodes(document.body).length,0);
  const foreign=document.createElement('span');foreign.setAttribute('data-radix-focus-guard','foreign');document.body.append(foreign);const owned=render(h(Hook));assert.equal(nodes(document.body).length,3);owned.unmount();assert(foreign.isConnected);foreign.remove();
  // Simultaneously mounted document bodies must not move each other's guards.
  const other=new JSDOM('<!doctype html><body></body>'),left=render(h(Hook));const leftBody=document.body;
  select(other.window.document);const right=render(h(Hook));
  if(variant==='upstream'){assert.equal(nodes(leftBody).length,0,'current upstream moves its global pair');assert.equal(nodes(document.body).length,2);}
  else{check(leftBody);check(document.body);}
  right.unmount();if(variant==='vpm'){assert.equal(nodes(other.window.document.body).length,0);check(leftBody);}
  select(dom.window.document);left.unmount();other.window.close();assert.equal(nodes(document.body).length,0);
  // Keep a previous body's cleanup isolated when document.body is replaced.
  if(variant==='vpm'){const oldBody=document.body,old=render(h(Hook));const newBody=document.createElement('body');oldBody.replaceWith(newBody);const fresh=render(h(Hook));check(newBody);old.unmount();check(newBody);fresh.unmount();assert.equal(nodes(newBody).length,0);}
  // Exercise unmodified current Menu with only its guard import substituted.
  const fs=require('node:fs'),{createRequire}=require('node:module'),cache=new Map();let intercepted=0;
  function evaluate(file){if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const local=createRequire(file);new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>{if(name==='@radix-ui/react-focus-guards'){intercepted++;return api;}const resolved=local.resolve(name);return resolved.includes('/@radix-ui/')&&resolved.endsWith('.js')?evaluate(resolved):local(name);},module,module.exports);return module.exports;}
  const Menu=evaluate(require.resolve('@radix-ui/react-menu')),changes=[];
  const view=render(h(Menu.Root,{open:true,onOpenChange:value=>changes.push(value)},h(Menu.Anchor,{asChild:true},h('button',null,'anchor')),h(Menu.Portal,null,h(Menu.Content,{'aria-label':'fixture'},h(Menu.Item,null,'First'),h(Menu.Item,null,'Second')))));
  await act(()=>new Promise(r=>setTimeout(r,20)));check(document.body);assert(intercepted>0);const menu=document.querySelector('[role="menu"]');assert(menu);fireEvent.keyDown(menu,{key:'Escape'});assert.deepEqual(changes,[false]);view.unmount();assert.equal(nodes(document.body).length,0);
  console.log(variant+': shared lifetime, StrictMode, foreign nodes, document ownership and unchanged current Menu pass');
 }finally{cleanup();dom.window.close();}})().catch(error=>{console.error(error);process.exitCode=1});
}
