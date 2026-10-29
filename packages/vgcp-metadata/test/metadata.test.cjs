'use strict';
const {test,beforeEach,afterEach}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),os=require('node:os');
const gcp=require('..'),transport=require('vgaxios'),logging=require('vgoogle-logging-utils');
let env,request;
beforeEach(()=>{env={...process.env};request=transport.request;for(const key of ['GCE_METADATA_IP','GCE_METADATA_HOST','METADATA_SERVER_DETECTION','DETECT_GCP_RETRIES','DEBUG_AUTH','GOOGLE_SDK_NODE_LOGGING'])delete process.env[key];gcp.resetIsAvailableCache();gcp.setGCPResidency(false);});
afterEach(()=>{transport.request=request;for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);gcp.resetIsAvailableCache();logging.setBackend(undefined);});
const response=(data='{}',extra={})=>({data,headers:{'metadata-flavor':'Google'},status:200,...extra});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('accessors preserve paths, query strings, exact JSON and plain text',async()=>{
 const urls=[];transport.request=async o=>{urls.push(o.url);return response(o.url.includes('numeric')?'3279739563200103600':o.url.includes('project')?'my-project':'{"ok":true}');};
 assert.equal((await gcp.instance('numeric')).valueOf(),'3279739563200103600');assert.equal(await gcp.project('project-id'),'my-project');assert.equal((await gcp.universe('universe-domain')).ok,true);
 await gcp.instance('service-accounts/default/identity?format=full&audience=https://example.test');assert.match(urls.at(-1),/identity\?format=full&audience=https:\/\/example.test$/);
});
test('routing and input options are validated before requests',async()=>{
 let calls=0;transport.request=async()=>{calls++;return response();};
 for(const property of ['../project','x/../../project','%2e%2e/project','a/%2fsecret','a\\b','a#fragment','a b','a/%00'])await assert.rejects(gcp.instance(property),TypeError);
 for(const options of [null,[],{fake:'secret'},{timeout:0},{timeout:Infinity},{maxContentLength:0},{headers:{Host:'evil'}},{headers:{'Metadata-Flavor':'wrong'}},{headers:{x:'a\nb'}},{params:{x:{}}},{signal:{}}])await assert.rejects(gcp.instance(options));
 for(const host of ['ftp://example.test','http://user:secret@example.test','http://example.test/path','http://example.test/?q=secret','http://example.test/#x']){process.env.GCE_METADATA_HOST=host;await assert.rejects(gcp.project(),TypeError);}
 assert.equal(calls,0);
});
test('request snapshots preserve required flavor and bypass proxies and redirects',async()=>{
 let options;transport.request=async o=>{options=o;return response();};
 const input={headers:{x:['original'],'METADATA-FLAVOR':'Google'},params:{q:'original'}};const p=gcp.instance(input);input.headers.x.push('changed');input.params.q='changed';await p;
 assert.deepEqual(options.headers.x,['original']);assert.equal(options.headers['metadata-flavor'],'Google');assert.equal(options.params.q,'original');assert.deepEqual(options.noProxy,['*']);assert.equal(options.maxRedirects,0);assert.equal(options.timeout,3000);assert.equal(options.maxContentLength,16*1024*1024);
});
test('first valid success survives an earlier failure and aborts remaining work',async()=>{
 const signals=[];transport.request=async o=>{signals.push(o.signal);if(o.url.startsWith(gcp.HOST_ADDRESS))throw Object.assign(new Error('private'),{code:'ENOTFOUND'});await delay(10);return response();};
 assert.equal(await gcp.isAvailable(),true);assert.equal(signals.length,2);assert.ok(signals.every(s=>s.aborted));
});
test('invalid-flavor primary cannot beat a valid secondary response',async()=>{transport.request=async o=>o.url.startsWith(gcp.HOST_ADDRESS)?response('{}',{headers:{'metadata-flavor':'bad'}}):(await delay(5),response());assert.equal(await gcp.isAvailable(),true);});
test('success cancels the slow endpoint without unhandled rejection',async()=>{
 let aborted=false;transport.request=o=>o.url.startsWith(gcp.HOST_ADDRESS)?Promise.resolve(response()):new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>{aborted=true;reject(new Error('canceled'));},{once:true}));assert.equal(await gcp.isAvailable(),true);assert.ok(aborted);
});
test('explicit host overrides do not contact the secondary endpoint',async()=>{process.env.GCE_METADATA_HOST='127.0.0.1:1234';let calls=0;transport.request=async o=>{calls++;assert.match(o.url,/127\.0\.0\.1:1234/);return response();};assert.equal(await gcp.isAvailable(),true);assert.equal(calls,1);});
test('availability shares work and invalidates cache when host or retry settings change',async()=>{
 let calls=0;process.env.GCE_METADATA_HOST='one.test';transport.request=async()=>{calls++;await delay(5);return response();};assert.deepEqual(await Promise.all([gcp.isAvailable(),gcp.isAvailable()]),[true,true]);await gcp.isAvailable();assert.equal(calls,1);
 process.env.GCE_METADATA_HOST='two.test';await gcp.isAvailable();assert.equal(calls,2);process.env.DETECT_GCP_RETRIES='1';await gcp.isAvailable();assert.equal(calls,3);gcp.resetIsAvailableCache();await gcp.isAvailable();assert.equal(calls,4);
});
test('detection modes and retry counts reject inherited names and malformed numbers',async()=>{
 for(const mode of ['toString','constructor','__proto__','unknown']){process.env.METADATA_SERVER_DETECTION=mode;await assert.rejects(gcp.isAvailable(),RangeError);}
 process.env.METADATA_SERVER_DETECTION=' ASSUME-PRESENT ';assert.equal(await gcp.isAvailable(),true);process.env.METADATA_SERVER_DETECTION='none';assert.equal(await gcp.isAvailable(),false);process.env.METADATA_SERVER_DETECTION='bios-only';gcp.setGCPResidency(true);assert.equal(await gcp.isAvailable(),true);delete process.env.METADATA_SERVER_DETECTION;
 for(const retry of ['-1','1.5','Infinity','0x10','11',' 1']){process.env.DETECT_GCP_RETRIES=retry;await assert.rejects(gcp.isAvailable(),RangeError);}
});
test('entire network operation has a finite deadline and supports cancellation',async()=>{
 transport.request=o=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Object.assign(new Error('SECRET'),{code:'ABORT_ERR'})),{once:true}));
 gcp.setGCPResidency(true);assert.equal(gcp.requestTimeout(),3000);const start=performance.now();await assert.rejects(gcp.instance({timeout:20}),e=>e.code==='ETIMEDOUT');assert.ok(performance.now()-start<500);
 const controller=new AbortController(),pending=gcp.instance({signal:controller.signal});controller.abort('SECRET');await assert.rejects(pending,e=>e.code==='ERR_CANCELED'&&!String(e).includes('SECRET'));await assert.rejects(gcp.instance({signal:controller.signal}),e=>e.code==='ERR_CANCELED');
});
test('transport errors retain Gaxios identity/status without sensitive data',async()=>{
 transport.request=async()=>{throw Object.assign(new Error('PRIVATE_TOKEN'),{code:'PRIVATE_CODE',config:{url:'PRIVATE_URL'},response:{status:403,data:'PRIVATE_BODY',headers:{secret:'PRIVATE_HEADER'}}});};
 await assert.rejects(gcp.instance(),e=>{assert.ok(e instanceof transport.GaxiosError);assert.equal(e.status,403);assert.equal(e.response.status,403);assert.equal(e.code,'ERR_METADATA_REQUEST');assert.doesNotMatch(JSON.stringify(e)+e.stack,/PRIVATE/);assert.equal(e.error,undefined);return true;});
});
test('Fetch timeout wins before the metadata deadline without losing its code',async()=>{
 const {FetchError}=require('../../vnode-fetch');
 for(const type of ['request-timeout','body-timeout']){
  transport.request=async o=>{throw new transport.GaxiosError('PRIVATE',o,undefined,new FetchError('PRIVATE',type));};
  await assert.rejects(gcp.instance({timeout:3000}),e=>e.code==='ETIMEDOUT'&&!String(e).includes('PRIVATE'));
 }
});
test('diagnostics do not contain URLs, headers, query values or returned credentials',async()=>{
 const records=[];process.env.GOOGLE_SDK_NODE_LOGGING='*';logging.setBackend({setFilters(){},log:(...args)=>records.push(args)});transport.request=async()=>response('{"access_token":"SECRET_BODY"}');await gcp.instance({property:'service-accounts/SECRET_PATH/token',params:{q:'SECRET_QUERY'},headers:{authorization:'SECRET_HEADER'}});assert.ok(records.length);assert.doesNotMatch(JSON.stringify(records),/SECRET/);
});
test('bulk validates atomically, rejects duplicates and honors zero retries',async()=>{
 let calls=0;transport.request=async o=>{calls++;assert.equal(o.retryConfig.noResponseRetries,0);assert.equal(o.retryConfig.retry,3);return response('1');};await assert.rejects(gcp.bulk([{metadataKey:'instance'},{metadataKey:'../bad'}]));assert.equal(calls,0);await assert.rejects(gcp.bulk([{metadataKey:'instance'},{metadataKey:'instance'}]));assert.equal(calls,0);
 const result=await gcp.bulk([{metadataKey:'__proto__',noResponseRetries:0}]);assert.equal(Object.getPrototypeOf(result),null);assert.equal(result.__proto__,1);
});
test('bulk concurrency is bounded and input keys are snapshotted',async()=>{
 let active=0,max=0;transport.request=async()=>{max=Math.max(max,++active);await delay(2);active--;return response('1');};const items=Array.from({length:40},(_,i)=>({metadataKey:'instance/'+i}));const pending=gcp.bulk(items);items[0].metadataKey='changed';const result=await pending;assert.equal(max,16);assert.equal(Object.keys(result).length,40);assert.equal(result['instance/0'],1);assert.equal(result.changed,undefined);
});
test('residency heuristics validate MAC addresses and handle restricted interfaces',()=>{
 const original=os.networkInterfaces;try{os.networkInterfaces=()=>({x:[{mac:'42:01-not-a-mac'}]});assert.equal(gcp.isGoogleComputeEngineMACAddress(),false);os.networkInterfaces=()=>({x:[{mac:'42:01:ab:cd:ef:12'}]});assert.equal(gcp.isGoogleComputeEngineMACAddress(),true);os.networkInterfaces=()=>{throw new Error('denied');};assert.equal(gcp.isGoogleComputeEngineMACAddress(),false);}finally{os.networkInterfaces=original;}
 assert.ok(Object.isFrozen(gcp.GCE_LINUX_BIOS_PATHS));assert.throws(()=>gcp.setGCPResidency('yes'),TypeError);
});
test('real HTTP: flavor, body bounds, redirect denial and cancellation',async()=>{
 let redirects=0, oversized=0;const server=http.createServer((req,res)=>{if(req.url.endsWith('/redirect'))redirects++;if(req.url.endsWith('/large'))oversized++;res.setHeader('Metadata-Flavor','Google');if(req.url.endsWith('/redirect')){res.writeHead(302,{location:'/computeMetadata/v1/instance/ok'});res.end();}else if(req.url.endsWith('/hang')){}else res.end('{"id":3279739563200103600}');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));process.env.GCE_METADATA_HOST='127.0.0.1:'+server.address().port;
 try{assert.equal((await gcp.instance('ok')).id.valueOf(),'3279739563200103600');await assert.rejects(gcp.instance('redirect'));await assert.rejects(gcp.instance({property:'large',maxContentLength:4}));await assert.rejects(gcp.instance({property:'hang',timeout:25}),e=>e.code==='ETIMEDOUT');assert.equal(redirects,1);assert.equal(oversized,1);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('sparse bulk inputs fail before starting requests',async()=>{let calls=0;transport.request=async()=>{calls++;return response();};await assert.rejects(gcp.bulk([{}]),TypeError);const values=[{metadataKey:'instance'}];values.length=2;await assert.rejects(gcp.bulk(values),TypeError);assert.equal(calls,0);});
test('caller cancellation listener is removed after successful completion',async()=>{let added=0,removed=0;const signal={aborted:false,addEventListener(){added++;},removeEventListener(){removed++;}};transport.request=async()=>response();await gcp.instance({signal});assert.equal(added,1);assert.equal(removed,1);});
test('bulk failure stops scheduling additional requests',async()=>{let calls=0;transport.request=async()=>{if(++calls===1)throw new Error('failed');await delay(10);return response();};await assert.rejects(gcp.bulk(Array.from({length:40},(_,i)=>({metadataKey:'instance/'+i}))));await delay(20);assert.equal(calls,16);});
test('Fetch Headers and tuple lists are copied, validated and preserve required routing',async()=>{
 const seen=[];transport.request=async o=>{seen.push(o.headers);return response();};
 const h=new Headers({x:'before'}),pending=gcp.instance({headers:h});h.set('x','after');await pending;assert.equal(seen[0].x,'before');
 await gcp.bulk([{metadataKey:'instance',headers:[['X','one'],['x','two']]}]);assert.equal(seen[1].x,'one, two');
 for(const h of [new Headers({Host:'private.test'}),[['metadata-flavor','private']],[['metadata-flavor','Google'],['metadata-flavor','Google']],[['x','PRIVATE\nVALUE']],[[1]]])await assert.rejects(gcp.instance({headers:h}),e=>e instanceof TypeError&&!String(e).includes('PRIVATE'));
 assert.equal(seen.length,2);
});
test('native-fetch and Bun nested errors normalize without exposing diagnostics',async()=>{
 const socket=code=>Object.assign(new Error('PRIVATE'),{code});
 const cases=[['ECONNREFUSED',{cause:socket('ConnectionRefused')}],['ECONNREFUSED',{error:socket('FailedToOpenSocket')}],['ENOTFOUND',{cause:{cause:socket('ENOTFOUND')}}],['ETIMEDOUT',{cause:new DOMException('PRIVATE','AbortError')}],['ENOTFOUND',new AggregateError([{cause:socket('ENOTFOUND')},socket('ECONNREFUSED')])]];
 for(const [code,error]of cases){transport.request=async()=>{throw error;};await assert.rejects(gcp.instance(),e=>e.code===code&&!JSON.stringify(e).includes('PRIVATE'));}
});
test('availability bounds error graphs and does not hide unexpected secondary failures',async()=>{
 const emit=process.emitWarning,warnings=[];process.emitWarning=(...args)=>warnings.push(args);
 try{
  const known=Object.assign(new Error('PRIVATE'),{code:'ENOTFOUND'}),cycle=new Error('PRIVATE');cycle.cause=cycle;
  let deep=known;for(let i=0;i<30;i++)deep={cause:deep};
  for(const error of [cycle,deep,new AggregateError([]),new AggregateError(Array.from({length:100},()=>known)),new AggregateError([known,new Error('PRIVATE')])]){
   gcp.resetIsAvailableCache();transport.request=async o=>{throw o.url.startsWith(gcp.HOST_ADDRESS)?known:error;};assert.equal(await gcp.isAvailable(),false);
  }
  assert.equal(warnings.length,5);assert.doesNotMatch(JSON.stringify(warnings),/PRIVATE/);
  gcp.resetIsAvailableCache();transport.request=async()=>{throw {cause:{code:'FailedToOpenSocket'}};};assert.equal(await gcp.isAvailable(),false);assert.equal(warnings.length,5);
 }finally{process.emitWarning=emit;}
});
test('Cloud Run Worker Pools are recognized without disabling deadlines',()=>{for(const key of ['CLOUD_RUN_JOB','FUNCTION_NAME','K_SERVICE','CLOUD_RUN_WORKER_POOL'])delete process.env[key];assert.equal(gcp.isGoogleCloudServerless(),false);process.env.CLOUD_RUN_WORKER_POOL='worker';assert.equal(gcp.isGoogleCloudServerless(),true);gcp.setGCPResidency(null);assert.equal(gcp.getGCPResidency(),true);assert.equal(gcp.requestTimeout(),3000);});
