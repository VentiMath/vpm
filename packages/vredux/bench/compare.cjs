'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const action={type:'tick'},reducer=(s=0,a)=>a.type==='tick'?s+1:s;
const cases=[
 {name:'dispatch without listeners',make:file=>{const r=require(file),s=r.createStore(reducer);return()=>s.dispatch(action)},validate:x=>assert.equal(x,action)},
 {name:'dispatch to eight listeners',make:file=>{const r=require(file),s=r.createStore(reducer);let observed=0;for(let i=0;i<8;i++)s.subscribe(()=>{observed=s.getState()});return()=>{s.dispatch(action);return observed}},validate:x=>assert(x>0)},
 {name:'subscribe dispatch unsubscribe',make:file=>{const r=require(file),s=r.createStore(reducer);let observed=0;const listener=()=>{observed=s.getState()};return()=>{const off=s.subscribe(listener);s.dispatch(action);off();return observed}},validate:x=>assert(x>0)},
 {name:'combine eight reducers and dispatch',make:file=>{const r=require(file),s=r.createStore(r.combineReducers(Object.fromEntries(Array.from({length:8},(_,i)=>['key'+i,reducer]))));return()=>{s.dispatch(action);return s.getState().key7}},validate:x=>assert(x>0)},
 {name:'dispatch through four middleware',make:file=>{const r=require(file),mw=()=>next=>a=>next(a),s=r.createStore(reducer,r.applyMiddleware(mw,mw,mw,mw));return()=>s.dispatch(action)},validate:x=>assert.equal(x,action)},
];
const harness=require('../../../scripts/bench-process.cjs'),options={root,upstream:path.resolve(root,'../../scripts/redux-conformance/node_modules/redux'),vpm:root,files:['index.cjs','package.json','bench/compare.cjs','../../scripts/redux-conformance/package-lock.json','../../scripts/redux-conformance/node_modules/redux']};
(async()=>{
 if(process.env.VPM_BENCH_WORKER){const i=Number(process.env.VPM_CASE);assert(Number.isInteger(i)&&i>=0&&i<cases.length);await harness.run({...options,cases:[cases[i]]});return}
 const dir=process.env.RESULT_DIR||path.join(__dirname,'results');require('node:fs').mkdirSync(dir,{recursive:true});
 for(let i=0;i<cases.length;i++){process.env.VPM_CASE=String(i);process.env.OUTPUT=path.join(dir,`${process.versions.bun?'bun':'node'}-${i}.json`);await harness.run({...options,cases:[cases[i]]})}
})().catch(e=>{console.error(e);process.exitCode=1});
