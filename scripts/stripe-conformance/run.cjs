'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),{createHmac}=require('node:crypto');
const variant=process.argv[2]??'vpm',Stripe=variant==='vpm'?require('../../packages/vstripe'):require(require('node:path').join(__dirname,'node_modules',variant==='app'?'stripe-app':'stripe','cjs/stripe.cjs.node.js')),{params,session,event}=require('./fixtures.cjs');
(async()=>{
 const bytes=Buffer.from(JSON.stringify(event)),secret='whsec_fixture',timestamp=Math.floor(Date.now()/1000),digest=createHmac('sha256',secret).update(timestamp+'.').update(bytes).digest('hex'),signature=`t=${timestamp},v1=${digest}`;
 const client=new Stripe('sk_test_fixture');assert.deepEqual(client.webhooks.constructEvent(bytes,signature,secret),event);assert.deepEqual(await client.webhooks.constructEventAsync(bytes,signature,secret),event);
 assert.equal(client.webhooks.generateTestHeaderString({payload:bytes.toString(),secret,timestamp}),signature);
 assert.equal(client.webhooks.signature.verifyHeader(bytes,signature+',v1='+'0'.repeat(64),secret),true);
 assert.throws(()=>client.webhooks.constructEvent(Buffer.concat([bytes,Buffer.from(' ')]),signature,secret));
 assert.throws(()=>client.webhooks.constructEvent(bytes,signature,'whsec_wrong'));
 assert.throws(()=>client.webhooks.constructEvent(event,signature,secret));
 assert.throws(()=>client.webhooks.constructEvent(bytes,signature,secret,300,undefined,(timestamp+301)*1000));
 if(variant==='app')assert.throws(()=>client.webhooks.constructEvent(bytes,signature,secret,0,undefined,(timestamp+1000)*1000));
 else assert.deepEqual(client.webhooks.constructEvent(bytes,signature,secret,0,undefined,(timestamp+1000)*1000),event);
 assert.throws(()=>client.webhooks.constructEvent(bytes,'t='+timestamp+',v0='+digest,secret));
 const requests=[];let response={code:200,body:session,headers:{'request-id':'req_fixture'}};
 const server=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;requests.push({url:req.url,method:req.method,headers:req.headers,body});const next=response;res.writeHead(next.code,{'content-type':'application/json',...next.headers});res.end(JSON.stringify(next.body));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const stripe=new Stripe('sk_test_fixture',{host:'127.0.0.1',port:server.address().port,protocol:'http',maxNetworkRetries:0,apiVersion:'2026-10-28.endive'});
  const result=await stripe.checkout.sessions.create(params,{idempotencyKey:'fixture-request'});assert.equal(result.url,session.url);assert.equal(result.lastResponse.requestId,'req_fixture');assert.equal(result.lastResponse.statusCode,200);
  const request=requests.at(-1);assert.equal(request.url,'/v1/checkout/sessions');assert.equal(request.method,'POST');assert.equal(request.headers.authorization,'Bearer sk_test_fixture');assert.equal(request.headers['idempotency-key'],'fixture-request');assert.equal(request.headers['stripe-version'],'2026-10-28.endive');
  const form=new URLSearchParams(request.body);assert.equal(form.get('line_items[0][price_data][product_data][description]'),'A & B / 例');assert.equal(form.get('line_items[0][price_data][unit_amount]'),'2500');assert.equal(form.get('metadata[userId]'),'test-user');assert.equal(form.get('success_url'),params.success_url);assert.equal(form.get('payment_method_types[0]'),'card');assert.deepEqual(Object.fromEntries(form),{'payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd','line_items[0][price_data][product_data][name]':'Fixture – Lesson','line_items[0][price_data][product_data][description]':'A & B / 例','line_items[0][price_data][unit_amount]':'2500','line_items[0][quantity]':'1',mode:'payment',success_url:params.success_url,cancel_url:params.cancel_url,'metadata[userId]':'test-user','metadata[paymentOptionId]':'lesson','metadata[paymentOptionName]':'Lesson'});
  for(const [code,type,kind] of [[400,'invalid_request_error','StripeInvalidRequestError'],[401,'api_error','StripeAuthenticationError'],[403,'api_error','StripePermissionError'],[429,'api_error','StripeRateLimitError'],[500,'api_error','StripeAPIError'],[402,'card_error','StripeCardError']]){
   response={code,body:{error:{type,message:'Fixture rejection',code:'fixture_error',param:'line_items'}},headers:{'request-id':'req_failed'}};
   await assert.rejects(stripe.checkout.sessions.create(params),error=>{assert.equal(error.type,kind);assert.equal(error.statusCode,code);assert.equal(error.code,'fixture_error');assert.equal(error.requestId,'req_failed');return true;});
  }
  console.log(variant,'Checkout wire encoding, metadata, errors and signed snapshot webhooks pass');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
