'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { once } = require('node:events');
const jwks = require('..');
const jwt = require('../../vjsonwebtoken');
const { keys } = require('../../vjwa/test/helpers.cjs');
const { Cache, RateLimit } = require('../lib/state');
const rsa = { ...keys.RSA.publicKey.export({format:'jwk'}), kid:'rsa', alg:'RS256' };
const ec = { ...keys.ES256.publicKey.export({format:'jwk'}), kid:'ec', alg:'ES256' };
const make = (input = [rsa], options = {}) => jwks({fetcher:async()=>({keys:input}), ...options});
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function server(t, handler) {
  const value = http.createServer(handler); value.listen(0,'127.0.0.1'); await once(value,'listening');
  t.after(()=>new Promise(resolve=>{value.closeAllConnections();value.close(resolve);}));
  return 'http://127.0.0.1:'+value.address().port+'/keys';
}
test('public API exposes callable factory, class and native Error subclasses', async()=>{
  assert(make() instanceof jwks.JwksClient);
  for(const name of ['ArgumentError','JwksError','JwksRateLimitError','SigningKeyNotFoundError']) {
    const error=new jwks[name]('message');assert(error instanceof Error);assert.equal(error.name,name);assert.match(error.stack,/message/);
  }
  const esm=await import('../index.js');assert.equal(esm.JwksClient,jwks.JwksClient);assert.equal(esm.default,jwks);
});
test('imports all supported RSA, EC and OKP signing families with native crypto',async()=>{
  const inputs=[rsa,ec];
  for(const [crv,alg] of [['P-384','ES384'],['P-521','ES512']]) {
    inputs.push({...require('./public-keys.json')[crv],kid:crv,alg});
  }
  inputs.push({...require('./public-keys.json').ed25519,kid:'ed25519',alg:'EdDSA'});
  const result=await make(inputs).getSigningKeys();assert.equal(result.length,inputs.length);
  for(let i=0;i<inputs.length;i++) {
    assert.deepEqual(crypto.createPublicKey(result[i].getPublicKey()).export({format:'jwk'}),crypto.createPublicKey({key:inputs[i],format:'jwk'}).export({format:'jwk'}));
    assert.equal(result[i].publicKey,result[i].rsaPublicKey);assert(Object.isFrozen(result[i]));
  }
});
for(const [name,alg] of [['secp256k1','ES256K'],['ed448','EdDSA']]) test(name+' follows native import support without accepting an invalid key',async()=>{
  const input={...require('./public-keys.json')[name],kid:name,alg};
  let native;
  try {native=crypto.createPublicKey({key:input,format:'jwk'});}catch(error){
    assert(process.versions.bun);assert.equal(error.code,'ERR_CRYPTO_INVALID_JWK');
    await assert.rejects(make([input]).getSigningKeys(),/did not contain any signing keys/);return;
  }
  assert.equal((await make([input]).getSigningKey(name)).publicKey,native.export({format:'pem',type:'spki'}));
});
test('exports one stable PEM and immutable metadata per cached key',async()=>{
  const c=make(), key=await c.getSigningKey('rsa'), pem=key.getPublicKey();
  assert.throws(()=>{key.kid='changed';},TypeError);assert.throws(()=>{key.getPublicKey=()=>'';},TypeError);
  assert.equal((await c.getSigningKey('rsa')),key);assert.equal(key.publicKey,pem);
});
test('requires canonical JWK encodings, correct curve sizes and algorithm families',async()=>{
  for(const bad of [{...rsa,n:rsa.n+'='},{...rsa,n:'A'},{...rsa,e:'AAEAAQ'},{...ec,x:ec.x.slice(1)},{...rsa,alg:'ES256'},{...ec,alg:'RS256'},{...rsa,alg:'none'},{...ec,crv:'constructor'}]) {
    const result=await make([bad,rsa]).getSigningKeys();assert.equal(result.length,1);assert.equal(result[0].kid,'rsa');
  }
});
test('excludes private, symmetric, encryption and incompatible key_ops keys',async()=>{
  const privateJwk=keys.RSA.privateKey.export({format:'jwk'});
  for(const bad of [privateJwk,{...rsa,use:'enc'},{...rsa,key_ops:['sign']},{...rsa,key_ops:['verify','sign']},{kty:'oct',k:'aGVsbG8'}]) {
    await assert.rejects(make([bad]).getSigningKeys(),/did not contain any signing keys/);
  }
  assert.equal((await make([{...rsa,key_ops:['verify']}]).getSigningKeys()).length,1);
});
test('rejects every nonzero unused base64url bit without decoding each field twice',async()=>{
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  for(const [jwk,field] of [[rsa,'n'],[ec,'x'],[ec,'y']]) {
    const value=jwk[field], bits=value.length%4===2?4:2;
    assert.equal(alphabet.indexOf(value.at(-1)) & ((1<<bits)-1),0);
    for(let tail=1;tail<(1<<bits);tail++) {
      const changed=value.slice(0,-1)+alphabet[alphabet.indexOf(value.at(-1))|tail];
      assert.deepEqual(Buffer.from(changed,'base64url'),Buffer.from(value,'base64url'));
      await assert.rejects(make([{...jwk,[field]:changed}]).getSigningKeys(),/did not contain any signing keys/);
    }
  }
  let coerced=false;
  await assert.rejects(make([{...ec,crv:{toString(){coerced=true;return 'P-256';}}}]).getSigningKeys());
  assert.equal(coerced,false);
});
test('malformed entries do not discard valid siblings or invoke inherited JWK fields',async()=>{
  const inherited=Object.create(rsa);let reads=0;const getter={get kty(){reads++;throw Error('getter');}};
  assert.equal((await make([null,7,[],inherited,getter,rsa]).getSigningKeys()).length,1);assert.equal(reads,1);
});
test('ambiguous IDs fail closed, including duplicate empty IDs',async()=>{
  await assert.rejects(make([rsa,{...ec,kid:'rsa'}]).getSigningKeys(),/duplicate signing key IDs/);
  await assert.rejects(make([{...rsa,kid:''},{...ec,kid:''}]).getSigningKey(''),/duplicate signing key IDs/);
});
test('missing, empty and prototype-like key IDs stay distinct',async()=>{
  const c=make([{...rsa,kid:''},{...rsa,kid:'__proto__'},{...rsa,kid:'constructor'}]);
  assert.equal((await c.getSigningKey('')).kid,'');assert.equal((await c.getSigningKey('__proto__')).kid,'__proto__');
  await assert.rejects(c.getSigningKey(),/No KID specified/);await assert.rejects(c.getSigningKey(null),/No KID specified/);
  assert.equal((await make().getSigningKey()).kid,'rsa');await assert.rejects(make().getSigningKey(''),jwks.SigningKeyNotFoundError);
});
test('validates kid before fetching',async()=>{
  let calls=0;const c=make([], {fetcher:()=>{calls++;return {keys:[rsa]};}});
  for(const id of [0,false,{},[], 'x'.repeat(1025)])await assert.rejects(c.getSigningKey(id),jwks.ArgumentError);
  assert.equal(calls,0);
});
test('validates response shape and key limits for custom fetchers',async()=>{
  for(const document of [null,[],{}, {keys:{}}, {keys:'x'}]) await assert.rejects(make([], {fetcher:()=>document}).getKeys(),jwks.JwksError);
  await assert.rejects(make([rsa,ec],{maxKeys:1}).getKeys(),/maxKeys/);
  await assert.rejects(make([]).getSigningKeys(),/did not contain any keys/);
});
test('options snapshot own fields and preserve later caller mutations',async()=>{
  let reads=0;const headers={'x-test':'one'};const opts={fetcher:async()=>({keys:[rsa]}),requestHeaders:headers,get cache(){reads++;return true;}};
  const c=jwks(opts);headers['x-test']='two';opts.fetcher=()=>({keys:[]});
  assert.equal(c.options.requestHeaders['x-test'],'one');assert(Object.isFrozen(c.options));assert.equal(reads,1);assert.equal((await c.getSigningKey()).kid,'rsa');
  assert.throws(()=>jwks(Object.create({fetcher:()=>({keys:[rsa]})})),jwks.ArgumentError);
});
test('invalid limits, callbacks, headers and URI configuration fail explicitly',()=>{
  for(const opts of [{cache:1},{rateLimit:'yes'},{cacheMaxEntries:-1},{cacheMaxAge:NaN},{timeout:Infinity},{maxKeys:0},{maxResponseBytes:0},{jwksRequestsPerMinute:0},{fetcher:1},{getKeysInterceptor:1},{proxy:'http://proxy'}, {requestHeaders:{a:1}},{requestHeaders:{'bad\n':'x'}}])assert.throws(()=>make([],opts));
  for(const uri of ['file:///keys','ftp://host/keys','http://user:pass@host','http://host/#x','not-url'])assert.throws(()=>jwks({jwksUri:uri}),jwks.ArgumentError);
  assert.throws(()=>make().getSigningKey('rsa',true),TypeError);
});
test('LRU cache has fixed expiry, zero disables caching and oldest entries are evicted',()=>{
  let now=0;const c=new Cache(2,100,()=>now);c.set('a',1);c.set('b',2);assert.equal(c.get('a'),1);c.set('c',3);assert.equal(c.get('b'),undefined);
  now=99;assert.equal(c.get('a'),1);now=100;assert.equal(c.get('a'),undefined);
  const disabled=new Cache(5,0,()=>now);disabled.set('a',1);assert.equal(disabled.get('a'),undefined);
});
test('cache expiry refreshes rotating keys and failures do not poison future reads',async()=>{
  let calls=0;const c=make([], {cacheMaxAge:5,fetcher:()=>{calls++;if(calls===2)throw Error('offline');return {keys:[calls===1?rsa:{...ec,kid:'rsa'}]};}});
  const first=await c.getSigningKey('rsa');await delay(12);await assert.rejects(c.getSigningKey('rsa'),/offline/);
  assert.notEqual((await c.getSigningKey('rsa')).publicKey,first.publicKey);assert.equal(calls,3);
});
test('cache false and zero limits perform fresh sequential fetches',async()=>{
  for(const options of [{cache:false},{cacheMaxEntries:0},{cacheMaxAge:0}]){
    let count=0;const c=make([], {...options,fetcher:()=>{count++;return {keys:[rsa]};}});
    await c.getSigningKey();await c.getSigningKey();assert.equal(count,2);
  }
});
test('concurrent different-kid lookups share one fetch/import and independent output arrays',async()=>{
  let calls=0;const c=make([], {fetcher:async()=>{calls++;await delay(5);return {keys:[rsa,ec]};}});
  const result=await Promise.all(Array.from({length:40},(_,i)=>c.getSigningKey(i%2?'rsa':'ec')));
  assert.equal(calls,1);assert.equal(result[0].kid,'ec');assert.equal(result[1].kid,'rsa');
  const [a,b]=await Promise.all([c.getSigningKeys(),c.getSigningKeys()]);a.pop();assert.equal(b.length,2);
});
test('shared fetch failure settles every caller and the next attempt recovers',async()=>{
  let count=0;const c=make([], {fetcher:async()=>{count++;await delay(2);if(count===1)throw Error('failed');return {keys:[rsa]};}});
  const results=await Promise.allSettled([c.getSigningKey('a'),c.getSigningKey('b')]);assert(results.every(r=>r.status==='rejected'));assert.equal(count,1);
  assert.equal((await c.getSigningKey('rsa')).kid,'rsa');assert.equal(count,2);
});
test('rolling-minute limiter is atomic under bursts and admits exactly at expiry',()=>{
  let time=0;const rate=new RateLimit(2,()=>time);rate.take();rate.take();assert.throws(()=>rate.take(),jwks.JwksRateLimitError);
  time=59999;assert.throws(()=>rate.take(),jwks.JwksRateLimitError);time=60000;rate.take();rate.take();assert.throws(()=>rate.take(),jwks.JwksRateLimitError);
});
test('rate limit charges network fetches, not hits or shared requests',async()=>{
  const c=make([rsa,ec],{rateLimit:true,jwksRequestsPerMinute:1});
  await Promise.all([c.getSigningKey('rsa'),c.getSigningKey('ec')]);await c.getSigningKey('rsa');
  await assert.rejects(c.getSigningKey('unknown'),jwks.JwksRateLimitError);await assert.rejects(c.getKeys(),jwks.JwksRateLimitError);
});
test('interceptor uses exact IDs, rejects ambiguity and falls back on a miss',async()=>{
  let calls=0;const c=make([], {fetcher:()=>{calls++;return {keys:[ec]};},getKeysInterceptor:()=>[rsa]});
  assert.equal((await c.getSigningKey('rsa')).kid,'rsa');assert.equal(calls,0);assert.equal((await c.getSigningKey('ec')).kid,'ec');assert.equal(calls,1);
  await assert.rejects(make([rsa],{getKeysInterceptor:()=>[rsa,ec]}).getSigningKey(),/No KID specified/);
  await assert.rejects(make([rsa],{getKeysInterceptor:()=>[rsa,ec],maxKeys:1}).getSigningKey('rsa'),/maxKeys/);
});
test('callbacks are async and receive exactly one normalized failure',async()=>{
  let synchronous=true,calls=0;
  const c=make([], {fetcher:()=>{throw null;}});
  await new Promise(resolve=>{c.getSigningKey('rsa',error=>{calls++;assert(!synchronous);assert(error instanceof Error);resolve();});synchronous=false;});
  await delay(2);assert.equal(calls,1);
  const unbound=make().getSigningKey;assert.equal((await unbound()).kid,'rsa');
});
test('all framework adapters retrieve matching keys and modern/legacy Express work',async()=>{
  const o={fetcher:()=>({keys:[rsa]})}, token={header:{alg:'RS256',kid:'rsa'}};
  assert.match(await jwks.expressJwtSecret(o)({},token),/PUBLIC KEY/);
  await new Promise((resolve,reject)=>jwks.expressJwtSecret(o)({},token.header,{},(err,key)=>{if(err)return reject(err);assert.match(key,/PUBLIC KEY/);resolve();}));
  assert.match(await jwks.koaJwtSecret(o)(token.header),/PUBLIC KEY/);
  assert.match((await jwks.hapiJwt2KeyAsync(o)(token)).key,/PUBLIC KEY/);
  const signed=jwt.sign({sub:'a'},keys.RSA.privateKey,{algorithm:'RS256',keyid:'rsa'});
  const key=await new Promise((resolve,reject)=>jwks.passportJwtSecret(o)({},signed,(err,pem)=>err?reject(err):resolve(pem)));
  assert.equal(jwt.verify(signed,key).sub,'a');
});
test('adapter algorithm agreement prevents a kid match from changing key purpose',async()=>{
  for(const header of [{alg:'PS256',kid:'rsa'},{alg:'ES256',kid:'rsa'}]) {
    await assert.rejects(jwks.expressJwtSecret({fetcher:()=>({keys:[rsa]})})({}, {header}),/does not support/);
    await assert.rejects(jwks.koaJwtSecret({fetcher:()=>({keys:[rsa]})})(header),/does not support/);
  }
  assert.equal(await jwks.expressJwtSecret({fetcher:()=>({keys:[rsa]})})({}, {header:{alg:'HS256'}}),undefined);
});
test('error hooks handle thrown/rejected errors and repeated callback attempts once',async()=>{
  const base={fetcher:()=>({keys:[rsa]})};
  const express=jwks.expressJwtSecret({...base,handleSigningKeyError:(e,done)=>{done(null);done(Error('late'));throw Error('later');}});
  assert.equal(await express({}, {header:{alg:'RS256',kid:'missing'}}),undefined);
  const rejecting=jwks.expressJwtSecret({...base,handleSigningKeyError:async()=>{throw Error('hook rejected');}});
  await assert.rejects(rejecting({}, {header:{alg:'RS256',kid:'missing'}}),/hook rejected/);
  await assert.rejects(jwks.koaJwtSecret({...base,handleSigningKeyError:()=>{throw Error('koa hook');}})({alg:'RS256',kid:'missing'}),/koa hook/);
  await assert.rejects(jwks.hapiJwt2KeyAsync({...base,handleSigningKeyError:(e,done)=>done(null)})({header:{alg:'RS256',kid:'missing'}}),/No signing key/);
});
test('Passport parser rejects malformed compact tokens without key retrieval',async()=>{
  let calls=0;const provider=jwks.passportJwtSecret({fetcher:()=>{calls++;return {keys:[rsa]};}});
  const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  for(const raw of ['invalid',enc({alg:'none'})+'.'+enc({})+'.AA',enc({alg:'RS256',crit:['x']})+'.'+enc({})+'.AA',enc({alg:'RS256'})+'.'+enc([])+'.AA','a.b.c']){
    await new Promise(resolve=>provider({},raw,(error,key)=>{assert.equal(error,null);assert.equal(key,null);resolve();}));
  }assert.equal(calls,0);
});
test('falsey error-hook failures reject and Hapi retains its three-argument failure callback',async()=>{
  for(const failure of [null,undefined,0,false]) {
    const base={fetcher:()=>({keys:[rsa]}),handleSigningKeyError:()=>Promise.reject(failure)};
    await assert.rejects(jwks.expressJwtSecret(base)({}, {header:{alg:'RS256',kid:'missing'}}),jwks.JwksError);
    await assert.rejects(jwks.koaJwtSecret(base)({alg:'RS256',kid:'missing'}),jwks.JwksError);
  }
  await new Promise(resolve=>jwks.hapiJwt2Key({fetcher:()=>({keys:[rsa]})})(undefined,(error,pem,key)=>{
    assert(error instanceof Error);assert.equal(pem,null);assert.equal(key,null);resolve();
  }));
});
test('Koa and Hapi read mutable header fields once before looking up a key',async()=>{
  for(const adapter of ['koa','hapi']) {
    let algorithms=0,identifiers=0,headers=0;
    const header={get alg(){assert.equal(++algorithms,1);return 'RS256';},get kid(){assert.equal(++identifiers,1);return 'rsa';}};
    const options={fetcher:()=>({keys:[rsa]})};
    const result=adapter==='koa'?await jwks.koaJwtSecret(options)(header):(await jwks.hapiJwt2KeyAsync(options)({get header(){assert.equal(++headers,1);return header;}})).key;
    assert.match(result,/PUBLIC KEY/);
  }
});
test('custom fetcher and interceptor deadlines settle hanging operations',async()=>{
  await assert.rejects(make([], {timeout:10,fetcher:()=>new Promise(()=>{})}).getSigningKey(),{code:'ETIMEDOUT'});
  await assert.rejects(make([], {timeout:10,getKeysInterceptor:()=>new Promise(()=>{})}).getSigningKey(),{code:'ETIMEDOUT'});
});
test('HTTP fetch preserves query, headers and custom agent',async t=>{
  const uri=await server(t,(req,res)=>{assert.equal(req.url,'/keys?x=1');assert.equal(req.headers['x-test'],'value');res.end(JSON.stringify({keys:[rsa]}));});
  const agent=new http.Agent({keepAlive:true});t.after(()=>agent.destroy());
  const result=await jwks({jwksUri:uri+'?x=1',requestHeaders:{'x-test':'value'},requestAgent:agent}).getSigningKey('rsa');assert.equal(result.kid,'rsa');
});
test('HTTP response byte limit covers announced and chunked bodies',async t=>{
  for(const declared of [false,true]) {
    const uri=await server(t,(req,res)=>{if(declared)res.setHeader('content-length',1000);else res.write(' '.repeat(20));res.end(' '.repeat(1000));});
    await assert.rejects(jwks({jwksUri:uri,maxResponseBytes:32}).getKeys(),/maxResponseBytes/);
  }
});
test('HTTP deadlines include response streaming and destroy stuck requests',async t=>{
  const timers=[];t.after(()=>timers.forEach(clearInterval));
  const uri=await server(t,(req,res)=>{res.write('{');timers.push(setInterval(()=>res.write(' '),5));});
  await assert.rejects(jwks({jwksUri:uri,timeout:25}).getKeys(),{code:'ETIMEDOUT'});
});
test('HTTP premature close, malformed JSON and invalid UTF-8 reject',async t=>{
  const uri=await server(t,(req,res)=>{res.writeHead(200,{'content-length':'1000'});res.write('{');setImmediate(()=>res.destroy());});
  await assert.rejects(jwks({jwksUri:uri}).getKeys());
  for(const body of [Buffer.from('{broken'),Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xff,0x22,0x7d])]) {
    const endpoint=await server(t,(req,res)=>res.end(body));await assert.rejects(jwks({jwksUri:endpoint}).getKeys(),/valid UTF-8 JSON/);
  }
});
test('HTTP status failures reject early and never follow redirects',async t=>{
  let requests=0;const uri=await server(t,(req,res)=>{requests++;res.writeHead(302,{location:'/other'});res.end();});
  await assert.rejects(jwks({jwksUri:uri}).getKeys(),{statusCode:302});assert.equal(requests,1);
});
