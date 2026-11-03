'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHmac}=require('node:crypto'),http=require('node:http');
const Stripe=require('..'),upstream=require('../../../scripts/stripe-conformance/node_modules/stripe'),{params,event,session}=require('../../../scripts/stripe-conformance/fixtures.cjs');
const payload=JSON.stringify(event),secret='whsec_fixture',now=1800000000;
const sign=(text,body=payload)=>`t=${text},v1=${createHmac('sha256',secret).update(text+'.').update(body).digest('hex')}`;
test('strict timestamp, finite tolerance, timestamp window and rotation',async()=>{
 for(const timestamp of ['NaN','1800000000x','1e9','-1'])assert.throws(()=>Stripe.webhooks.constructEvent(payload,sign(timestamp),secret,300,undefined,now*1000));
 const valid=sign(String(now));assert.throws(()=>Stripe.webhooks.constructEvent(payload,valid+',t='+now,secret,300,undefined,now*1000));
 for(const tolerance of [NaN,Infinity,-1,'300'])assert.throws(()=>Stripe.webhooks.constructEvent(payload,valid,secret,tolerance,undefined,now*1000));
 for(const delta of [-301,301])assert.throws(()=>Stripe.webhooks.constructEvent(payload,sign(String(now+delta)),secret,300,undefined,now*1000));
 for(const delta of [-300,300])assert.deepEqual(Stripe.webhooks.constructEvent(payload,sign(String(now+delta)),secret,300,undefined,now*1000),event);
 assert.equal(Stripe.webhooks.signature.verifyHeader(payload,valid.replace(',v1=',',v0=')+',v1='+'0'.repeat(64)+','+valid.split(',')[1],secret,300,undefined,now*1000),true);
 assert.deepEqual(await Stripe.webhooks.constructEventAsync(payload,valid,secret,300,undefined,now*1000),event);
 assert.throws(()=>Stripe.webhooks.constructEvent(payload,valid,' ',300,undefined,now*1000));
 // Original controls: malformed and future timestamps are accepted upstream.
 assert.deepEqual(upstream.webhooks.constructEvent(payload,sign('NaN'),secret,300,undefined,now*1000),event);
 assert.deepEqual(upstream.webhooks.constructEvent(payload,sign(String(now+99999)),secret,300,undefined,now*1000),event);
});
test('signature authenticates original bytes, not UTF-8 replacement text',()=>{
 const bytes=Buffer.concat([Buffer.from('{"name":"'),Buffer.from([255]),Buffer.from('"}')]),normalized=bytes.toString('utf8'),header=sign(String(now),normalized);
 assert.deepEqual(upstream.webhooks.constructEvent(bytes,header,secret,300,undefined,now*1000),{name:'�'});
 assert.throws(()=>Stripe.webhooks.constructEvent(bytes,header,secret,300,undefined,now*1000),/does not match/);
 assert.throws(()=>Stripe.webhooks.constructEvent(bytes,sign(String(now),bytes),secret,300,undefined,now*1000),/encoded data|UTF-8/);
 const padded=Buffer.concat([Buffer.from('prefix'),Buffer.from(payload),Buffer.from('suffix')]),slice=padded.subarray(6,-6);
 assert.deepEqual(Stripe.webhooks.constructEvent(slice,sign(String(now)),secret,300,undefined,now*1000),event);
});
test('signed malformed JSON and thin notifications fail',()=>{
 for(const body of ['{',JSON.stringify({object:'v2.core.event'})])assert.throws(()=>Stripe.webhooks.constructEvent(body,sign(String(now),body),secret,300,undefined,now*1000));
});
test('form rejects cycles, nonfinite numbers and ambiguous keys before sending',async()=>{
 let calls=0;const stripe=new Stripe('sk_test_fixture',{fetch:async()=>{calls++;throw Error('unexpected transport');},maxNetworkRetries:0});
 const cyclic={};cyclic.a=cyclic;
 for(const value of [cyclic,{x:Infinity},{x:1n},{metadata:{'a[b]':'injection'}},Object.create({mode:'payment'}),{x:new Date()}])await assert.rejects(stripe.checkout.sessions.create(value),TypeError);
 assert.equal(calls,0);
 for(const config of [{timeout:Infinity},{timeout:0},{maxNetworkRetries:-1},{maxNetworkRetries:11},{protocol:'http'},{httpClient:{}}])assert.throws(()=>new Stripe('sk_test_fixture',config));
});
test('retry preserves serialized body, key and auth; request controls are immutable snapshots',async()=>{
 const seen=[];const changing={...params,metadata:{...params.metadata}};let attempt=0;
 const stripe=new Stripe('sk_test_fixture',{maxNetworkRetries:1,fetch:async(url,init)=>{
  seen.push({body:init.body,headers:{...init.headers}});if(++attempt===1){changing.metadata.userId='changed';init.headers.Authorization='overwritten';return new Response(JSON.stringify({error:{type:'api_error'}}),{status:503,headers:{'retry-after':'0.001'}});}return new Response(JSON.stringify(session));
 }});
 await stripe.checkout.sessions.create(changing);assert.equal(seen.length,2);assert.deepEqual(seen[0],seen[1]);assert.match(seen[0].body,/metadata%5BuserId%5D=test-user/);assert.match(seen[0].headers['Idempotency-Key'],/^vstripe-/);
 let requests=0;const refusal=new Stripe('sk_test_fixture',{fetch:async()=>{requests++;return new Response('{"error":{}}',{status:500,headers:{'stripe-should-retry':'false'}});}});await assert.rejects(refusal.checkout.sessions.create(params));assert.equal(requests,1);
});
test('network retry, opt-in 429 retry and retry exhaustion',async()=>{
 for(const cause of ['network','rate']){let calls=0;const stripe=new Stripe('sk_test_fixture',{maxNetworkRetries:1,fetch:async()=>{calls++;if(calls===1){if(cause==='network')throw Error('connection lost');return new Response('{"error":{}}',{status:429,headers:{'stripe-should-retry':'true','retry-after':'0.001'}});}return new Response(JSON.stringify(session));}});assert.equal((await stripe.checkout.sessions.create(params)).id,session.id);assert.equal(calls,2);}
 let calls=0;const stripe=new Stripe('sk_test_fixture',{maxNetworkRetries:0,fetch:async()=>{calls++;throw Error('connection lost');}});await assert.rejects(stripe.checkout.sessions.create(params),Stripe.errors.StripeConnectionError);assert.equal(calls,1);
});
test('response bounds, malformed response, abort and no credential-bearing redirect',async()=>{
 for(const reply of [()=>new Response('x'.repeat(200)),()=>new Response('{'),()=>new Response('null')]){const stripe=new Stripe('sk_test_fixture',{fetch:async()=>reply(),maxResponseBytes:100,maxNetworkRetries:0});await assert.rejects(stripe.checkout.sessions.create(params),Stripe.errors.StripeAPIError);}
 let target=0;const server=http.createServer((req,res)=>{if(req.url==='/target'){target++;res.end('{}');}else if(req.headers['idempotency-key']==='hang'){res.writeHead(200);res.write('{');}else{res.writeHead(307,{location:'/target'});res.end('{}');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const stripe=new Stripe('sk_test_fixture',{host:'127.0.0.1',port:server.address().port,protocol:'http',maxNetworkRetries:0,timeout:100});await assert.rejects(stripe.checkout.sessions.create(params),e=>e.statusCode===307);assert.equal(target,0);
  await assert.rejects(stripe.checkout.sessions.create(params,{idempotencyKey:'hang'}),Stripe.errors.StripeConnectionError);
  const controller=new AbortController();controller.abort(new Error('cancelled'));await assert.rejects(stripe.checkout.sessions.create(params,{signal:controller.signal}),/cancelled/);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('string JSON is parsed directly and preserves escaped Unicode',()=>{
 const body=JSON.stringify({name:'\ud800',emoji:'🎉'}),signature=sign(String(now),body);
 assert.deepEqual(Stripe.webhooks.constructEvent(body,signature,secret,300,undefined,now*1000),JSON.parse(body));
});
