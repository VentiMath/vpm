'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-stripe-archive-'));
function run(cmd,args,cwd=temp){const result=spawnSync(cmd,args,{cwd,encoding:'utf8',timeout:120000,env:{...process.env,npm_config_cache:path.join(temp,'npm-cache'),BUN_INSTALL_CACHE_DIR:path.join(temp,'bun-cache')}});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout;}
try{
 const pkg=path.join(root,'packages/vstripe');run('bun',['pm','pack','--ignore-scripts','--destination',temp,'--quiet'],pkg);const archive=path.join(temp,'vstripe-23.1.0.tgz');assert.doesNotMatch(run('tar',['-tzf',archive]),/\/(?:test|bench|node_modules)\//);
 for(const manager of ['npm','bun']){
  const cwd=path.join(temp,manager);fs.mkdirSync(cwd);fs.writeFileSync(path.join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{vstripe:'file:'+archive}}));run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.mjs'),`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import Stripe,{Stripe as Named} from 'vstripe';assert.equal(Stripe,Named);assert.equal(Stripe,createRequire(import.meta.url)('vstripe'));const stripe=new Stripe('sk_test_fixture',{fetch:async()=>new Response('{"id":"cs_test"}')});const result=await stripe.checkout.sessions.create({mode:'payment'});assert.equal(result.id,'cs_test');const payload='{"id":"evt_test"}',secret='whsec_fixture';const header=stripe.webhooks.generateTestHeaderString({payload,secret});assert.equal(stripe.webhooks.constructEvent(payload,header,secret).id,'evt_test');assert.equal((await stripe.webhooks.constructEventAsync(new TextEncoder().encode(payload),header,secret)).id,'evt_test');`);
  for(const runtime of ['node','bun'])run(runtime,['consumer.mjs'],cwd);
  fs.writeFileSync(path.join(cwd,'consumer.ts'),`import Stripe,{type SessionCreateParams,type StripeEvent} from 'vstripe';const stripe=new Stripe('sk_test_fixture');const params:SessionCreateParams={mode:'payment',line_items:[{price_data:{currency:'usd',unit_amount:2500,product_data:{name:'Lesson'}},quantity:1}],metadata:{userId:'fixture'}};const result=await stripe.checkout.sessions.create(params,{idempotencyKey:'order'});const url:string|null=result.url;const event:StripeEvent=stripe.webhooks.constructEvent(new Uint8Array(),'t=1,v1=f','whsec_fixture');const id:string=event.data.object.id;
// @ts-expect-error typo in mode
stripe.checkout.sessions.create({mode:'payments'});
// @ts-expect-error raw payload must be bytes or string
stripe.webhooks.constructEvent({},'header','secret');
// @ts-expect-error other SDK resources are not implemented
stripe.customers.create({});`);
  fs.writeFileSync(path.join(cwd,'consumer.cts'),`import Stripe = require('vstripe');const stripe=new Stripe('sk_test_fixture');const other=new Stripe.Stripe('sk_test_fixture');const params:Stripe.SessionCreateParams={mode:'payment'};stripe.checkout.sessions.create(params);`);
  for(const resolution of ['NodeNext','Bundler']){fs.writeFileSync(path.join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:resolution==='Bundler'?'ESNext':resolution,moduleResolution:resolution,lib:['ES2022'],types:[]},files:resolution==='NodeNext'?['consumer.ts','consumer.cts']:['consumer.ts']}));run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig.json'],cwd);}
 }
 console.log('Clean npm/Bun archives: Node/Bun CJS/ESM Checkout and webhooks, TS7 NodeNext/Bundler without Node/DOM declaration dependencies pass.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
