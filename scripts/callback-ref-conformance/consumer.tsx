import * as React from 'react';
import {assignRef,createCallbackRef,useCallbackRef,useMergeRefs,useTransformRef,transformRef,mergeRefs,refToCallback,useRefToCallback} from 'vuse-callback-ref';
const count=React.createRef<number>();assignRef(count,1);
// @ts-expect-error wrong ref value
assignRef(count,'bad');
const signal=createCallbackRef<number>((value,old)=>{const result:number|null=value;void old;void result});signal.current=1;
// @ts-expect-error numeric ref
signal.current='bad';
const merged=mergeRefs([signal,count]);refToCallback(merged)(2);useRefToCallback(null)(null);
const mapped=transformRef<HTMLDivElement,string>(React.createRef<string>(),el=>el?.id??null);
function App(){const local=useCallbackRef<HTMLDivElement>(null,()=>{});const combined=useMergeRefs([local,React.useRef<HTMLDivElement>(null)]);const transformed=useTransformRef<HTMLDivElement,string>(React.createRef<string>(),el=>el?.id??null);return <div ref={combined}><div ref={transformed}/><div ref={mapped}/></div>}
void App;
