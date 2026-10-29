'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const http = require('node:http');
const cors = require('..');
const load = require('./load.cjs');
const originals = ['2.8.5', '2.8.6'].map(load);
function response(initial = {}) {
  return { headers: { ...initial }, statusCode: 200, ended: 0, writes: 0,
    getHeader(name) { return this.headers[name.toLowerCase()]; },
    setHeader(name, value) { this.writes++; this.headers[name.toLowerCase()] = value; },
    removeHeader(name) { delete this.headers[name.toLowerCase()]; },
    end() { this.ended++; }
  };
}
function invoke(middleware, method = 'GET', headers = { origin: 'https://ventimath.com' }, res = response()) {
  const errors = [], req = { method, headers };
  middleware(req, res, error => errors.push(error));
  return { res, errors, req };
}
function output(result) { return { headers: result.res.headers, status: result.res.statusCode, ends: result.res.ended, errors: result.errors }; }

test('upstream fixtures retain verified source hashes', () => {
  const provenance = require('../PROVENANCE.json');
  for (const source of [...provenance.sources, provenance.upstreamTests, ...provenance.testHelpers]) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
  }
});
test('ordinary policies match cors 2.8.5 and 2.8.6 across requests and preflights', () => {
  const options = [undefined, null, {}, {origin:false}, {origin:undefined}, {origin:null}, {origin:''}, {origin:true}, {origin:'*'}, {origin:'https://fixed.test'},
    {origin:/ventimath\.com$/}, {origin:['https://ventimath.com', /example/]}, {origin:['https://other.test']},
    {credentials:true, maxAge:0, methods:['GET','POST'], allowedHeaders:['Authorization','X-Test'], exposedHeaders:['X-Result']},
    {headers:'X-Legacy', methods:'GET, POST', maxAge:'3600', preflightContinue:true}, {optionsSuccessStatus:200, allowedHeaders:[]},
    {origin(_origin,cb){cb(null,true);}}];
  for (const option of options) for (const method of ['GET','HEAD','POST','OPTIONS','options']) for (const origin of ['https://ventimath.com','https://other.test',undefined]) {
    const headers = { origin, 'access-control-request-headers':'X-Test, Authorization' };
    const current = output(invoke(cors(option),method,headers));
    for (const original of originals) assert.deepEqual(current,output(invoke(original(option),method,headers)));
  }
});
test('global and sticky regexes are stable and preserve caller lastIndex', () => {
  for (const regex of [/ventimath/g, /^https:\/\/ventimath/y]) {
    regex.lastIndex = 7;
    const middleware = cors({origin:regex});
    for (let i=0;i<5;i++) assert.equal(invoke(middleware).res.headers['access-control-allow-origin'],'https://ventimath.com');
    assert.equal(regex.lastIndex,7);
  }
  const upstream = originals[1]({origin:/ventimath/g});
  assert.ok(invoke(upstream).res.headers['access-control-allow-origin']);
  assert.equal(invoke(upstream).res.headers['access-control-allow-origin'],undefined);
});
test('static options, origin arrays and regexes are snapshotted once', () => {
  const pattern = /ventimath/g, origins = [pattern], methods = ['GET'], headers = ['X-Test'];
  const options = {origin:origins, methods, allowedHeaders:headers, credentials:true};
  const middleware = cors(options);
  origins[0]='https://other.test';methods[0]='DELETE';headers[0]='X-Other';options.credentials=false;pattern.compile('other');
  const result=invoke(middleware,'OPTIONS');
  assert.equal(result.res.headers['access-control-allow-origin'],'https://ventimath.com');
  assert.equal(result.res.headers['access-control-allow-methods'],'GET');
  assert.equal(result.res.headers['access-control-allow-headers'],'X-Test');
  assert.equal(result.res.headers['access-control-allow-credentials'],'true');
});
test('configuration getters and array elements are read once; unknown options are ignored', () => {
  let reads=0, entries=0;
  const fields=[];Object.defineProperty(fields,0,{get(){entries++;return 'X-Test';}});
  const options={get allowedHeaders(){reads++;return fields;},get unknown(){throw Error('unused');}};
  const middleware=cors(Object.freeze(options));
  invoke(middleware,'OPTIONS');invoke(middleware,'OPTIONS');
  assert.equal(reads,1);assert.equal(entries,1);
});
test('inherited options and prototype-shaped fields cannot change configuration', () => {
  const options=Object.create({origin:false,credentials:true,allowedHeaders:'X-Inherited'});
  Object.defineProperty(options,'__proto__',{value:{origin:false,credentials:true},enumerable:true});
  const result=invoke(cors(options));
  assert.equal(result.res.headers['access-control-allow-origin'],'*');
  assert.equal(result.res.headers['access-control-allow-credentials'],undefined);
});
test('origin arrays accept deep/shared inputs and reject cycles and invalid entries', () => {
  let origins='https://ventimath.com';for(let i=0;i<20000;i++)origins=[origins];
  assert.equal(invoke(cors({origin:origins})).res.headers['access-control-allow-origin'],'https://ventimath.com');
  const shared=['https://ventimath.com'];assert.ok(invoke(cors({origin:[shared,shared]})).res.headers['access-control-allow-origin']);
  const cycle=[];cycle.push(cycle);assert.throws(()=>cors({origin:cycle}),/cyclic/);
  for(const value of [[null],[true],[1],[()=>true],new Array(1)])assert.throws(()=>cors({origin:value}),TypeError);
});
test('large origin lists retain exact matching and regex alternatives', () => {
  const origins=Array.from({length:500},(_,i)=>'https://host'+i+'.test');origins.push(/ventimath/g);
  const middleware=cors({origin:origins});
  for(const origin of ['https://host499.test','https://ventimath.com','https://HOST499.test']) {
    assert.equal(invoke(middleware,'GET',{origin}).res.headers['access-control-allow-origin'],origin==='https://HOST499.test'?undefined:origin);
  }
});
test('invalid header configuration fails at creation without coercion', () => {
  let calls=0;const object={toString(){calls++;return 'X-Test';}};
  for(const key of ['methods','allowedHeaders','headers','exposedHeaders'])for(const value of [1,false,object,['Bad Name'],['X\r\nY'],['X',null],'X\n','X,,Y','X;Y','\u00a0X']) {
    assert.throws(()=>cors({[key]:value}),TypeError,key);
  }
  for(const origin of [3,{},'x\r\nInjected: yes','x\0','雪'])assert.throws(()=>cors({origin}),TypeError);
  assert.equal(calls,0);
});
test('flags, status and maxAge have explicit numeric/boolean contracts', () => {
  for(const key of ['credentials','preflightContinue'])for(const value of ['true',1,null,{}])assert.throws(()=>cors({[key]:value}),TypeError);
  for(const optionsSuccessStatus of [0,199,300,204.1,NaN,Infinity,'204',null])assert.throws(()=>cors({optionsSuccessStatus}),TypeError);
  for(const maxAge of [-1,0.5,NaN,Infinity,2**53,'-1','1e3','2 seconds','',{},true])assert.throws(()=>cors({maxAge}),TypeError);
  for(const maxAge of [0,3600,'0','3600',Number.MAX_SAFE_INTEGER])assert.equal(invoke(cors({maxAge}),'OPTIONS').res.headers['access-control-max-age'],String(maxAge));
});
test('empty allowedHeaders deliberately disables reflection, including the legacy alias', () => {
  for(const allowedHeaders of ['',[]]) {
    const result=invoke(cors({allowedHeaders,headers:'X-Legacy'}),'OPTIONS',{'access-control-request-headers':'X-Request'});
    assert.equal(result.res.headers['access-control-allow-headers'],undefined);
    assert.equal(result.res.headers.vary,undefined);
  }
  assert.equal(invoke(originals[1]({allowedHeaders:''}),'OPTIONS',{'access-control-request-headers':'X-Request'}).res.headers['access-control-allow-headers'],'X-Request');
});
test('request origin, header map and method are read once', () => {
  let maps=0,origins=0,methods=0;
  const headers={get origin(){origins++;return 'https://ventimath.com';},'access-control-request-headers':'X-Test'};
  const req={get headers(){maps++;return headers;},get method(){methods++;return 'OPTIONS';}};
  const res=response();cors({origin:true})(req,res,error=>assert.ifError(error));
  assert.deepEqual([maps,origins,methods],[1,1,1]);assert.equal(res.ended,1);
});
test('inherited request headers are ignored', () => {
  const result=invoke(cors({origin:true}),'OPTIONS',Object.create({origin:'https://inherited.test','access-control-request-headers':'X-Inherited'}));
  assert.equal(result.res.headers['access-control-allow-origin'],undefined);
  assert.equal(result.res.headers['access-control-allow-headers'],undefined);
  assert.equal(result.res.headers.vary,'Origin, Access-Control-Request-Headers');
});
test('malformed reflected headers fail before CORS response writes', () => {
  for(const headers of [{origin:['https://one.test','https://two.test']},{origin:'bad\r\nX: value'}, {'access-control-request-headers':'X\r\nY: z'}, {'access-control-request-headers':5}]) {
    const result=invoke(cors({origin:true}),'OPTIONS',headers);
    assert.ok(result.errors[0] instanceof TypeError);assert.equal(result.res.writes,0);assert.equal(result.res.ended,0);
  }
});
test('requested headers are reflected as cors 2.8.6 reflects them', () => {
  for(const requested of ['x-a,x-b','X-A, ,X-B','Bad Name','x-a,,x-b']) {
    const result=invoke(cors({origin:true}),'OPTIONS',{'access-control-request-headers':requested});
    const expected=invoke(originals[1]({origin:true}),'OPTIONS',{'access-control-request-headers':requested});
    assert.deepEqual(result.errors,[]);
    assert.equal(result.res.headers['access-control-allow-headers'],expected.res.headers['access-control-allow-headers']);
  }
  // A malformed Vary from elsewhere is kept, as vary keeps it.
  const res=response({vary:'Invalid Header'});const result=invoke(cors({origin:true}),'GET',{origin:'https://ventimath.com'},res);
  assert.deepEqual(result.errors,[undefined]);assert.equal(res.headers.vary,'Invalid Header, Origin');
});
test('Vary handles tabs, arrays, duplicates and wildcard without redundant writes', () => {
  for(const existing of ['Accept,\tOrigin',['Accept','Origin'],'*']) {
    const res=response({vary:existing});invoke(cors({origin:true}),'GET',{origin:'https://ventimath.com'},res);
    assert.deepEqual(res.headers.vary,existing);assert.equal(res.writes,1);
  }
});
test('dynamic origin denial still varies by Origin and continues without grant headers', () => {
  for(const origin of [false,null,undefined,'']) {
    const result=invoke(cors({origin(_origin,cb){cb(null,origin);}}),'OPTIONS');
    assert.deepEqual(result.res.headers,{vary:'Origin'});assert.equal(result.res.ended,0);assert.equal(result.errors.length,1);
  }
});
test('options delegates vary on Origin even for wildcard and disabled policies', () => {
  for(const origin of ['*',false]) {
    const result=invoke(cors((_req,cb)=>cb(null,{origin})));
    assert.equal(result.res.headers.vary,'Origin');
    assert.equal(result.res.headers['access-control-allow-origin'],origin||undefined);
  }
});
test('wildcard plus credentials is preserved, never broadened into origin reflection', () => {
  const result=invoke(cors({credentials:true}));
  assert.equal(result.res.headers['access-control-allow-origin'],'*');assert.equal(result.res.headers['access-control-allow-credentials'],'true');
});
test('origin callbacks settle once, including reentrant response writes', () => {
  let callback;
  const res=response(),set=res.setHeader;
  res.setHeader=function(name,value){callback(null,'https://injected.test');return set.call(this,name,value);};
  const result=invoke(cors({origin(_origin,cb){callback=cb;cb(null,true);cb(Error('late'));}}),'GET',{origin:'https://ventimath.com'},res);
  assert.equal(result.errors.length,1);assert.equal(result.errors[0],undefined);assert.equal(res.headers['access-control-allow-origin'],'https://ventimath.com');
});
test('options delegates settle once and retain callback policy per request', () => {
  let delegates=0,origins=0;
  const result=invoke(cors((_req,cb)=>{delegates++;cb(null,{origin(_origin,done){origins++;done(null,true);}});cb(null,{origin:'https://injected.test'});}));
  assert.equal(delegates,1);assert.equal(origins,1);assert.equal(result.errors.length,1);
});
test('async callbacks may settle once per request without shared policy state', async () => {
  const callbacks=[];const middleware=cors({origin(_origin,cb){callbacks.push(cb);}});
  const first=invoke(middleware,'GET',{origin:'https://one.test'}),second=invoke(middleware,'GET',{origin:'https://two.test'});
  await new Promise(resolve=>setImmediate(resolve));
  callbacks[1](null,true);callbacks[0](null,false);callbacks[1](null,false);
  assert.equal(second.res.headers['access-control-allow-origin'],'https://two.test');assert.deepEqual(first.res.headers,{vary:'Origin'});
  assert.equal(first.errors.length,1);assert.equal(second.errors.length,1);
});
test('provider throws and callback errors go to next once; late results are ignored', () => {
  const error=Error('provider');
  for(const kind of ['origin','options']) {
    for(const provider of [(_arg,cb)=>{throw error;},(_arg,cb)=>{cb(error);cb(null,true);},(_arg,cb)=>{cb(null,kind==='origin'?true:{});throw error;}]) {
      const result=invoke(kind==='origin'?cors({origin:provider}):cors(provider));assert.equal(result.errors.length,1);
    }
    let callback;const result=invoke(kind==='origin'?cors({origin(_arg,cb){callback=cb;throw error;}}):cors((_arg,cb)=>{callback=cb;throw error;}));
    callback(null,kind==='origin'?true:{});assert.deepEqual(result.errors,[error]);
  }
});
test('downstream exceptions are not swallowed or delivered to next twice', () => {
  for(const options of [undefined,{origin(_origin,cb){cb(null,true);}},(_req,cb)=>cb(null,{origin:true})]) {
    for (const error of [Error('downstream'), NaN, undefined, null, 'downstream', -0]) {
      let calls=0;
      assert.throws(()=>cors(options)({method:'GET',headers:{}},response(),()=>{calls++;throw error;}),value=>Object.is(value,error));
      assert.equal(calls,1);
    }
  }
});
test('invalid dynamic options/policies and getter errors are forwarded before writes', () => {
  const error=Error('getter');
  for(const options of [(_req,cb)=>cb(null,{methods:['Bad Name']}),{origin(_origin,cb){cb(null,()=>true);}},(_req,cb)=>cb(null,{get credentials(){throw error;}})]) {
    const result=invoke(cors(options));assert.equal(result.errors.length,1);assert.ok(result.errors[0] instanceof Error);assert.equal(result.res.writes,0);
  }
});
test('generated preflights clear incompatible framing and use a valid empty body', () => {
  for(const optionsSuccessStatus of [200,204,205,299]) {
    const res=response({'transfer-encoding':'chunked',trailer:'X-Checksum','content-length':'100','content-encoding':'gzip'});
    const result=invoke(cors({optionsSuccessStatus}),'OPTIONS',{},res);
    assert.equal(res.statusCode,optionsSuccessStatus);assert.equal(res.ended,1);assert.equal(result.errors.length,0);
    for(const name of ['transfer-encoding','trailer','content-encoding'])assert.equal(res.headers[name],undefined);
    assert.equal(res.headers['content-length'],'0');
  }
});
test('continued preflights leave response body, framing and status to the next handler', () => {
  const res=response({'transfer-encoding':'chunked',trailer:'X-Checksum','content-length':'100'});
  invoke(cors({preflightContinue:true}),'OPTIONS',{},res);
  assert.equal(res.ended,0);assert.equal(res.statusCode,200);assert.equal(res.headers['content-length'],'100');assert.equal(res.headers.trailer,'X-Checksum');
});
test('CommonJS and ESM expose the same callable middleware factory', async () => {
  const esm=await import('../index.js');assert.equal(esm.default,cors);assert.equal(Object.isFrozen(cors),true);
  assert.deepEqual(require('../package.json').dependencies,{vvary:'workspace:*'});
});
test('real HTTP requests handle reflection, denied origins and preflight framing', async () => {
  const middleware=cors({origin:/ventimath\.com$/g,credentials:true});
  const server=http.createServer((req,res)=>{
    if(req.method==='OPTIONS'){res.setHeader('Transfer-Encoding','chunked');res.setHeader('Trailer','X-Checksum');}
    middleware(req,res,error=>{res.statusCode=error?500:200;res.end(error?String(error):'ok');});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  async function request(method,origin){return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/',method,headers:{origin,'access-control-request-headers':'X-Test'},agent:false},res=>{const data=[];res.on('data',x=>data.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(data).toString()}));});req.on('error',reject);req.end();});}
  try {
    for(let i=0;i<2;i++)assert.equal((await request('GET','https://ventimath.com')).headers['access-control-allow-origin'],'https://ventimath.com');
    assert.equal((await request('GET','https://other.test')).headers['access-control-allow-origin'],undefined);
    const preflight=await request('OPTIONS','https://ventimath.com');assert.equal(preflight.status,204);assert.equal(preflight.body,'');assert.equal(preflight.headers['transfer-encoding'],undefined);assert.equal(preflight.headers.trailer,undefined);
  } finally { server.closeAllConnections();await new Promise(resolve=>server.close(resolve)); }
});

test('known Vary paths preserve captured headers and method receivers with one read', () => {
  for(const value of [undefined,'Origin','*','Accept',['Accept','Origin']]) {
    let gets=0,sets=0,reads=0;
    const res=response({vary:value});
    Object.defineProperty(res,'getHeader',{get(){gets++;return function(name){assert.equal(this,res);assert.equal(name,'Vary');reads++;return reads===1?value:'Invalid Header';};}});
    Object.defineProperty(res,'setHeader',{get(){sets++;return function(name,next){assert.equal(this,res);this.headers[name.toLowerCase()]=next;};}});
    const result=invoke(cors({origin(_origin,cb){cb(null,false);}}),'GET',{},res);
    assert.deepEqual(result.errors,[undefined]);assert.deepEqual([gets,sets,reads],[1,1,1]);
    assert.deepEqual(res.headers.vary,value===undefined?'Origin':value==='Accept'?'Accept, Origin':value);
  }
});
