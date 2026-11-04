'use strict';
const assert = require('node:assert/strict');
// Observe committed layout results, not only the settled value returned by waitFor.
module.exports = async (React, api, {renderHook, act, waitFor}) => {
  const clients = [], defer = () => {let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
  const view = q => ({status:q.status,fetchStatus:q.fetchStatus,error:q.error?.message ?? null,data:q.data,loading:q.isLoading});
  const setup = () => {const client=new api.QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});clients.push(client);return {client,wrapper:({children})=>React.createElement(api.QueryClientProvider,{client},children)};};
  let cases=0;
  try {
    for(const mode of ['remount','enabled','refetch','no-retry','disabled','offline','fresh','stale','no-refetch','always']) {
      const {client,wrapper}=setup(), gate=defer(), queryKey=['first',mode], trace=[];let calls=0;
      if(['fresh','stale','no-refetch','always'].includes(mode)) client.setQueryData(queryKey,'cached');
      else await client.fetchQuery({queryKey,queryFn:()=>Promise.reject(new Error('old failure'))}).catch(()=>{});
      const queryFn=()=>{calls++;return gate.promise;};
      const options={queryKey,queryFn,...(mode==='no-retry'?{retryOnMount:false}:{}),...(mode==='fresh'?{staleTime:Infinity}:{}),...(mode==='no-refetch'?{refetchOnMount:false}:{}),...(mode==='always'?{refetchOnMount:'always',staleTime:Infinity}:{})};
      if(mode==='offline')api.onlineManager.setOnline(false);
      const startsDisabled=['enabled','refetch','disabled'].includes(mode);
      const hook=renderHook(({enabled})=>{const q=api.useQuery({...options,enabled});React.useLayoutEffect(()=>{trace.push(view(q));});return q;},{wrapper,initialProps:{enabled:!startsDisabled}});
      if(mode==='enabled'){trace.length=0;hook.rerender({enabled:true});}
      if(mode==='refetch'){trace.length=0;await act(async()=>{void hook.result.current.refetch();await new Promise(r=>setTimeout(r,0));});}
      const first=trace[0];assert(first,mode+' committed a result');
      if(['no-retry','disabled'].includes(mode)) {assert.equal(first.status,'error',mode);assert.equal(first.fetchStatus,'idle',mode);assert.equal(calls,0);}
      else if(['fresh','no-refetch'].includes(mode)){assert.equal(first.status,'success',mode);assert.equal(first.fetchStatus,'idle',mode);assert.equal(calls,0);}
      else if(['stale','always'].includes(mode)){assert.equal(first.status,'success',mode);assert.equal(first.data,'cached');assert.equal(first.fetchStatus,'fetching',mode);}
      else {assert.equal(first.status,'pending',mode);assert.equal(first.error,null,mode);assert.equal(first.fetchStatus,mode==='offline'?'paused':'fetching',mode);assert.equal(first.loading,mode!=='offline',mode);}
      if(mode==='offline'){await act(async()=>{api.onlineManager.setOnline(true);});}
      await act(async()=>{gate.resolve('recovered');await gate.promise;});
      if(!['no-retry','disabled','fresh','no-refetch'].includes(mode))await waitFor(()=>assert.equal(hook.result.current.data,'recovered'));
      hook.unmount();cases++;
    }
    // An empty disabled query starts fetching in the first enabled commit too.
    {
      const {wrapper}=setup(),gate=defer(),trace=[];
      const hook=renderHook(({enabled})=>{const q=api.useQuery({queryKey:['empty-enable'],enabled,queryFn:()=>gate.promise});React.useLayoutEffect(()=>{trace.push(view(q));});return q;},{wrapper,initialProps:{enabled:false}});
      trace.length=0;hook.rerender({enabled:true});assert.equal(trace[0].loading,true);assert.equal(trace[0].fetchStatus,'fetching');
      await act(async()=>{gate.resolve(1);await gate.promise;});hook.unmount();cases++;
    }
    return cases;
  } finally {api.onlineManager.setOnline(true);for(const client of clients)client.clear();}
};
