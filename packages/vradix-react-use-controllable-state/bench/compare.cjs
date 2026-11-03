'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const fixture=path.resolve(__dirname,'../../../scripts/radix-state-conformance'),upstream=path.join(fixture,'node_modules/@radix-ui/react-use-controllable-state'),vpm=path.resolve(__dirname,'..');
const cases=[];
for(const version of ['19.1','19.2'])for(const operation of ['controlled proposal','uncontrolled commit','uncontrolled reducer',...(version==='19.1'?['controlled reducer']:[])])cases.push({name:'React '+version+' / '+operation,make:file=>{
 const {JSDOM}=require(path.join(fixture,'node_modules/jsdom')),dom=new JSDOM('<div id="root"></div>');globalThis.window=dom.window;globalThis.document=dom.window.document;
 const {api,React,selected}=require(path.join(fixture,'load.cjs'))(file===upstream?'upstream':'vpm',version);
 let tuple,observed=0,tick=0;const onChange=x=>{observed=x;};
 function Child(){tuple=operation.endsWith('reducer')?api.useControllableStateReducer((s,a)=>({...s,state:a.value}),{prop:operation==='controlled reducer'?0:undefined,defaultProp:0,onChange},{other:true}):api.useControllableState({prop:operation.startsWith('controlled')?0:undefined,defaultProp:0,onChange});return React.createElement('i',null,typeof tuple[0]==='object'?tuple[0].state:tuple[0]);}
 const root=selected('react-dom/client').createRoot(document.getElementById('root')),{flushSync}=selected('react-dom');flushSync(()=>root.render(React.createElement(Child)));
 if(operation==='controlled proposal')return()=>{tuple[1](1);return observed;};
 return()=>{const value=++tick%2;flushSync(()=>tuple[1](operation.endsWith('reducer')?{type:'set',value}:value));return observed;};
},validate:value=>assert([0,1].includes(value))});
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/radix-state-conformance/load.cjs','../../scripts/radix-state-conformance/package-lock.json','../../scripts/radix-state-conformance/current/package-lock.json','../../scripts/radix-state-conformance/node_modules/@radix-ui/react-use-controllable-state','../vradix-react-use-effect-event/index.cjs','../vradix-primitive/package.json']}).catch(e=>{console.error(e);process.exitCode=1});
