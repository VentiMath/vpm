'use strict';
const assert=require('node:assert/strict');
const pause=()=>new Promise(r=>setTimeout(r,0)),deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
(async()=>{for(const name of ['current-query-core','../../packages/vtanstack-query-core']){
 const c=require(name),equal=c.shallowEqualObjects||require(require('node:path').join(require('node:path').dirname(require.resolve(name)),'utils.cjs')).shallowEqualObjects,client=new c.QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity},mutations:{gcTime:Infinity}}});
 try{
  assert.equal(equal({a:undefined},{b:undefined}),false);assert.equal(equal({a:1},Object.assign(Object.create({a:1}),{b:1})),false);
  let calls=0;const observer=new c.QueryObserver(client,{queryKey:['static'],staleTime:'static',queryFn:async()=>{if(++calls===1)throw Error('initial');return 42;}});const stop=observer.subscribe(()=>{});while(observer.getCurrentResult().status!=='error')await pause();await client.refetchQueries({queryKey:['static']},{throwOnError:true});assert.equal(calls,2);assert.equal(client.getQueryData(['static']),42);stop();
  const pending=deferred(),options={queryKey:['undefined'],queryFn:()=>pending.promise};const a=client.fetchQuery(options),b=client.fetchQuery(options);const results=Promise.allSettled([a,b]);pending.resolve(undefined);assert.deepEqual((await results).map(r=>r.status),['rejected','rejected']);assert.equal(client.getQueryState(['undefined']).status,'error');
  c.onlineManager.setOnline(false);const gate=deferred();const mutation=new c.MutationObserver(client,{onMutate:()=>gate.promise,mutationFn:async()=>7});const result=mutation.mutate();await pause();c.onlineManager.setOnline(true);gate.resolve();assert.equal(await result,7);assert.equal(mutation.getCurrentResult().isPaused,false);
  console.log(name+': current patch checks pass: own keys, empty static query recovery, deduplicated validation and online recovery during onMutate.');
 }finally{c.onlineManager.setOnline(true);client.clear();}
}})().catch(e=>{console.error(e);process.exitCode=1});
