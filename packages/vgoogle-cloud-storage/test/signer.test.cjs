'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{generateKeyPairSync,sign,verify,createHash}=require('node:crypto');
const Own=require('../lib/signer').URLSigner,Original=require('../../../scripts/storage-conformance/node_modules/@google-cloud/storage/build/cjs/src/signer').URLSigner;
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const now=Math.floor(Date.now()/1000)*1000;
function verifier(signed,version){const url=new URL(signed);
 if(version==='v2'){const text=['GET','','',url.searchParams.get('Expires'),url.pathname].join('\n');return verify('RSA-SHA256',Buffer.from(text),publicKey,Buffer.from(url.searchParams.get('Signature'),'base64'));}
 const signature=url.searchParams.get('X-Goog-Signature');url.searchParams.delete('X-Goog-Signature');
 const query=[...url.searchParams].map(([k,v])=>[encode(k),encode(v)]).sort((a,b)=>a[0]<b[0]?-1:1).map(([k,v])=>k+'='+v).join('&');
 const canonical=['GET',url.pathname,query,'host:'+url.host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
 const scope=url.searchParams.get('X-Goog-Credential').split('/').slice(1).join('/');
 const text=['GOOG4-RSA-SHA256',url.searchParams.get('X-Goog-Date'),scope,createHash('sha256').update(canonical).digest('hex')].join('\n');
 return verify('RSA-SHA256',Buffer.from(text),publicKey,Buffer.from(signature,'hex'));
}
function auth(){return {getCredentials:async()=>({client_email:'test@example.com'}),sign:async text=>sign('RSA-SHA256',Buffer.from(text),privateKey).toString('base64')};}
const storage={apiEndpoint:'https://storage.googleapis.com',universeDomain:'googleapis.com'};
test('destination and signed resource are stable while caller URL and bucket mutate',async()=>{
 for(const Impl of [Original,Own])for(const version of ['v2','v4']){
  let release;const provider=auth();provider[version==='v2'?'sign':'getCredentials']=version==='v2'?async text=>{await new Promise(r=>release=r);return sign('RSA-SHA256',Buffer.from(text),privateKey).toString('base64');}:async()=>{await new Promise(r=>release=r);return {client_email:'test@example.com'};};
  const bucket={name:'original'},host=new URL('https://downloads.example:8443'),signer=new Impl(provider,bucket,{name:'docs/café.pdf'},storage);
  const result=signer.getSignedUrl({method:'GET',version,host,expires:now+3600000,accessibleAt:now});
  bucket.name='changed';host.hostname='changed.example';release();const signed=await result;
  assert.equal(verifier(signed,version),Impl===Own);
  if(Impl===Own){assert.equal(new URL(signed).host,'downloads.example:8443');assert.ok(new URL(signed).pathname.startsWith('/original/'));}
 }
});
test('one authentication provider owns credentials and signing across an await',async()=>{
 for(const Impl of [Original,Own]){
  let release,originalCalls=0,replacementCalls=0;const provider=auth();provider.getCredentials=()=>new Promise(r=>release=()=>r({client_email:'original@example.com'}));provider.sign=async()=>{originalCalls++;return 'YWJj';};
  const signer=new Impl(provider,{name:'bucket'},{name:'file'},storage),pending=signer.getSignedUrl({method:'GET',version:'v4',expires:now+3600000,accessibleAt:now});
  signer.auth={getCredentials:async()=>({client_email:'other@example.com'}),sign:async()=>{replacementCalls++;return 'YWJj';}};release();await pending;
  assert.equal(originalCalls,Impl===Own?1:0);assert.equal(replacementCalls,Impl===Own?0:1);
 }
});
test('query getter is read once and the captured record is validated',async()=>{
 let reads=0;const signer=new Own(auth(),{name:'bucket'},{name:'file'},storage);
 const signed=await signer.getSignedUrl({method:'GET',expires:now+3600000,get queryParams(){reads++;return reads===1?{download:'yes'}:{Signature:'forged'};}});
 assert.equal(reads,1);assert.notEqual(new URL(signed).searchParams.get('Signature'),'forged');assert.equal(verifier(signed,'v2'),true);
 assert.throws(()=>signer.getSignedUrl({method:'GET',expires:now+3600000,queryParams:{'x-GoOg-Signature':'bad'}}),/cannot override/);
});
test('frozen direct V4 configuration is not mutated and its Date is captured',async()=>{
 const date=new Date(now);let release;const provider=auth();provider.getCredentials=()=>new Promise(r=>release=()=>r({client_email:'test@example.com'}));
 const signer=new Own(provider,{name:'bucket'},undefined,storage);
 const options=Object.freeze({method:'GET',bucket:'bucket',file:'file',expiration:now/1000+3600,accessibleAt:date,extensionHeaders:Object.freeze({})});
 const pending=signer.getSignedUrlV4(options);date.setUTCFullYear(2040);release();const result=await pending;
 assert.equal(result['X-Goog-Date'].slice(0,4),String(new Date(now).getUTCFullYear()));assert.equal(result['X-Goog-Expires'],'3600');
});
test('all app-used signed-download forms still verify independently',async()=>{
 for(const version of ['v2','v4'])for(const name of ['writeups/result.pdf','boarding passes/a #1.pdf','payments/café.pdf','scoresheets/表.pdf']){
  const signer=new Own(auth(),{name:'fixture-bucket'},{name},storage);
  const signed=await signer.getSignedUrl({version,method:'GET',expires:now+3600000,accessibleAt:now});assert.equal(verifier(signed,version),true);
 }
});
