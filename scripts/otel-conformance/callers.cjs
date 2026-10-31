'use strict';
const assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const upstream=require('api-current'),old=require('api-previous'),{TracerProvider,InMemorySpanExporter,SimpleSpanProcessor}=require('@opentelemetry/sdk-trace'),{AsyncLocalStorageContextManager}=require('@opentelemetry/context-async-hooks');
const {gax,dynamic,staticArgs}=require('./consumers.cjs');
const registry=Symbol.for('opentelemetry.js.api.1');
module.exports=async function(api=require('../../packages/vopentelemetry-api')) {
 const esm=await import('../../packages/vopentelemetry-api/dist/index.mjs');
 const readers=[api,upstream,esm,old];
 function clear(){for(const a of readers){a.trace.disable();a.context.disable();a.propagation.disable();a.metrics.disable();a.logs?.disable();a.diag.disable();}delete globalThis[registry];}
 try {
  for(const owner of [api,upstream,esm]) {
   clear();const exporter=new InMemorySpanExporter(),provider=new TracerProvider({spanProcessors:[new SimpleSpanProcessor({exporter})]}),manager=new AsyncLocalStorageContextManager().enable();
   try {
    assert.equal(owner.context.setGlobalContextManager(manager),true);assert.equal(owner.trace.setGlobalTracerProvider(provider),true);assert.equal(upstream.trace.setGlobalTracerProvider(provider),false);
    assert.equal(globalThis[registry].version,'1.10.0');
    const key=api.createContextKey('vpm-async-caller'),bag=api.propagation.createBaggage({request:{value:'fixture'}}),base=api.propagation.setBaggage(api.ROOT_CONTEXT,bag);
    await Promise.all([1,2,3].map(n=>api.context.with(base.setValue(key,n),async()=>{await new Promise(resolve=>setImmediate(resolve));for(const r of readers){assert.equal(r.context.active().getValue(key),n);assert.equal(r.propagation.getBaggage(r.context.active()).getEntry('request').value,'fixture');}})));
    for(const r of readers){const span=r.trace.getTracer('reader').startSpan('shared');assert.equal(span.isRecording(),true);span.end();}
    const helper=gax(api);
    const result=await helper.traceCall(dynamic,staticArgs,()=>helper.traceAttempt(dynamic,staticArgs,async()=>{await Promise.resolve();assert.ok(api.trace.getActiveSpan()?.isRecording());return 42;}));assert.equal(result,42);
    const error=Object.assign(new Error('fixture failure'),{code:7});await assert.rejects(helper.traceCall({...dynamic,methodName:'Failed'},staticArgs,()=>Promise.reject(error)),e=>e===error);
    await new Promise((resolve,reject)=>helper.traceCall({...dynamic,methodName:'Callback'},staticArgs,cb=>{setImmediate(()=>cb(null,7));},false,(err,value)=>{try{assert.equal(err,null);assert.equal(value,7);resolve();}catch(e){reject(e);}}));
    const stream=new EventEmitter();assert.equal(helper.traceCall({...dynamic,methodName:'Stream'},staticArgs,()=>stream,true),stream);stream.emit('end');stream.emit('close');
    const http={...dynamic,rpcType:'http',methodName:'Http'};helper.traceCall(http,staticArgs,()=>helper.traceAttempt(http,staticArgs,()=>{helper.setAttemptHttpMethod('GET','/v1/{name}');return 1;}));
    await provider.forceFlush();const spans=exporter.getFinishedSpans();assert.equal(spans.length,11);const call=spans.find(s=>s.name==='FirestoreClient.GetDocument'),attempt=spans.find(s=>s.name==='google.firestore.v1.Firestore/GetDocument');assert.ok(call);assert.equal(attempt.parentSpanContext.spanId,call.spanContext().spanId);assert.equal(attempt.spanContext().traceId,call.spanContext().traceId);assert.equal(attempt.attributes['rpc.response.status_code'],'OK');assert.equal(attempt.kind,api.SpanKind.CLIENT);
    assert.equal(spans.find(s=>s.name==='FirestoreClient.Failed').status.code,api.SpanStatusCode.ERROR);assert.equal(spans.filter(s=>s.name==='FirestoreClient.Stream').length,1);assert.equal(spans.find(s=>s.name==='GET /v1/{name}').attributes['http.request.method'],'GET');assert.equal(spans.find(s=>s.name==='FirestoreClient.Http').attributes['url.template'],'/v1/{name}');
    // Metrics and logs share the same registry without needing a full SDK here.
    const meter={marker:'meter'},logger={marker:'logger'};assert.equal(owner.metrics.setGlobalMeterProvider({getMeter:()=>meter}),true);assert.equal(owner.logs.setGlobalLoggerProvider({getLogger:()=>logger}),true);for(const r of [api,upstream,esm]){assert.equal(r.metrics.getMeter('fixture'),meter);assert.equal(r.logs.getLogger('fixture'),logger);}
   }finally{clear();manager.disable();await provider.shutdown();}
  }
  // Keep the upstream version gate: a 1.9-owned registry cannot register 1.10 APIs.
  clear();assert.equal(old.trace.setGlobalTracerProvider({getTracer:()=>({old:true})}),true);assert.equal(api.trace.setGlobalTracerProvider({getTracer:()=>({})}),false);assert.equal(upstream.trace.setGlobalTracerProvider({getTracer:()=>({})}),false);assert.equal(api.trace.getTracer('incompatible').startSpan('noop').isRecording(),false);
  console.log('OpenTelemetry: real SDK 3.0.0 and gax 6.14.0 tracing; CJS/ESM/provider interoperability, concurrent async context, promise/error/callback/stream, parent spans, metrics/logs and legacy registry gates passed.');
 }finally{clear();}
};
if(require.main===module)module.exports(process.argv.includes('--upstream')?upstream:undefined).catch(e=>{console.error(e);process.exitCode=1;});
