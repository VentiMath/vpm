'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body></body>',{pretendToBeVisual:true});
for(const name of ['window','document','navigator','HTMLElement','Node','MutationObserver','CustomEvent','getComputedStyle'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);globalThis.cancelAnimationFrame=clearTimeout;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{render,cleanup,fireEvent}=require('@testing-library/react'),{renderToString}=require('react-dom/server'),h=React.createElement;
const variant=process.argv.at(-1),{createContext,createContextScope}=require('./load.cjs')(variant);
try{
 const [Provider,use]=createContext('Root'),[Default,useDefault]=createContext('Default',{n:4});
 assert.equal(Provider.displayName,'RootProvider');
 function Read(){return h('output',null,use('Consumer').n)}
 assert.throws(()=>renderToString(h(Read)),/`Consumer` must be used within `Root`/);
 function Fallback(){return h('output',null,useDefault('D').n)}
 assert.equal(renderToString(h(Fallback)),'<output>4</output>');
 if(variant!=='legacy'){function Optional(){return h('output',null,String(use('O',{optional:true})))}assert.equal(renderToString(h(Optional)),'<output>undefined</output>');}
 const [,useNull]=createContext('Nullable',null);function Null(){assert.equal(useNull('Child'),null);return null;}assert.equal(renderToString(h(Null)),'');
 const view=render(h(Provider,{n:1},h(Read)));assert.equal(view.container.textContent,'1');view.rerender(h(Provider,{n:2},h(Read)));assert.equal(view.container.textContent,'2');view.unmount();
 let records=[],renders=0;const Child=React.memo(function(){renders++;records.push(use('Child'));return null});
 const shape=render(h(Provider,{a:1},h(Child)));shape.rerender(h(Provider,{a:1},h(Child)));assert.equal(renders,1);
 shape.rerender(h(Provider,{b:1},h(Child)));
 assert.deepEqual(Object.keys(records.at(-1)),[variant==='vpm'?'b':'a']); // paired upstream bug reproduction
 shape.unmount();
 if(variant==='vpm'){
   const errors=[],original=console.error;console.error=(...args)=>errors.push(args);
   try{const changing=render(h(Provider,{a:1},h(Child)));changing.rerender(h(Provider,{a:1,b:2},h(Child)));assert.deepEqual(Object.keys(records.at(-1)),['a','b']);changing.rerender(h(Provider,{a:1},h(Child)));assert.deepEqual(Object.keys(records.at(-1)),['a']);changing.unmount();}finally{console.error=original;}assert.deepEqual(errors,[]);
 }
 const [makeA,scopeA]=createContextScope('A'),[A,readA]=makeA('A'),[makeB,scopeB]=createContextScope('B',[scopeA]),[B,readB]=makeB('B');
 if(variant!=='legacy'){function OptionalScoped(){assert.equal(readA('Optional',undefined,{optional:true}),undefined);return null}assert.equal(renderToString(h(OptionalScoped)),'');}
 const useFirst=scopeB(),useSecond=scopeB(),merged=[];
 function Value({scope}){return h('span',null,readA('A',scope).n+':'+readB('B',scope).n)}
 function Scopes({n=1}){const first=useFirst(),second=useSecond();merged.push(first);return h(React.Fragment,null,h(A,{scope:first.__scopeB,n},h(B,{scope:first.__scopeB,n:2},h(Value,{scope:first.__scopeB}))),h(A,{scope:second.__scopeB,n:3},h(B,{scope:second.__scopeB,n:4},h(Value,{scope:second.__scopeB}))));}
 const overrideHook=scopeA();let overridden;function Override(){const own=useFirst(),next=overrideHook(own.__scopeB);overridden=next.__scopeA.A===own.__scopeB.A;return null}const overrideView=render(h(Override));assert.equal(overridden,true);overrideView.unmount();
 const scoped=render(h(Scopes));assert.equal(scoped.container.textContent,'1:23:4');scoped.rerender(h(Scopes,{n:5}));assert.equal(scoped.container.textContent,'5:23:4');assert.equal(merged[0]===merged[1],variant==='vpm');scoped.unmount();
 // Real caller and its transitive Radix modules all share this context module.
 // Isolated evaluator keeps the original sources and React untouched.
 const cache=new Map();let intercepted=0;
 function evaluate(file){if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const local=createRequire(file);new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>{if(name==='@radix-ui/react-context'){intercepted++;return {createContext,createContextScope}}const resolved=local.resolve(name);return resolved.includes('/@radix-ui/')&&resolved.endsWith('.js')?evaluate(resolved):local(name)},mod,mod.exports);return mod.exports;}
 const group=evaluate(require.resolve('@radix-ui/react-toggle-group')),changes=[];
 const Toggle=()=>h(group.Root,{type:'single',defaultValue:'one',onValueChange:v=>changes.push(v)},h(group.Item,{value:'one'},'One'),h(group.Item,{value:'two'},'Two'));
 const caller=render(h(Toggle));assert.equal(caller.getByText('One').getAttribute('aria-checked'),'true');fireEvent.click(caller.getByText('Two'));assert.deepEqual(changes,['two']);assert.equal(caller.getByText('Two').getAttribute('aria-checked'),'true');caller.unmount();assert(intercepted>1);
 const container=document.createElement('div');container.innerHTML=renderToString(h(Toggle));document.body.append(container);const hydrated=render(h(Toggle),{container,hydrate:true});fireEvent.click(hydrated.getByText('Two'));assert.equal(hydrated.getByText('Two').getAttribute('aria-checked'),'true');hydrated.unmount();container.remove();
 console.log(`${variant}: context defaults/errors/updates, paired shape regression, composed scope isolation/identity and unchanged ToggleGroup+hydration pass`);
}finally{cleanup();dom.window.close();}
