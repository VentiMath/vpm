'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {GoogleAuth, JWTAccess, GoogleToken, OAuth2Client, UserRefreshClient, AuthClient} = require('..');
const jws = require('vjws');
const {TokenHandler} = require('../lib/gtoken/tokenHandler');
const fixture = path.resolve(__dirname,'../../../scripts/google-auth-conformance/upstream-11.3.2/test/fixtures');
const key = fs.readFileSync(path.join(fixture,'private.pem'),'utf8');
const publicKey = crypto.createPublicKey(key);
const ec = crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const bearer = headers => headers.get('authorization').slice(7);
const decoded = headers => jws.decode(bearer(headers));
const validClaims = () => ({iat:Math.floor(Date.now()/1000)-10,exp:Math.floor(Date.now()/1000)+1800,iss:'https://accounts.google.com',aud:'client-id',sub:'subject'});
const token = (payload=validClaims(),alg='RS256',secret=key) => jws.sign({header:{alg,typ:'JWT',kid:'test-key'},payload,secret});
const verify = (jwt,cert=publicKey,audience='client-id',maxExpiry) => new OAuth2Client().verifySignedJwtWithCertsAsync(jwt,{'test-key':cert},audience,['https://accounts.google.com'],maxExpiry);

test('self-signed JWT cache separates claim sets and snapshots mutable claims', () => {
  const client = new JWTAccess('service@example.test',key,'one');
  const claims = {tenant:'first',nested:{role:'reader'}};
  const a = client.getRequestHeaders('https://api.test',claims);
  claims.tenant='second'; claims.nested.role='writer';
  const b = client.getRequestHeaders('https://api.test',claims);
  assert.equal(decoded(a).payload.tenant,'first'); assert.equal(decoded(b).payload.tenant,'second');
  assert.equal(decoded(b).payload.nested.role,'writer'); assert.notEqual(bearer(a),bearer(b));
});
test('reserved claims, including falsy ones, are checked before a cache hit', () => {
  const client = new JWTAccess('service@example.test',key); client.getRequestHeaders('url');
  for (const [claim,value] of [['iss',''],['sub',null],['aud',false],['exp',0],['iat',0]]) {
    assert.throws(()=>client.getRequestHeaders('url',{[claim]:value}),/not allowed/);
  }
  assert.throws(()=>client.getRequestHeaders('url',{scope:''},'scope'),/not allowed/);
});
test('JWT cache keys cannot collide across URL and scope boundaries', () => {
  const client = new JWTAccess('service@example.test',key);
  const plain=client.getRequestHeaders('https://api.test/{"tenant":"x"}');
  const claimed=client.getRequestHeaders('https://api.test/',{tenant:'x'});
  assert.notEqual(bearer(plain),bearer(claimed));assert.equal(decoded(claimed).payload.tenant,'x');
  assert.notEqual(client.getCachedKey('a_b','c'),client.getCachedKey('a','b_c'));
  assert.notEqual(client.getCachedKey('a',['b_c','d']),client.getCachedKey('a',['b','c_d']));
  assert.equal(decoded(client.getRequestHeaders('a_b',undefined,'c')).payload.scope,'c');
  assert.equal(decoded(client.getRequestHeaders('a',undefined,'b_c')).payload.scope,'b_c');
});
test('credentials and key IDs invalidate JWT cache and key parsing state', () => {
  const client = new JWTAccess('first@example.test',key,'one');
  client.getRequestHeaders('url'); client.email='second@example.test';client.keyId='two';
  const result=decoded(client.getRequestHeaders('url'));
  assert.equal(result.payload.iss,'second@example.test');assert.equal(result.header.kid,'two');
  const replacement=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  client.key=replacement.privateKey.export({format:'pem',type:'pkcs8'});
  const signed=bearer(client.getRequestHeaders('url'));
  assert.equal(jws.verify(signed,'RS256',replacement.publicKey),true);
  assert.equal(jws.verify(signed,'RS256',publicKey),false);
});
test('mutating the first returned Headers cannot poison the JWT cache', () => {
  const client=new JWTAccess('service@example.test',key);
  const first=client.getRequestHeaders('url'),original=first.get('authorization');
  first.set('authorization','changed');first.set('x-secret','leak');
  const next=client.getRequestHeaders('url');assert.equal(next.get('authorization'),original);assert.equal(next.has('x-secret'),false);
});
test('forced concurrent token refreshes share one exchange and failures remain retryable', async () => {
  let calls=0,release;
  const options={key,email:'service@example.test',iss:'service@example.test',transporter:{request:async()=>{calls++;await new Promise(resolve=>release=resolve);return {data:{access_token:'fresh',expires_in:3600}};}}};
  const client=new GoogleToken(options);
  const pending=Array.from({length:16},()=>client.getToken({forceRefresh:true}));
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);release();
  const results=await Promise.all(pending);assert(results.every(r=>r.access_token==='fresh'));
  await client.getToken();assert.equal(calls,1);
  options.transporter.request=async()=>{calls++;throw new Error('offline');};
  await assert.rejects(client.getToken({forceRefresh:true}),/offline/);
  options.transporter.request=async()=>({data:{access_token:'recovered',expires_in:3600}});
  assert.equal((await client.getToken({forceRefresh:true})).access_token,'recovered');
});
test('malformed token responses never enter the cache', async () => {
  for(const data of [null,[],{}, {access_token:123}, ...[null,NaN,Infinity,-1,'3600',1e308].map(expires_in=>({access_token:'token',expires_in}))]) {
    const handler=new TokenHandler({key,iss:'service@example.test',transporter:{request:async()=>({data})}});
    await assert.rejects(handler.getToken(),/Invalid token/);assert.equal(handler.token,undefined);assert.equal(handler.inFlightRequest,undefined);
  }
  const handler=new TokenHandler({key,iss:'service@example.test',transporter:{request:async()=>({data:{id_token:'identity'}})}});
  assert.equal((await handler.getToken()).id_token,'identity');assert.equal(handler.isTokenExpiring(),true);
});
test('revocation returns a promise, keeps tokens out of URLs, and clears only after success', async () => {
  let fail=true,revocation;
  const client=new GoogleToken({key,iss:'service@example.test',transporter:{request:async opts=>{
    if(String(opts.url).endsWith('/revoke')) {revocation=opts;if(fail)throw new Error('offline');return {data:{}};}
    return {data:{access_token:'secret&value=1',expires_in:3600}};
  }}});
  await client.getToken();await assert.rejects(client.revokeToken(),/offline/);assert.equal(client.accessToken,'secret&value=1');
  fail=false;await client.revokeToken();assert.equal(client.accessToken,undefined);
  assert.equal(revocation.method,'POST');assert.equal(revocation.url,'https://oauth2.googleapis.com/revoke');assert.equal(revocation.data.get('token'),'secret&value=1');
  await new Promise(resolve=>client.revokeToken(error=>{assert.match(error.message,/No token/);resolve();}));
});
test('valid RSA and EC ID tokens, PEM and JWK certificates, audience lists', async () => {
  assert.equal((await verify(token())).getUserId(),'subject');
  const signed=token(validClaims(),'ES256',ec.privateKey);
  assert.equal((await verify(signed,ec.publicKey,['other','client-id'])).getPayload().aud,'client-id');
  assert.equal((await verify(signed,ec.publicKey.export({format:'jwk'}))).getUserId(),'subject');
});
test('ID tokens reject algorithm/key disagreement, noncanonical encoding and missing own certificates', async () => {
  const good=token();const parts=good.split('.');
  await assert.rejects(verify(parts[0]+'=.'+parts[1]+'.'+parts[2]),/parse/);
  const signingInput=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url')+'.'+parts[1];
  const mismatched=signingInput+'.'+crypto.sign('sha256',Buffer.from(signingInput),{key:ec.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
  await assert.rejects(verify(mismatched,ec.publicKey),/signature/);
  await assert.rejects(new OAuth2Client().verifySignedJwtWithCertsAsync(good,Object.create({'test-key':publicKey})),/No pem/);
  await assert.rejects(verify(token(validClaims(),'HS256','secret')),/algorithm/);
});
test('ID token time, issuer and audience validation is strict and diagnostic messages omit claims', async () => {
  const base=validClaims();
  const cases=[{...base,iat:'1'},{...base,exp:String(base.exp)},{...base,exp:base.iat},{...base,iat:base.exp+1},{...base,iat:base.exp-1},{...base,exp:base.iat-1000},{...base,exp:base.exp+90000},{...base,iss:'private-issuer'},{...base,aud:'private-audience'}];
  for(const claims of cases) {
    claims.secret='private-claim';const signed=token(claims);
    await assert.rejects(verify(signed),error=>{assert.doesNotMatch(error.message,/private-|eyJ/);assert(!error.message.includes(signed));return true;});
  }
  for(const expiry of [NaN,Infinity,-1,0,'300'])await assert.rejects(verify(token(),publicKey,'client-id',expiry),/maximum/);
  for(const malformed of ['secret','a.b.c', 'x'.repeat(1024*1024+1)])await assert.rejects(verify(malformed),error=>error.message.length<100);
});
test('debug interceptors log static lifecycle messages and preserve response/error identity', async () => {
  const logs=[],original=AuthClient.log;AuthClient.log={debug:(...args)=>logs.push(args)};
  const config={url:new URL('https://example.test/?token=secret'),headers:new Headers({authorization:'Bearer secret'})};
  AuthClient.setMethodName(config,'secret-method');const response={config,data:{access_token:'secret'}};const error={config,response};
  try {
    assert.equal(await AuthClient.DEFAULT_REQUEST_INTERCEPTOR.resolved(config),config);
    assert.equal(await AuthClient.DEFAULT_RESPONSE_INTERCEPTOR.resolved(response),response);
    await assert.rejects(AuthClient.DEFAULT_RESPONSE_INTERCEPTOR.rejected(error),e=>e===error);
    assert.deepEqual(logs,[['Authentication request'],['Authentication response'],['Authentication request error']]);
    assert(config.headers.has('x-goog-api-client'));assert(config.headers.has('user-agent'));
  } finally {AuthClient.log=original;}
});
test('GoogleAuth service credentials support SDK headers, project lookup and Cloud Storage signing', async () => {
  const auth=new GoogleAuth({credentials:{type:'service_account',client_email:'service@example.test',private_key:key,project_id:'project'},scopes:['scope']});
  const client=await auth.getClient();client.useJWTAccessWithScope=true;
  assert.equal(await auth.getProjectId(),'project');assert.equal((await auth.getCredentials()).client_email,'service@example.test');
  const headers=await auth.getRequestHeaders('https://storage.googleapis.com');assert.equal(jws.verify(bearer(headers),'RS256',publicKey),true);
  const signature=await auth.sign('storage-signing-input');assert.equal(crypto.verify('sha256',Buffer.from('storage-signing-input'),publicKey,Buffer.from(signature,'base64')),true);
});
test('OAuth refresh and authenticated HTTP use the native-fetch VPM transport', async () => {
  let refreshes=0,requests=0;
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/token') {let body='';for await(const chunk of req)body+=chunk;const params=new URLSearchParams(body);assert.equal(params.get('grant_type'),'refresh_token');assert.equal(params.get('refresh_token'),'refresh-secret');refreshes++;res.setHeader('content-type','application/json');res.end(JSON.stringify({access_token:'access-secret',expires_in:3600,token_type:'Bearer'}));}
    else {assert.equal(req.headers.authorization,'Bearer access-secret');requests++;res.setHeader('content-type','application/json');res.end('{"ok":true}');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const client=new UserRefreshClient({clientId:'id',clientSecret:'client-secret',refreshToken:'refresh-secret',endpoints:{oauth2TokenUrl:url+'/token'}});
  try {
    const responses=await Promise.all(Array.from({length:8},()=>client.request({url:url+'/data',proxy:false})));
    assert(responses.every(r=>r.data.ok));assert.equal(refreshes,1);assert.equal(requests,8);
    assert.equal((await client.fetch(url+'/data',{proxy:false})).status,200);assert.equal(refreshes,1);
  } finally {client.transporter.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('JWT cache expiration still refreshes while keeping at most 500 entries', () => {
  const original=Date.now;let now=original();Date.now=()=>now;
  try {
    const client=new JWTAccess('service@example.test',key);
    const first=decoded(client.getRequestHeaders('url')).payload;
    now+=3600000;
    const next=decoded(client.getRequestHeaders('url')).payload;
    assert.equal(next.iat-first.iat,3600);assert.equal(next.exp-first.exp,3600);
    for(let i=0;i<501;i++)client.getRequestHeaders('url/'+i);
    assert.equal(client.cache.size,500);
  } finally {Date.now=original;}
});
test('GoogleToken key-file credentials supply the issuer before signing', async () => {
  const directory=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'vpm-auth-key-'));
  const filename=path.join(directory,'credentials.json');
  fs.writeFileSync(filename,JSON.stringify({private_key:key,client_email:'file@example.test'}));
  try {
    const client=new GoogleToken({keyFile:filename,transporter:{request:async options=>{
      const assertion=options.data.get('assertion');assert.equal(jws.decode(assertion,{json:true}).payload.iss,'file@example.test');
      return {data:{access_token:'token',expires_in:3600}};
    }}});
    assert.equal((await client.getToken()).access_token,'token');
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
});
test('a completed revocation cannot clear a newer access token', async () => {
  let release,n=0;
  const client=new GoogleToken({key,iss:'service@example.test',transporter:{request:async options=>{
    if(String(options.url).endsWith('/revoke'))await new Promise(resolve=>release=resolve);
    return {data:{access_token:'token-'+(++n),expires_in:3600}};
  }}});
  await client.getToken();const pending=client.revokeToken();
  await client.getToken({forceRefresh:true});assert.equal(client.accessToken,'token-2');
  release();await pending;assert.equal(client.accessToken,'token-2');
});
