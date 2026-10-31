'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const upstream=require('../../../scripts/otel-conformance/node_modules/api-current'),vpm=require('..');
const {TracerProvider}=require('../../../scripts/otel-conformance/node_modules/@opentelemetry/sdk-trace'),{AsyncLocalStorageContextManager}=require('../../../scripts/otel-conformance/node_modules/@opentelemetry/context-async-hooks');
const {gax,dynamic,staticArgs}=require('../../../scripts/otel-conformance/consumers.cjs');
const cases=[],add=(name,make,validate)=>cases.push({name,make,validate});
for(const n of [1,8,32]) {
 const raw=Array.from({length:n},(_,i)=>`v${i}=${i}`).join(',');
 add(`trace state / parse and serialize ${n}`,lib=>()=>lib.createTraceState(raw).serialize(),x=>assert.equal(x,raw));
 add(`trace state / repeated serialize ${n}`,lib=>{const state=lib.createTraceState(raw);state.serialize();return()=>state.serialize();},x=>assert.equal(x,raw));
}
const raw=Array.from({length:8},(_,i)=>`v${i}=${i}`).join(',');
add('trace state / update and serialize 8',lib=>{const state=lib.createTraceState(raw);return()=>state.set('v7','updated').serialize();},x=>assert.equal(x,'v7=updated,'+raw.split(',').slice(0,-1).join(',')));
const entries=Object.fromEntries(Array.from({length:8},(_,i)=>['k'+i,{value:'v'+i}]));
add('baggage / create 8',lib=>()=>lib.propagation.createBaggage(entries),x=>assert.equal(x.getEntry('k7').value,'v7'));
add('baggage / set entry among 8',lib=>{const bag=lib.propagation.createBaggage(entries);return()=>bag.setEntry('k7',{value:'new'});},x=>assert.equal(x.getEntry('k7').value,'new'));
add('baggage / enumerate 8',lib=>{const bag=lib.propagation.createBaggage(entries);return()=>bag.getAllEntries();},x=>assert.deepEqual(x,Object.entries(entries)));
add('baggage / get one entry',lib=>{const bag=lib.propagation.createBaggage(entries);return()=>bag.getEntry('k7');},x=>assert.equal(x.value,'v7'));
add('context / update and read',lib=>{const key=lib.createContextKey('bench');return()=>lib.ROOT_CONTEXT.setValue(key,42).getValue(key);},x=>assert.equal(x,42));
const provider=new TracerProvider(),manager=new AsyncLocalStorageContextManager().enable();
upstream.context.setGlobalContextManager(manager);upstream.trace.setGlobalTracerProvider(provider);
add('gax / real SDK call and attempt spans',lib=>{const helper=gax(lib);return()=>helper.traceCall(dynamic,staticArgs,()=>helper.traceAttempt(dynamic,staticArgs,()=>42));},x=>assert.equal(x,42));
const root=path.resolve(__dirname,'..'),original=path.dirname(require.resolve('../../../scripts/otel-conformance/node_modules/api-current'));
const files=['package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/otel-conformance/consumers.cjs','../../scripts/otel-conformance/package-lock.json','../../scripts/protobuf-conformance/package-lock.json',...fs.readdirSync(path.join(root,'dist'),{recursive:true}).filter(f=>f.endsWith('.cjs')).map(f=>'dist/'+f),...fs.readdirSync(original,{recursive:true}).filter(f=>f.endsWith('.cjs')).map(f=>path.relative(root,path.join(original,f)))];
require('../../../scripts/bench-paired.cjs').run({root,upstream,vpm,cases,files,cleanup:async()=>{upstream.trace.disable();upstream.context.disable();manager.disable();await provider.shutdown();}}).catch(e=>{console.error(e);process.exitCode=1;});
