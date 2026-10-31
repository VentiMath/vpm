'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{EventEmitter}=require('node:events');
const {TracerProvider,InMemorySpanExporter,SimpleSpanProcessor}=require('../otel-conformance/node_modules/@opentelemetry/sdk-trace'),{AsyncLocalStorageContextManager}=require('../otel-conformance/node_modules/@opentelemetry/context-async-hooks');
const {dynamic,staticArgs}=require('../otel-conformance/consumers.cjs');
module.exports=async function(original=false){
 const directory=original?path.join(__dirname,'node_modules/google-gax'):path.resolve(__dirname,'../../packages/vgoogle-gax');
 const api=original?require('../otel-conformance/node_modules/api-current'):require('../../packages/vopentelemetry-api');
 const helper=require(path.join(directory,'build/src/observability/TracerHelper')),exporter=new InMemorySpanExporter(),provider=new TracerProvider({spanProcessors:[new SimpleSpanProcessor({exporter})]}),manager=new AsyncLocalStorageContextManager().enable();
 api.trace.disable();api.context.disable();
 try{
  assert.equal(api.context.setGlobalContextManager(manager),true);assert.equal(api.trace.setGlobalTracerProvider(provider),true);
  assert.equal(await helper.traceCall(dynamic,staticArgs,()=>helper.traceAttempt(dynamic,staticArgs,async()=>{await Promise.resolve();assert.ok(api.trace.getActiveSpan().isRecording());return 42;})),42);
  const failure=Object.assign(new Error('fixture'),{code:7});await assert.rejects(helper.traceCall({...dynamic,methodName:'Failed'},staticArgs,()=>Promise.reject(failure)),error=>error===failure);
  await new Promise((resolve,reject)=>helper.traceCall({...dynamic,methodName:'Callback'},staticArgs,callback=>setImmediate(()=>callback(null,7)),false,(error,value)=>{try{assert.equal(error,null);assert.equal(value,7);resolve();}catch(e){reject(e);}}));
  const stream=new EventEmitter();helper.traceCall({...dynamic,methodName:'Stream'},staticArgs,()=>stream,true);stream.emit('end');stream.emit('close');
  await provider.forceFlush();const spans=exporter.getFinishedSpans();assert.equal(spans.length,5);const call=spans.find(s=>s.name==='FirestoreClient.GetDocument'),attempt=spans.find(s=>s.name==='google.firestore.v1.Firestore/GetDocument');assert.equal(attempt.parentSpanContext.spanId,call.spanContext().spanId);assert.equal(attempt.spanContext().traceId,call.spanContext().traceId);assert.equal(spans.find(s=>s.name==='FirestoreClient.Failed').status.code,api.SpanStatusCode.ERROR);
 }finally{api.trace.disable();api.context.disable();manager.disable();await provider.shutdown();}
};
