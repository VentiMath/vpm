import api,{ROOT_CONTEXT,context,propagation,trace,metrics,logs,createContextKey,createTraceState,SpanKind,SpanStatusCode,type Context,type Span,type Baggage,type TracerProvider} from '..';
import {wrapTracer} from '../dist/experimental/index.cjs';
const key=createContextKey('fixture');const child:Context=ROOT_CONTEXT.setValue(key,'value');const value:unknown=child.getValue(key);
const baggage:Baggage=propagation.createBaggage({name:{value:'fixture'}});const next=propagation.setBaggage(child,baggage);
const span:Span=trace.getTracer('test').startSpan('call',{kind:SpanKind.CLIENT},next);span.setStatus({code:SpanStatusCode.OK});span.end();
const state=createTraceState('a=1').set('b','2');const text:string=state.serialize();
metrics.getMeter('test').createCounter('count').add(1);logs.getLogger('test').emit({body:'fixture'});const wrapped=wrapTracer(trace.getTracer('test'));void wrapped;
declare const provider:TracerProvider;trace.setGlobalTracerProvider(provider);context.with(next,()=>value);void[api,text];
// @ts-expect-error baggage values must be strings
propagation.createBaggage({bad:{value:1}});
// @ts-expect-error trace state values must be strings
state.set('key',5);
