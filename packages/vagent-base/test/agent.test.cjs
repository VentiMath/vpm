'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),https=require('node:https'),net=require('node:net'),tls=require('node:tls'),fs=require('node:fs');
const {once}=require('node:events');
const {Readable,PassThrough}=require('node:stream');
const {AsyncLocalStorage}=require('node:async_hooks');
const {Agent,req,toBuffer,json}=require('..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const ssl={key:fs.readFileSync(__dirname+'/tls-key.pem'),cert:fs.readFileSync(__dirname+'/tls-cert.pem')};
async function serve(t,secure=false,handler=(q,s)=>s.end('ok')){
  const server=(secure?https:http).createServer(secure?ssl:{},handler);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
  return {server,url:(secure?'https':'http')+'://127.0.0.1:'+server.address().port,port:server.address().port};
}
function managed(t,C=Direct,options){const a=new C(options);t.after(()=>a.destroy());return a;}
class Direct extends Agent {connect(q,o){return o.secureEndpoint?tls.connect(o):net.connect(o);}}
async function body(url,options){return (await toBuffer(await req(url,options))).toString();}
function pendingAgent(t,options){let finish;class Pending extends Agent{connect(){return new Promise(resolve=>{finish=resolve;});}}const agent=managed(t,Pending,options);return{agent,resolve:value=>finish(value)};}
test('exports CommonJS and ESM class/helpers without runtime dependencies',async()=>{
  const esm=await import('../index.js');assert.equal(esm.Agent,Agent);assert.equal(esm.toBuffer,toBuffer);assert.equal(esm.default.Agent,Agent);
  assert.equal(require('../package.json').dependencies,undefined);
  assert(new Direct() instanceof http.Agent);
});
for(const secure of [false,true])test((secure?'HTTPS':'HTTP')+' sync and async connectors preserve headers and response bytes',async t=>{
  const {url}=await serve(t,secure,(q,s)=>s.end(q.url+' '+q.headers['x-test']));
  for(const async of [false,true]){
    class Connector extends Agent{connect(q,o){assert.equal(o.secureEndpoint,secure);const socket=(secure?tls:net).connect(o);return async?Promise.resolve(socket):socket;}}
    const agent=managed(t,Connector);
    assert.equal(await body(url+'/path?x=1',{agent,rejectUnauthorized:false,headers:{'x-test':'value'}}),'/path?x=1 value');
  }
});
test('default ports and explicit protocol remain configurable',async t=>{
  const {url,port}=await serve(t,false,(q,s)=>s.end(q.headers.host));
  const agent=managed(t);agent.defaultPort=port;
  assert.equal(await body(url,{agent}),'127.0.0.1');agent.protocol='other:';
  assert.throws(()=>req(url,{agent}),/Protocol/);
  assert.throws(()=>{agent.defaultPort=NaN;},RangeError);assert.throws(()=>{agent.protocol=1;},TypeError);
});
test('secure endpoint fields are read once and native default agents identify HTTPS',()=>{
  const a=new Direct();let reads=0;
  assert.equal(a.isSecureEndpoint({get secureEndpoint(){reads++;return true;}}),true);assert.equal(reads,1);
  assert.equal(a.isSecureEndpoint({_defaultAgent:https.globalAgent}),true);
  assert.equal(a.isSecureEndpoint({protocol:'http:',_defaultAgent:https.globalAgent}),false);
  a.protocol='https:';assert.equal(a.isSecureEndpoint(),true);assert.equal(a.defaultPort,443);
});
test('TLS pool names keep certificate and verification policies isolated',()=>{
  const a=new Direct(),options={host:'localhost',port:443,secureEndpoint:true};
  assert.equal(a.getName({...options,rejectUnauthorized:false}),https.Agent.prototype.getName.call(a,{...options,rejectUnauthorized:false}));
  assert.notEqual(a.getName({...options,rejectUnauthorized:false}),a.getName({...options,rejectUnauthorized:true}));
  assert.notEqual(a.getName({...options,ca:'one'}),a.getName({...options,ca:'two'}));
});
test('constructor validates bounds and snapshots options without modifying input',()=>{
  for(const o of [null,[],3,{connectTimeout:-1},{connectTimeout:NaN},{maxSockets:0},{maxTotalSockets:1.5},{maxFreeSockets:-1}])assert.throws(()=>new Direct(o));
  const options={keepAlive:true,maxSockets:2,connectTimeout:10};const a=new Direct(options);options.maxSockets=20;assert.equal(a.maxSockets,2);assert.equal(options.connectTimeout,10);
});
test('keep-alive and per-origin limits coalesce concurrent requests onto one socket',async t=>{
  let connects=0;class Limited extends Direct{async connect(q,o){connects++;await delay(2);return super.connect(q,o);}}
  const {url}=await serve(t);const agent=managed(t,Limited,{keepAlive:true,maxSockets:1});
  assert.deepEqual(await Promise.all(Array.from({length:8},()=>body(url,{agent}))),Array(8).fill('ok'));
  assert.equal(connects,1);assert.equal(agent.totalSocketCount,1);
});
test('global socket limits apply while different origins are connecting',async t=>{
  let active=0,peak=0;class Limited extends Direct{async connect(q,o){active++;peak=Math.max(peak,active);await delay(4);active--;return super.connect(q,o);}}
  const first=await serve(t),second=await serve(t);const agent=managed(t,Limited,{maxTotalSockets:1});
  assert.deepEqual(await Promise.all([body(first.url,{agent}),body(second.url,{agent})]),['ok','ok']);assert.equal(peak,1);
});
test('failed pending connects release queued requests and preserve their async context',async t=>{
  let calls=0;const context=new AsyncLocalStorage();
  class FailOnce extends Direct{async connect(q,o){calls++;if(calls===1){await delay(5);throw Error('first');}assert.equal(context.getStore(),'second');return super.connect(q,o);}}
  const {url}=await serve(t);const agent=managed(t,FailOnce,{maxSockets:1});
  const first=context.run('first',()=>body(url,{agent}));const second=context.run('second',()=>body(url,{agent}));
  const results=await Promise.allSettled([first,second]);assert.equal(results[0].status,'rejected');assert.equal(results[0].reason.message,'first');assert.deepEqual(results[1],{status:'fulfilled',value:'ok'});assert.equal(calls,2);
});
test('repeated failures settle every queued request without recursion or hanging',async t=>{
  class Failing extends Agent{async connect(){await delay(1);throw Error('offline');}}
  const agent=managed(t,Failing,{maxSockets:1});
  const results=await Promise.allSettled(Array.from({length:8},()=>body('http://127.0.0.1:1',{agent})));
  assert(results.every(r=>r.status==='rejected'&&r.reason.message==='offline'));assert.equal(agent.totalSocketCount,0);assert.deepEqual(Object.keys(agent.requests),[]);
});
test('timeouts release capacity and destroy sockets that resolve too late',async t=>{
  const pending=pendingAgent(t,{connectTimeout:10,maxSockets:1});const request=req('http://127.0.0.1:1',{agent:pending.agent});
  await assert.rejects(Promise.resolve(request),{code:'ETIMEDOUT'});assert.equal(pending.agent.totalSocketCount,0);
  const late=new net.Socket();pending.resolve(late);await delay(2);assert.equal(late.destroyed,true);
});
test('destroying a pending request restores its method and disposes late sockets',async t=>{
  const pending=pendingAgent(t,{maxSockets:1});const request=req('http://127.0.0.1:1',{agent:pending.agent});
  const result=Promise.resolve(request);request.destroy(Error('cancelled'));
  await assert.rejects(result);assert.equal(Object.hasOwn(request,'destroy'),false);assert.equal(pending.agent.totalSocketCount,0);
  const late=new net.Socket();pending.resolve(late);await delay(2);assert(late.destroyed);
});
test('agent.destroy settles pending and queued operations, while later reuse is supported',async t=>{
  let ready=false;class Later extends Direct{connect(q,o){return ready?super.connect(q,o):new Promise(()=>{});}}
  const {url}=await serve(t),agent=managed(t,Later,{maxSockets:1});
  const pending=Promise.allSettled([body(url,{agent}),body(url,{agent})]);agent.destroy();
  const results=await pending;assert(results.every(r=>r.status==='rejected'));assert.equal(agent.totalSocketCount,0);
  ready=true;assert.equal(await body(url,{agent}),'ok');
});
test('invalid, destroyed and falsey rejected connector results fail exactly once',async t=>{
  for(const result of [undefined,null,{},1,false]){
    class Bad extends Agent{connect(){return result;}}const agent=managed(t,Bad);
    await assert.rejects(body('http://127.0.0.1:1',{agent}),{code:'ERR_AGENT_SOCKET'});
  }
  for(const result of [null,false,undefined]){
    class Bad extends Agent{connect(){return Promise.reject(result);}}const agent=managed(t,Bad);
    await assert.rejects(body('http://127.0.0.1:1',{agent}),{code:'ERR_AGENT_CONNECT'});
  }
  class Dead extends Agent{connect(){return new net.Socket().destroy();}}
  await assert.rejects(body('http://127.0.0.1:1',{agent:managed(t,Dead)}),{code:'ERR_AGENT_SOCKET'});
});
test('thenables are assimilated once and cannot settle a request twice',async t=>{
  const {url}=await serve(t);let getters=0;
  class Thenable extends Direct{connect(q,o){const s=super.connect(q,o);return{get then(){getters++;return(resolve,reject)=>{resolve(s);resolve(s);reject(Error('late'));throw Error('later');};}};}}
  assert.equal(await body(url,{agent:managed(t,Thenable)}),'ok');assert.equal(getters,1);
});
test('delegation supports native agents and catches direct and indirect cycles',async t=>{
  const {url}=await serve(t);
  class Delegate extends Agent{connect(){return http.globalAgent;}}
  assert.equal(await body(url,{agent:managed(t,Delegate)}),'ok');
  class Loop extends Agent{connect(){return this.target||this;}}
  const a=managed(t,Loop);await assert.rejects(body(url,{agent:a}),{code:'ERR_AGENT_CYCLE'});
  const b=managed(t,Loop);a.target=b;b.target=a;await assert.rejects(body(url,{agent:a}),{code:'ERR_AGENT_CYCLE'});
});
test('public handoff rejects calls without a pending socket',()=>assert.throws(()=>new Direct().createConnection(),{code:'ERR_AGENT_SOCKET'}));
test('toBuffer collects UTF-8 strings and exact typed-array views',async()=>{
  const view=new Uint8Array([0,65,66,0]);assert.equal((await toBuffer(['é',view.subarray(1,3),new DataView(view.buffer,2,1)])).toString(),'éABB');
  assert.equal((await toBuffer([])).length,0);
});
test('toBuffer snapshots chunks before a producer reuses its backing storage',async()=>{
  const b=Buffer.from('one');async function* source(){yield b;b.fill(120);yield b;}
  assert.equal((await toBuffer(source())).toString(),'onexxx');
});
test('toBuffer limits UTF-8 bytes, closes producers and rejects object chunks',async()=>{
  let closed=false;async function* source(){try{yield 'é';yield 'more';}finally{closed=true;}}
  await assert.rejects(toBuffer(source(),{limit:1}),/byte limit/);assert(closed);
  await assert.rejects(toBuffer([{}]),TypeError);await assert.rejects(toBuffer([],{limit:-1}),RangeError);
});
test('JSON errors do not disclose response contents and malformed UTF-8 rejects',async()=>{
  for(const value of [Buffer.from('{"secret":"do-not-log"'),Buffer.from([123,34,120,34,58,34,255,34,125])]){
    await assert.rejects(json([value]),e=>e instanceof SyntaxError&&!e.message.includes('secret')&&!e.message.includes('do-not-log'));
  }
  assert.deepEqual(await json(['{"ok":true}']),{ok:true});
});
test('stream errors and premature close reject helpers',async()=>{
  const stream=new PassThrough();const result=toBuffer(stream);stream.destroy(Error('failed'));await assert.rejects(result,/failed/);
  const early=new PassThrough();const closed=toBuffer(early);early.destroy();await assert.rejects(closed);
});
test('request helper rejects unsupported protocols and remains thenable',async t=>{
  assert.throws(()=>req('ftp://example.test'),TypeError);
  const {url}=await serve(t,false,(q,s)=>s.end('[]'));
  const request=req(new URL(url));assert.equal(typeof request.abort,'function');const response=await request;assert.deepEqual(await json(response),[]);
});
test('asynchronous delegation drains a limited parent queue without repeated handoffs',async t=>{
  const {url}=await serve(t);let calls=0;
  class Delegate extends Agent{async connect(){calls++;await delay(2);return http.globalAgent;}}
  const agent=managed(t,Delegate,{maxSockets:1});
  assert.deepEqual(await Promise.all(Array.from({length:4},()=>body(url,{agent}))),Array(4).fill('ok'));
  assert.equal(calls,4);assert.deepEqual(Object.keys(agent.requests),[]);assert.equal(agent.totalSocketCount,0);
});
test('aborting a pending connect releases the next queued request',async t=>{
  let calls=0;class FirstHangs extends Direct{connect(q,o){return ++calls===1?new Promise(()=>{}):super.connect(q,o);}}
  const {url}=await serve(t);const agent=managed(t,FirstHangs,{maxSockets:1});
  const first=req(url,{agent});const rejected=Promise.resolve(first);const second=body(url,{agent});
  first.abort();await assert.rejects(rejected);assert.equal(await second,'ok');assert.equal(calls,2);
});
test('helper retains request error handling after response headers',async t=>{
  const {url}=await serve(t);const request=req(url);const response=await request;
  request.emit('error',Error('late transport error'));response.resume();
});
test('native HTTPS options and custom error formatting preserve protocol detection',async t=>{
  if(!require('node:util').getCallSites)return;
  const {port}=await serve(t,true);const agent=managed(t);
  const prior=Error.prepareStackTrace;
  let request;
  try{
    Error.prepareStackTrace=()=>{throw Error('formatter must not run');};
    request=new Promise((resolve,reject)=>https.get({hostname:'127.0.0.1',port,agent,rejectUnauthorized:false},response=>{response.resume();response.on('end',resolve);response.on('error',reject);}).on('error',reject));
  }finally{Error.prepareStackTrace=prior;}
  await request;
});
test('one agent isolates simultaneous HTTP and HTTPS origins',async t=>{
  const first=await serve(t),second=await serve(t,true);const agent=managed(t,Direct,{keepAlive:true,maxSockets:1});
  const values=await Promise.all(Array.from({length:6},(_,i)=>body(i%2?first.url:second.url,{agent,rejectUnauthorized:false})));
  assert.deepEqual(values,Array(6).fill('ok'));assert.equal(Object.keys(agent.freeSockets).length,2);
});
test('collection grows across mixed chunk boundaries without changing bytes or limits',async()=>{
  const parts=Array.from({length:40},(_,i)=>i%3===0?'雪'.repeat(250):Buffer.alloc(500+i,i));
  const expected=Buffer.concat(parts.map(value=>Buffer.isBuffer(value)?value:Buffer.from(value)));
  assert.deepEqual(await toBuffer(parts,{limit:expected.length}),expected);
  assert.deepEqual(await toBuffer(Readable.from(parts),{limit:expected.length}),expected);
  await assert.rejects(toBuffer(Readable.from(parts),{limit:expected.length-1}),RangeError);
  assert.deepEqual(await toBuffer(['',Buffer.alloc(0),'雪','']),Buffer.from('雪'));
});
test('agent-base 9 structural delegates handle synchronous and asynchronous results',async t=>{
  const {url}=await serve(t);
  for(const asynchronous of [false,true]){
    const delegate={addRequest(q,o){http.globalAgent.addRequest(q,o);}};
    class Structural extends Agent{connect(){return asynchronous?Promise.resolve(delegate):delegate;}}
    const agent=managed(t,Structural,{maxSockets:1});
    assert.deepEqual(await Promise.all([body(url,{agent}),body(url,{agent})]),['ok','ok']);
    assert.equal(agent.totalSocketCount,0);
  }
});
test('structural delegation reads addRequest once and preserves its receiver',async t=>{
  const {url}=await serve(t);let reads=0;
  const delegate={get addRequest(){reads++;return function(q,o){assert.equal(this,delegate);http.globalAgent.addRequest(q,o);};}};
  class Structural extends Agent{connect(){return Promise.resolve(delegate);}}
  assert.equal(await body(url,{agent:managed(t,Structural)}),'ok');assert.equal(reads,1);
});
test('throwing delegate getters settle the request and release a limited queue',async t=>{
  const {url}=await serve(t);let calls=0;
  class Structural extends Direct{async connect(q,o){if(++calls===1)return{get addRequest(){throw Error('delegate getter');}};return super.connect(q,o);}}
  const agent=managed(t,Structural,{maxSockets:1});
  const results=await Promise.allSettled([body(url,{agent}),body(url,{agent})]);
  assert.equal(results[0].reason.message,'delegate getter');assert.deepEqual(results[1],{status:'fulfilled',value:'ok'});
});
test('throwing structural delegates settle once and drain queued work',async t=>{
  const {url}=await serve(t);let calls=0;
  class Structural extends Direct{connect(q,o){if(++calls===1)return{addRequest(){throw Error('delegate call');}};return super.connect(q,o);}}
  const agent=managed(t,Structural,{maxSockets:1});
  const results=await Promise.allSettled([body(url,{agent}),body(url,{agent})]);
  assert.equal(results[0].reason.message,'delegate call');assert.deepEqual(results[1],{status:'fulfilled',value:'ok'});
});
test('delegation cycles through a structural adapter are rejected',async t=>{
  let agent;const delegate={addRequest(q,o){agent.addRequest(q,o);}};
  class Structural extends Agent{connect(){return delegate;}}agent=managed(t,Structural);
  await assert.rejects(body('http://127.0.0.1:1',{agent}),{code:'ERR_AGENT_CYCLE'});
});
test('cancelled connections never invoke a late shared delegate',async t=>{
  const pending=pendingAgent(t);const request=req('http://127.0.0.1:1',{agent:pending.agent});
  const result=Promise.resolve(request);request.destroy();await assert.rejects(result);
  let calls=0;pending.resolve({addRequest(){calls++;},destroy(){assert.fail('shared delegate must not be destroyed');}});
  await delay(2);assert.equal(calls,0);
});
