'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
if(!process.argv.includes('--child')){
 const results=['upstream','vpm'].map(variant=>{const r=spawnSync(process.execPath,[__filename,'--child',variant],{encoding:'utf8',timeout:45000});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)});
 assert.deepEqual(results[1],results[0]);console.log('Messaging topics: 12 normal request/result controls match; ownership, sparse arrays, safe identifiers, 100-request bound, malformed results and deletion cleanup pass.');
}else (async()=>{
 const original=process.argv.at(-1)==='upstream',root=path.resolve(__dirname,original?'node_modules/firebase-admin':'../../packages/vfirebase-admin');
 const {EventEmitter}=require('node:events'),http2=require('node:http2'),sessions=[];
 http2.connect=()=>{const s=new EventEmitter();s.closed=false;s.closes=0;s.close=()=>{s.closed=true;s.closes++};sessions.push(s);return s;};
 const {Messaging}=require(root+'/lib/messaging/messaging'),{FirebaseMessagingError}=require(root+'/lib/messaging/error');
 const create=(transport=true,projectId='fixture')=>{const service=new Messaging({options:{projectId}}),log=[];service.useLegacyTransport=transport;
 const topic=async(host,url,method,data)=>{log.push({host,url,method,data});return decodeURIComponent(url).includes('/stale/')?{success:false,error:FirebaseMessagingError.fromTopicManagementServerError('NOT_FOUND')}:{success:true};};
 service.messagingRequestHandler.invokeHttpRequestHandlerForTopicSubscriptionResponse=topic;
 service.messagingRequestHandler.invokeHttp2RequestHandlerForTopicSubscriptionResponse=topic;
 service.messagingRequestHandler.invokeRequestHandler=async(host,url,data)=>{log.push({host,url,data});return {results:data.registration_tokens.map(t=>t==='stale'?{error:'NOT_FOUND'}:{})}};
 return {service,log};};
 const project=result=>({successCount:result.successCount,failureCount:result.failureCount,errors:result.errors.map(e=>({index:e.index,code:e.error.code}))}),normal=[];
 for(const transport of [true,false])for(const method of ['subscribeToTopic','unsubscribeFromTopic'])for(const topic of ['math','/topics/private/math']){
  const {service,log}=create(transport);normal.push({result:project(await service[method](['one','stale','three'],topic)),log});
 }
 for(const method of ['subscribeToTopicLegacy','unsubscribeFromTopicLegacy'])for(const topic of ['math','/topics/math']){const {service,log}=create();normal.push({result:project(await service[method](['one','stale'],topic)),log});}
 // Capture both caller data and the selected transport before the first await.
 {const {service,log}=create();let release;service.getProjectId=()=>new Promise(resolve=>{release=resolve});const tokens=['one','two'];const pending=service.subscribeToTopic(tokens,'math');await new Promise(r=>setImmediate(r));tokens[0]='changed';release('fixture');await pending;assert.equal(log[0].url.includes('/changed/'),original);}
 {const {service,log}=create();const tokens=['one'];const pending=service.subscribeToTopicLegacy(tokens,'math');tokens[0]='changed';await pending;assert.equal(log[0].data.registration_tokens[0],original?'changed':'one');}
 {const {service,log}=create();const pending=service.subscribeToTopic(['one',,'three'],'math');if(original){const result=await pending;assert.equal(result.successCount,2);assert.equal(result.failureCount,1);assert.equal(result.errors[0].error.code,'messaging/unknown-error');assert.equal(log.length,2);}else{await assert.rejects(pending,e=>e.code==='messaging/invalid-argument');assert.equal(log.length,0);}}
 {const {service,log}=create(true,'a/b?scope=other');await service.subscribeToTopic('tok/en','math');assert.equal(log[0].url,original?'/v1/projects/a/b?scope=other/registrations/tok%2Fen/topicSubscriptions?topic_name=math':'/v1/projects/a%2Fb%3Fscope%3Dother/registrations/tok%2Fen/topicSubscriptions?topic_name=math');}
 for(const token of ['..','\ud800']){const {service,log}=create(false),before=sessions.length;try{const value=await service.subscribeToTopic(token,'math');assert(original);if(token==='..')assert.equal(value.successCount,1);}catch(e){assert(!original||token==='\ud800');if(!original)assert.equal(e.code,'messaging/invalid-argument');}if(!original){assert.equal(sessions.length,before);assert.equal(log.length,0);}}
 {const {service}=create(false),before=sessions.length;service.getProjectId=()=>Promise.reject(Error('discovery'));await assert.rejects(service.subscribeToTopic('one','math'),/discovery/);assert.equal(sessions.length-before,original?1:0);}
 {const {service}=create();let active=0,max=0;service.messagingRequestHandler.invokeHttpRequestHandlerForTopicSubscriptionResponse=async()=>{active++;max=Math.max(max,active);await new Promise(r=>setImmediate(r));active--;return {success:true}};const result=await service.subscribeToTopic(Array.from({length:251},(_,i)=>String(i)),'math');assert.equal(max,100);assert.equal(result.successCount,251);}
 for(const results of [[{}],Array(2),[null,{}],[{},{},{}]]){const {service}=create();service.messagingRequestHandler.invokeRequestHandler=async()=>({results});if(!original)await assert.rejects(service.subscribeToTopicLegacy(['one','two'],'math'),e=>e.code==='messaging/unknown-error');else try{await service.subscribeToTopicLegacy(['one','two'],'math')}catch(e){assert(e instanceof TypeError);}}
 if(!original){
  const inherited=['one',,'three'];Object.setPrototypeOf(inherited,Object.assign(Object.create(Array.prototype),{1:'inherited'}));
  for(const method of ['subscribeToTopic','subscribeToTopicLegacy'])await assert.rejects(create().service[method](inherited,'math'),e=>e.code==='messaging/invalid-argument');

  const {initializeApp,deleteApp}=require(root+'/lib/app'),{getMessaging}=require(root+'/lib/messaging');
  const app=initializeApp({projectId:'fixture',credential:{getAccessToken:async()=>({access_token:'fixture',expires_in:3600})}},'topics-lifetime');const service=getMessaging(app);assert.equal(getMessaging(app),service);
  let finish;service.messagingRequestHandler.invokeHttp2RequestHandlerForTopicSubscriptionResponse=()=>new Promise(r=>{finish=r});const start=sessions.length,pending=service.subscribeToTopic('one','math');await new Promise(r=>setImmediate(r));assert.equal(sessions.length,start+1);await deleteApp(app);assert.equal(sessions.at(-1).closes,1);finish({success:true});await pending;assert.equal(sessions.at(-1).closes,1);assert.throws(()=>service.send({token:'one'}),/deleted/);assert.throws(()=>service.subscribeToTopic('one','math'),/deleted/);
  const late=create(false).service;let release;late.getProjectId=()=>new Promise(r=>{release=r});const count=sessions.length,work=late.subscribeToTopic('one','math');await new Promise(r=>setImmediate(r));await late.delete();release('fixture');await assert.rejects(work,/deleted/);assert.equal(sessions.length,count);
 }
 assert(sessions.every(s=>s.closed&&s.closes===1));process.stdout.write(JSON.stringify(normal));
})().catch(error=>{console.error(error);process.exitCode=1});
