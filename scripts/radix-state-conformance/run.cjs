'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const [variant='vpm',version='19.1']=process.argv.slice(2),{JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{pretendToBeVisual:true});
for(const key of ['window','document','navigator','HTMLElement','Element','Node','MutationObserver','CustomEvent','getComputedStyle','HTMLInputElement','Event','KeyboardEvent','MouseEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {api,React,selected}=require('./load.cjs')(variant,version),h=React.createElement,{act}=React;
const root=selected('react-dom/client').createRoot(document.getElementById('root')),changes=[];let tuple,rendering=false;
const mount=tree=>act(()=>root.render(h(React.StrictMode,null,tree)));
function State(props){rendering=true;tuple=api.useControllableState(props);rendering=false;return h('span',null,String(tuple[0]));}
function Reduced(props){rendering=true;tuple=api.useControllableStateReducer((s,a)=>({...s,state:s.state+a.amount,count:s.count+1}),props,{count:0});rendering=false;if(props.suspend&&tuple[0].count>0)throw props.suspend;return h('span',null,String(tuple[0].state));}
const callback=x=>{assert(!rendering,'callback ran while rendering');changes.push(x);};
(async()=>{try{
 await mount(h(State,{defaultProp:1,onChange:callback}));assert.deepEqual(changes,[]);const setter=tuple[1];
 await act(()=>{setter(x=>x+1);setter(x=>x+1);});assert.equal(tuple[0],3);assert.deepEqual(changes,[3]);
 await mount(h(State,{defaultProp:90,onChange:x=>changes.push(x*10)}));assert.equal(tuple[0],3);await act(()=>setter(4));assert.deepEqual(changes,[3,40]);
 await mount(null);changes.length=0;
 await mount(h(State,{prop:2,defaultProp:0,onChange:callback}));const old=tuple[1];await act(()=>old(x=>x+1));assert.equal(tuple[0],2);assert.deepEqual(changes,[3]);
 await mount(h(State,{prop:8,defaultProp:0,onChange:callback}));await act(()=>tuple[1](8));assert.deepEqual(changes,[3]);
 if(variant==='vpm'){assert.equal(tuple[1],old);await act(()=>old(x=>x+1));assert.deepEqual(changes,[3,9]);}
 await mount(null);changes.length=0;
 await mount(h(Reduced,{defaultProp:0,onChange:callback}));const dispatch=tuple[1];await act(()=>{dispatch({type:'add',amount:1});dispatch({type:'add',amount:2});});assert.deepEqual(tuple[0],{state:3,count:2});assert.deepEqual(changes,[3]);assert.equal(tuple[1],dispatch);
 await mount(null);changes.length=0;
 // Upstream calls an Effect Event from its reducer: React 19.2 rejects it;
 // React 19.1 StrictMode invokes it repeatedly. VPM only publishes commits.
 let calls=0,error;
 function Parent(){const [value,setValue]=React.useState(0);return h(Reduced,{prop:value,defaultProp:0,onChange:x=>{calls++;setValue(x);}});}
 const errors=[],original=console.error;console.error=(...args)=>errors.push(args);
 try{await mount(h(Parent));await act(()=>{tuple[1]({type:'add',amount:1});tuple[1]({type:'add',amount:2});});}catch(e){error=e;}finally{console.error=original;rendering=false;}
 if(variant==='vpm'){assert.ifError(error);assert.equal(calls,2);assert.deepEqual(tuple[0],{state:3,count:2});assert.equal(errors.length,0);}
 else if(version==='19.2'){assert(error);assert.match(error.message,/render/);}
 else {assert(calls>2,'upstream duplicate notification control must reproduce');}
 await mount(null);changes.length=0;
 if(variant==='vpm'){
  await mount(h(State,{defaultProp:NaN,onChange:callback}));await act(()=>tuple[1](NaN));assert.deepEqual(changes,[]);await act(()=>tuple[1](-0));await act(()=>tuple[1](0));assert.equal(changes.length,2);assert(Object.is(changes[0],-0));
  await mount(null);changes.length=0;
  // A suspended update can be abandoned without delivering its proposal.
  const never=new Promise(()=>{});
  function Suspended(){return h(Reduced,{prop:0,defaultProp:0,onChange:callback,suspend:never});}
  await mount(h(React.Suspense,{fallback:'wait'},h(Suspended)));
  await act(()=>React.startTransition(()=>tuple[1]({type:'add',amount:7})));assert.deepEqual(changes,[]);await mount(null);assert.deepEqual(changes,[]);
  // Missing callback is legal with native Effect Events too.
  await mount(h(Reduced,{prop:0,defaultProp:0}));await act(()=>tuple[1]({type:'add',amount:1}));assert.equal(tuple[0].state,0);await mount(null);
  let input;function Initialized(){tuple=api.useControllableStateReducer((s)=>s,{defaultProp:4},{seed:7},s=>{input=s;return {...s,count:s.seed};});return null;}
  await mount(h(Initialized));assert.deepEqual(input,{seed:7,state:4});assert.equal(tuple[0].count,7);await mount(null);
 }
 // Unchanged current Dropdown Menu graph, substituting only this package.
 const modules=new Map();let routedCount=0;
 function evaluate(file){if(modules.has(file))return modules.get(file).exports;const module={exports:{}},local=createRequire(file);modules.set(file,module);
  new Function('require','module','exports','__filename','__dirname',fs.readFileSync(file,'utf8'))(name=>{
   if(name==='@radix-ui/react-use-controllable-state'){routedCount++;return api;}
   if(name==='react'||name.startsWith('react/')||name==='react-dom'||name.startsWith('react-dom/'))return selected(name);
   const resolved=local.resolve(name);return resolved.includes('/node_modules/')&&/\.c?js$/.test(resolved)?evaluate(resolved):local(name);
  },module,module.exports,file,path.dirname(file));return module.exports;}
 const Menu=evaluate(require.resolve('@radix-ui/react-dropdown-menu'));
 for(const controlled of [false,true]){
  changes.length=0;function Dropdown(){const [open,setOpen]=React.useState(true);return h(Menu.Root,{...(controlled?{open}:{defaultOpen:true}),onOpenChange:x=>{changes.push(x);setOpen(x);}},h(Menu.Trigger,null,'Open'),h(Menu.Portal,null,h(Menu.Content,null,h(Menu.Item,null,'First'))));}
  await mount(h(Dropdown));await act(()=>new Promise(r=>setTimeout(r,20)));const menu=document.querySelector('[role="menu"]');assert(menu);
  await act(()=>menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.deepEqual(changes,[false]);assert(!document.querySelector('[role="menu"]'));await mount(null);
 }
 assert(routedCount>0);
 const {renderToString}=selected('react-dom/server');assert.match(renderToString(h(State,{defaultProp:5,onChange:()=>{throw Error('SSR notified');}})),/>5</);
 console.log(variant,version,'state, batching, callbacks, reducer, StrictMode, SSR and real Dropdown controls pass');
}finally{await act(()=>root.unmount());dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1});
