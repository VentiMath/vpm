'use strict';
const assert=require('node:assert/strict'),variant=process.argv[2],environment=process.argv[3];
let dom;
if(environment==='client'){
 const {JSDOM}=require('jsdom');dom=new JSDOM('<!doctype html><body></body>');
 for(const name of ['window','document','navigator','HTMLElement','Node','CustomEvent'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
}
const React=require('react'),h=React.createElement,{renderToString}=require('react-dom/server');
const {DirectionProvider,Provider,useDirection}=require('./direction-load.cjs')(variant);
assert.equal(Provider,DirectionProvider);
function Read({local}){return h('output',null,useDirection(local));}
function Tree({dir='rtl'}){return h(React.Fragment,null,h(Read),h(Provider,{dir},h(Read),h(Read,{local:'ltr'}),h(Provider,{dir:'ltr'},h(Read))),h(Read));}
assert.equal(renderToString(h(Tree)),'<output>ltr</output><output>rtl</output><output>ltr</output><output>ltr</output><output>ltr</output>');
if(environment==='client'){
 const {render,cleanup,act,fireEvent}=require('@testing-library/react');
 (async()=>{try{
  const view=render(h(React.StrictMode,null,h(Tree)));assert.equal(view.container.textContent,'ltrrtlltrltrltr');
  view.rerender(h(React.StrictMode,null,h(Tree,{dir:'ltr'})));assert.equal(view.container.textContent,'ltrltrltrltrltr');view.unmount();
  const container=document.createElement('div');container.innerHTML=renderToString(h(Tree));document.body.append(container);
  const errors=[],hydrated=render(h(Tree),{container,hydrate:true,onRecoverableError:e=>errors.push(e)});assert.equal(container.textContent,'ltrrtlltrltrltr');assert.deepEqual(errors,[]);hydrated.unmount();container.remove();
  // Load unchanged Radix callers, replacing only their direction import.
  const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),cache=new Map();let reached=0;
  function evaluate(file){if(cache.has(file))return cache.get(file).exports;const local=createRequire(file),mod={exports:{}};cache.set(file,mod);
   new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>{if(name==='@radix-ui/react-direction'){reached++;return {DirectionProvider,Provider,useDirection};}const resolved=local.resolve(name);return resolved.includes('/@radix-ui/')&&resolved.endsWith('.js')?evaluate(resolved):local(name);},mod,mod.exports);return mod.exports;
  }
  const Group=evaluate(require.resolve('@radix-ui/react-roving-focus'));
  function Buttons({dir,local}){return h(Provider,{dir},h(Group.Root,{orientation:'horizontal',loop:true,dir:local},...['One','Two','Three'].map(name=>h(Group.Item,{key:name,asChild:true,focusable:true},h('button',null,name)))));}
  const controls=render(h(Buttons,{dir:'ltr'}));let first=controls.getByText('One');act(()=>first.focus());fireEvent.keyDown(first,{key:'ArrowRight'});await act(()=>new Promise(r=>setTimeout(r,10)));assert.equal(document.activeElement.textContent,'Two');
  controls.rerender(h(Buttons,{dir:'rtl'}));first=controls.getByText('One');act(()=>first.focus());fireEvent.keyDown(first,{key:'ArrowRight'});await act(()=>new Promise(r=>setTimeout(r,10)));assert.equal(document.activeElement.textContent,'Three');
  controls.rerender(h(Buttons,{dir:'rtl',local:'ltr'}));first=controls.getByText('One');act(()=>first.focus());fireEvent.keyDown(first,{key:'ArrowRight'});await act(()=>new Promise(r=>setTimeout(r,10)));assert.equal(document.activeElement.textContent,'Two');assert(reached>0);controls.unmount();
  console.log(variant+': direction inheritance, updates, hydration and unchanged RovingFocus keyboard behavior pass');
 }finally{cleanup();dom.window.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
}else console.log(variant+': server direction nesting, local overrides, default and isolation pass');
