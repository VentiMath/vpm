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
const native=typeof React.useEffectEvent==='function';
if(variant==='vpm'&&native)assert.equal(api.useEffectEvent,React.useEffectEvent);
// Evaluate unchanged caller files with explicit import routing on both runtimes.
// Bun does not apply Node's private Module._load hook to every CJS import.
const modules=new Map();let intercepted=0,callerEvents=0;
function evaluate(file){
 if(modules.has(file))return modules.get(file).exports;
 const module={exports:{}},local=createRequire(file);modules.set(file,module);
 function routed(name){
  if(name==='@radix-ui/react-use-effect-event'){intercepted++;return {useEffectEvent(...args){callerEvents++;return api.useEffectEvent(...args);}};}
  if(name==='react'||name.startsWith('react/')||name==='react-dom'||name.startsWith('react-dom/'))return selected(name);
  const resolved=local.resolve(name);return resolved.includes('/node_modules/')&&/\.c?js$/.test(resolved)?evaluate(resolved):local(name);
 }
 new Function('require','module','exports','__filename','__dirname',fs.readFileSync(file,'utf8'))(routed,module,module.exports,file,path.dirname(file));
 return module.exports;
}
if(mode==='server'){
 const {renderToString}=selected('react-dom/server');
 function Child(){api.useEffectEvent(()=>42);return h('b',null,'child');}
 assert.equal(renderToString(h(Child)),'<b>child</b>');
 console.log(variant,version,': server contract matches React');
}else{
 const {createRoot}=selected('react-dom/client'),{act}=React,root=createRoot(document.getElementById('root'));
 let event,layoutValue,initialError;
 function Child({callback,renderCall=false,suspend=false}){
  const current=api.useEffectEvent(callback);event=current;
  if(renderCall){try{current()}catch(error){initialError=error;}}
  React.useLayoutEffect(()=>{layoutValue=current(3);});
  if(suspend)throw new Promise(()=>{});
  return h('b',null,'ready');
 }
 const mount=tree=>act(()=>root.render(tree));
 (async()=>{try{
  await mount(h(React.StrictMode,null,h(Child,{callback:n=>n+1,renderCall:true})));
  assert.match(initialError.message,/render/);assert.equal(layoutValue,4);
  const retained=event;assert.equal(retained(4),5);
  await mount(h(React.StrictMode,null,h(Child,{callback:n=>n*2})));
  assert.equal(retained(4),8);assert.equal(layoutValue,6);if(!native)assert.equal(event,retained);
  await mount(null);
  await mount(h(React.Suspense,{fallback:h('i',null,'pending')},h(Child,{callback:n=>n+10})));
  const committed=event;
  await act(()=>React.startTransition(()=>root.render(h(React.Suspense,{fallback:h('i',null,'pending')},h(Child,{callback:n=>n+100,suspend:true})))));
  assert.equal(committed(2),12,'abandoned render must not publish its callback');
  await mount(h(React.Suspense,{fallback:null},h(Child,{callback:n=>n+20})));assert.equal(committed(2),22);
  const error=new Error('callback'),promise=Promise.resolve('value');
  await mount(h(Child,{callback:(...args)=>args}));assert.deepEqual(event(1,'two',null),[1,'two',null]);
  await mount(h(Child,{callback:()=>promise}));assert.equal(event(),promise);
  // Avoid the layout observation when deliberately throwing or omitting callback.
  function Plain({callback}){event=api.useEffectEvent(callback);return null;}
  await mount(h(Plain,{callback:()=>{throw error}}));assert.throws(()=>event(),value=>value===error);
  await mount(h(Plain));if(native)assert.throws(()=>event(),TypeError);else assert.equal(event(),undefined);
  await mount(null);
  const {useControllableStateReducer}=evaluate(require.resolve('@radix-ui/react-use-controllable-state'));let dispatch;const changes=[];
  function Counter({onChange}){const [state,send]=useControllableStateReducer((s,a)=>({state:s.state+a.amount}),{defaultProp:0,onChange,caller:"fixture"},{});dispatch=send;return h('b',null,state.state);}
  await mount(h(Counter,{onChange:n=>changes.push(['first',n])}));await act(()=>dispatch({type:"add",amount:1}));
  await mount(h(Counter,{onChange:n=>changes.push(['latest',n])}));await act(()=>dispatch({type:"add",amount:2}));
  assert.deepEqual(changes,[['first',1],['latest',3]]);await mount(null);
  const Menu=evaluate(require.resolve('@radix-ui/react-dropdown-menu')),opens=[];
  function Dropdown({label}){return h(Menu.Root,{defaultOpen:true,onOpenChange:open=>opens.push([label,open])},h(Menu.Trigger,null,'Open'),h(Menu.Portal,null,h(Menu.Content,null,h(Menu.Item,null,'First'),h(Menu.Item,null,'Second'))));}
  await mount(h(Dropdown,{label:'old'}));await act(()=>new Promise(r=>setTimeout(r,20)));
  await mount(h(Dropdown,{label:'current'}));let menu=document.querySelector('[role="menu"]');assert(menu);
  await act(()=>menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.deepEqual(opens,[['current',false]]);assert(!document.querySelector('[role="menu"]'));
  await mount(null);await mount(h(Dropdown,{label:'outside'}));await act(()=>new Promise(r=>setTimeout(r,20)));
  await act(()=>document.body.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,button:0})));
  assert.deepEqual(opens,[['current',false],['outside',false]]);assert(!document.querySelector('[role="menu"]'));assert(intercepted>=1);assert(callerEvents>0);
  console.log(variant,version,': commit lifetime, abandoned render, StrictMode, return/errors, reducer and actual Dropdown escape/outside callers pass');
 }finally{await act(()=>root.unmount());dom.window.close();}})().catch(error=>{console.error(error);process.exitCode=1});
}
