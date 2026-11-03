'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const [variant,version,mode='client']=process.argv.slice(2);
let dom;
if(mode==='client'){
 const {JSDOM}=require('jsdom');dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{pretendToBeVisual:true});
 for(const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','CustomEvent','getComputedStyle','HTMLInputElement','Event','KeyboardEvent','MouseEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
}
const {api,React,selected}=require('./load.cjs')(variant,version),h=React.createElement;
// Evaluate unchanged caller files with explicit import routing on both runtimes.
// Bun does not apply Node's private Module._load hook to every CJS import.
const modules=new Map();let intercepted=0,callerEvents=0;
function evaluate(file){
 if(modules.has(file))return modules.get(file).exports;
 const module={exports:{}},local=createRequire(file);modules.set(file,module);
 function routed(name){
  if(name==='@radix-ui/react-id'){intercepted++;return {useId(...args){callerEvents++;return api.useId(...args);}};}
  if(name==='react'||name.startsWith('react/')||name==='react-dom'||name.startsWith('react-dom/'))return selected(name);
  const resolved=local.resolve(name);return resolved.includes('/node_modules/')&&/\.c?js$/.test(resolved)?evaluate(resolved):local(name);
 }
 new Function('require','module','exports','__filename','__dirname',fs.readFileSync(file,'utf8'))(routed,module,module.exports,file,path.dirname(file));
 return module.exports;
}
function Pair({override}){const id=api.useId(override),second=api.useId();return h('div',null,h('label',{htmlFor:id},'Name'),h('input',{id}),h('span',{id:second},'other'));}
if(mode==='server'){
 const {renderToString}=selected('react-dom/server');
 for(const override of [undefined,'','fixed','0','with spaces & <quotes>']){
  const actual=renderToString(h(Pair,{override}),{identifierPrefix:'fixture-'});
  function Control(){const id=React.useId(),other=React.useId();return h('div',null,h('label',{htmlFor:override||'radix-'+id},'Name'),h('input',{id:override||'radix-'+id}),h('span',{id:'radix-'+other},'other'));}
  assert.equal(actual,renderToString(h(Control),{identifierPrefix:'fixture-'}));
 }
 console.log(variant,version,': exact native SSR prefix, escaping and override contract pass');
}else{
 const {createRoot,hydrateRoot}=selected('react-dom/client'),{renderToString}=selected('react-dom/server'),{act}=React;
 const container=document.getElementById('root'),root=createRoot(container,{identifierPrefix:'client-'});let hydrated;
 const mount=tree=>act(()=>root.render(tree));
 (async()=>{try{
  await mount(h(React.StrictMode,null,h(Pair)));const initial=container.querySelector('input').id;assert.match(initial,/^radix-.*client-/);
  const ids=[...container.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,2);
  assert.equal(container.querySelector('label').htmlFor,initial);
  for(const override of ['fixed',undefined,'','second',undefined]){await mount(h(React.StrictMode,null,h(Pair,{override})));assert.equal(container.querySelector('input').id,override||initial);}
  await mount(null);await mount(h(Pair));assert.notEqual(container.querySelector('input').id,initial);
  // Independent roots and server markup stay distinct when using React prefixes.
  const second=document.createElement('div');document.body.append(second);const errors=[];
  const tree=h(React.StrictMode,null,h(Pair));second.innerHTML=renderToString(tree,{identifierPrefix:'hydrated-'});const markup=second.innerHTML;
  await act(()=>{hydrated=hydrateRoot(second,tree,{identifierPrefix:'hydrated-',onRecoverableError:e=>errors.push(e)});});
  assert.deepEqual(errors,[]);assert.equal(second.innerHTML,markup);assert.notEqual(second.querySelector('input').id,container.querySelector('input').id);
  await act(()=>hydrated.unmount());hydrated=null;second.remove();
  // The current real caller must preserve trigger/content accessibility links.
  const Menu=evaluate(require.resolve('@radix-ui/react-dropdown-menu')),changes=[];
  function Dropdown(){return h(Menu.Root,{defaultOpen:true,onOpenChange:x=>changes.push(x)},h(Menu.Trigger,null,'Open'),h(Menu.Portal,null,h(Menu.Content,null,h(Menu.Item,null,'First'))));}
  await mount(h(Dropdown));await act(()=>new Promise(r=>setTimeout(r,20)));
  const trigger=container.querySelector('button'),menu=document.querySelector('[role="menu"]');assert(menu);assert.equal(trigger.getAttribute('aria-controls'),menu.id);assert.equal(menu.getAttribute('aria-labelledby'),trigger.id);
  const triggerId=trigger.id,menuId=menu.id;await mount(h(Dropdown));assert.equal(trigger.id,triggerId);assert.equal(menu.id,menuId);
  await act(()=>menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.deepEqual(changes,[false]);assert(!document.querySelector('[role="menu"]'));assert(intercepted>0&&callerEvents>0);
  console.log(variant,version,': stable IDs, overrides, StrictMode, roots, hydration and actual Dropdown aria/dismissal pass');
 }finally{await act(()=>{root.unmount();hydrated?.unmount();});dom.window.close();}})().catch(error=>{console.error(error);process.exitCode=1});
}
