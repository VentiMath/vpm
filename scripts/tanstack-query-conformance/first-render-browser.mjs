import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
const h=React.createElement,check=(value,message)=>{if(!value)throw Error(message);};
const until=async test=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('query did not settle');};
window.runChecks=async()=>{
 const host=document.getElementById('root'),root=createRoot(host),checks=[];
 try{
  for(const mode of ['remount','enabled','refetch','no-retry','empty-enabled','stale']){
   const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}}),queryKey=[mode],trace=[];let resolve,result,calls=0;
   const promise=new Promise(r=>resolve=r);
   if(mode==='stale')client.setQueryData(queryKey,'cached');
   else if(mode!=='empty-enabled')await client.fetchQuery({queryKey,queryFn:()=>Promise.reject(Error('old failure'))}).catch(()=>{});
   const queryFn=()=>{calls++;return promise;};
   function Read({enabled}){const q=useQuery({queryKey,queryFn,enabled,...(mode==='no-retry'?{retryOnMount:false}:{})});result=q;const label=[q.status,q.fetchStatus,q.error?.message??'none'].join('/');React.useLayoutEffect(()=>{trace.push({label,dom:host.textContent});});return h('output',null,label);}
   const render=enabled=>flushSync(()=>root.render(h(QueryClientProvider,{client},h(Read,{enabled}))));
   try{
    render(!['enabled','refetch','empty-enabled'].includes(mode));
    if(mode==='enabled'||mode==='empty-enabled'){trace.length=0;render(true);}
    if(mode==='refetch'){trace.length=0;void result.refetch();await until(()=>trace.length>0);}
    const expected=mode==='no-retry'?'error/idle/old failure':mode==='stale'?'success/fetching/none':'pending/fetching/none';
    check(trace[0].label===expected,mode+': '+JSON.stringify(trace));check(trace[0].dom===expected,mode+' DOM mismatches committed result');
    if(mode==='no-retry')check(calls===0,'retryOnMount false must not fetch');
    resolve('recovered');if(mode!=='no-retry')await until(()=>result.data==='recovered');checks.push(mode);
   }finally{flushSync(()=>root.render(null));client.clear();}
  }return {passed:true,checks};
 }finally{flushSync(()=>root.unmount());}
};
