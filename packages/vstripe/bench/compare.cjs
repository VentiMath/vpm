'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),{createHmac}=require('node:crypto');
const upstream=path.resolve(__dirname,'../../../scripts/stripe-conformance/node_modules/stripe'),vpm=path.resolve(__dirname,'..'),{params,session,event}=require('../../../scripts/stripe-conformance/fixtures.cjs');
const cases=[{name:'construct scoped client',make:file=>{const Stripe=require(file);return()=>new Stripe('sk_test_fixture');},validate:client=>assert.equal(typeof client.checkout.sessions.create,'function')}];
for(const format of ['string','bytes'])for(const large of [false,true])cases.push({name:`verify ${large?'32 KiB':'Checkout'} ${format} event`,make:file=>{
 const Stripe=require(file),client=new Stripe('sk_test_fixture'),text=JSON.stringify(large?{...event,padding:'x'.repeat(32768)}:event),body=format==='bytes'?Buffer.from(text):text,secret='whsec_fixture',timestamp=Math.floor(Date.now()/1000),sig=`t=${timestamp},v1=${createHmac('sha256',secret).update(timestamp+'.').update(text).digest('hex')}`;
 return()=>client.webhooks.constructEvent(body,sig,secret);
},validate:value=>assert.equal(value.data.object.id,session.id)});
cases.push({name:'Checkout request pipeline / synthetic Fetch',async:true,make:file=>{
 const Stripe=require(file),transport=async(url,init)=>new Response(JSON.stringify(session),{headers:{'request-id':'req_fixture','content-type':'application/json'}});
 const client=new Stripe('sk_test_fixture',file===upstream?{httpClient:Stripe.createFetchHttpClient(transport),maxNetworkRetries:0}:{fetch:transport,maxNetworkRetries:0});
 return()=>client.checkout.sessions.create(params,{idempotencyKey:'fixture-order'});
},validate:value=>{assert.equal(value.url,session.url);assert.equal(value.lastResponse.requestId,'req_fixture');}});
require('../../../scripts/bench-process.cjs').run({root:vpm,upstream,vpm,cases,files:['index.cjs','index.mjs','index.d.ts','index.d.cts','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/stripe-conformance/fixtures.cjs','../../scripts/stripe-conformance/package-lock.json','../../scripts/stripe-conformance/node_modules/stripe']}).catch(e=>{console.error(e);process.exitCode=1});
