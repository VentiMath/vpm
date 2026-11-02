'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),esbuild=require('esbuild');
const outputs=[];
for(const original of [true,false]){
 const entry=require.resolve(original?'redux':'../../packages/vredux');
 const bundled=esbuild.buildSync({entryPoints:[path.join(__dirname,'node_modules/@hello-pangea/dnd/src/state/create-store.ts')],bundle:true,write:false,format:'cjs',platform:'browser',alias:{redux:entry},define:{'process.env.NODE_ENV':'"production"'},metafile:true});
 assert(Object.keys(bundled.metafile.inputs).some(x=>path.resolve(x)===entry));
 const module={exports:{}},context=vm.createContext({module,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout,clearTimeout,console});vm.runInContext(bundled.outputFiles[0].text,context);
 const events=[],record=name=>()=>events.push(name);
 const store=module.exports.default({dimensionMarshal:{stopPublishing:record('stopPublishing')},focusMarshal:{},styleMarshal:{resting:record('resting')},getResponders:()=>({}),announce:record('announce'),autoScroller:{stop:record('stop'),scroll:record('scroll')}});
 assert.equal(store.getState().phase,'IDLE');const off=store.subscribe(()=>events.push(store.getState().phase));
 store.dispatch(vm.runInContext('({type:"FLUSH"})',context));off();store.dispatch(vm.runInContext('({type:"FLUSH"})',context));
 outputs.push(JSON.stringify({state:store.getState(),events}));assert(events.includes('resting'));assert(events.includes('stopPublishing'));assert(events.includes('IDLE'));
 const r=require(entry),reducers=Object.fromEntries(['__proto__','constructor','toString'].map(key=>[key,(s=0)=>s]));
 const state=r.combineReducers(reducers)(undefined,{type:'init'});
 assert.equal(Object.hasOwn(state,'__proto__'),!original);assert.equal(typeof state.constructor,original?'function':'number');
 const bound=r.bindActionCreators(Object.fromEntries([['__proto__',()=>({type:'x'})]]),x=>x);assert.equal(Object.hasOwn(bound,'__proto__'),!original);
}
assert.equal(outputs[0],outputs[1]);
console.log('Actual DND18 store creation, middleware FLUSH effects and subscription match; prototype-key regression controls reproduced. This does not cover a browser drag lifecycle.');
