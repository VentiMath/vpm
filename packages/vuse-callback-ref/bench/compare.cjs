'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/callback-ref-conformance');
const R=require('node:module').createRequire(path.join(fixture,'package.json')),React=R('react'),{renderToString}=R('react-dom/server');
const {JSDOM}=R('jsdom'),dom=new JSDOM('<!doctype html><body></body>');
for(const name of ['window','document','navigator','HTMLElement','Node'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
const {createRoot}=R('react-dom/client'),{flushSync}=R('react-dom'),roots=[];
const noop=()=>{};
const cases=[
 {name:'create observable ref',make:file=>{const api=require(file);return()=>api.createCallbackRef(noop)},validate:r=>assert.equal(r.current,null)},
 {name:'update and clear two merged refs',make:file=>{const api=require(file),a={current:null},b={current:null},ref=api.mergeRefs([a,b]);return()=>{ref.current=7;ref.current=null;return b}},validate:r=>assert.equal(r.current,null)},
 {name:'cached callback ref assignment',make:file=>{const api=require(file),ref={current:null};return()=>{api.useRefToCallback(ref)(7);return ref}},validate:r=>assert.equal(r.current,7)},
 {name:'SSR with two merged refs',make:file=>{const api=require(file);function App(){const own=React.useRef(null),merged=api.useMergeRefs([own,null]);return React.createElement('div',{ref:merged},'ok')}return()=>renderToString(React.createElement(App))},validate:s=>assert.equal(s,'<div>ok</div>')},
 {name:'mounted stable ref rerender',make:file=>{const api=require(file),host=document.createElement('div'),root=createRoot(host),parent={current:null};roots.push(root);function App(){const own=React.useRef(null);return React.createElement('div',{ref:api.useMergeRefs([own,parent])},'ok')}return()=>{flushSync(()=>root.render(React.createElement(App)));return parent.current}},validate:el=>assert.equal(el.textContent,'ok')},
];
const harness=require('../../../scripts/bench-process.cjs'),options={root,upstream:path.join(fixture,'node_modules/use-callback-ref'),vpm:root,files:['package.json','index.cjs','bench/compare.cjs','../../scripts/callback-ref-conformance/package-lock.json',...['use-callback-ref','react','react-dom'].map(n=>'../../scripts/callback-ref-conformance/node_modules/'+n)],cleanup:async()=>{for(const root of roots)flushSync(()=>root.unmount());dom.window.close()}};
(async()=>{
 if(process.env.VPM_BENCH_WORKER){const i=Number(process.env.VPM_CASE);assert(Number.isInteger(i)&&i>=0&&i<cases.length);await harness.run({...options,cases:[cases[i]]});return}
 const dir=process.env.RESULT_DIR||path.join(__dirname,'results');require('node:fs').mkdirSync(dir,{recursive:true});
 for(let i=0;i<cases.length;i++){process.env.VPM_CASE=String(i);process.env.OUTPUT=path.join(dir,`${process.versions.bun?'bun':'node'}-${i}.json`);await harness.run({...options,cases:[cases[i]]})}
})().catch(e=>{console.error(e);process.exitCode=1});
