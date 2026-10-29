'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),net=require('node:net');
const {EventEmitter,once}=require('node:events');const {PassThrough}=require('node:stream');
const {HttpsProxyAgent}=require('..'),{HeaderParser,readResponse}=require('../lib/response');
const {start,origin,proxy,request}=require('./helpers.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function agent(t,url,opts){const a=new HttpsProxyAgent(url,opts);t.after(()=>a.destroy());return a;}
test('CJS/ESM exports extend vagent-base and declare only VPM dependencies',async()=>{
  const esm=await import('../index.js');assert.equal(esm.HttpsProxyAgent,HttpsProxyAgent);assert(new HttpsProxyAgent('http://localhost') instanceof require('vagent-base').Agent);
  assert.deepEqual(Object.keys(require('../package.json').dependencies).sort(),['vagent-base','vdebug']);assert.deepEqual(HttpsProxyAgent.protocols,['http','https']);
});
for(const secureProxy of [false,true])for(const secureOrigin of [false,true])test((secureOrigin?'HTTPS':'HTTP')+' through '+(secureProxy?'HTTPS':'HTTP')+' proxy with native keep-alive',async t=>{
  const target=await origin(t,secureOrigin,(q,s)=>s.end(q.headers.authorization||'missing'));const p=await proxy(t,secureProxy);
  const a=agent(t,p.url,{keepAlive:true,maxSockets:1,rejectUnauthorized:false});let events=0;a.on('proxyConnect',c=>{events++;assert.equal(c.statusCode,200);});
  for(let i=0;i<3;i++)assert.equal((await request(target.url,{agent:a,rejectUnauthorized:false,headers:{authorization:'destination-only'}})).body,'destination-only');
  assert.equal(p.requests.length,1);assert.equal(events,1);assert.equal(p.requests[0].headers.authorization,undefined);
});
test('proxy certificate policy never disables destination verification',async t=>{
  const target=await origin(t,true),p=await proxy(t,true),a=agent(t,p.url,{rejectUnauthorized:false});
  await assert.rejects(request(target.url,{agent:a}),/self.signed|certificate/i);
});
test('HTTPS proxy certificates are verified by default',async t=>{
  const target=await origin(t),p=await proxy(t,true),a=agent(t,p.url);await assert.rejects(request(target.url,{agent:a}),/self.signed|certificate/i);
});
test('proxy URLs, TLS bytes and static headers are isolated snapshots',()=>{
  const url=new URL('https://alice:secret@proxy.test:443'),ca=Buffer.from('abc'),headers={Foo:'one'};
  const a=new HttpsProxyAgent(url,{ca,headers});url.hostname='evil.test';ca.fill(0);headers.Foo='two';a.proxy.hostname='ignored.test';
  assert.equal(a.proxy.hostname,'proxy.test');assert.equal(a.proxyHeaders.Foo,'one');assert.equal(a.connectOpts.ca.toString(),'abc');a.connectOpts.ca.fill(0);assert.equal(a.connectOpts.ca.toString(),'abc');
});
test('invalid proxy configuration fails before a connection starts',()=>{
  for(const url of ['',null,{},'ftp://localhost','file:///tmp/socket','http://u%xx:p@localhost'])assert.throws(()=>new HttpsProxyAgent(url));
  for(const options of [null,[],{maxProxyHeaderSize:0},{maxProxyHeaderSize:Infinity},{ALPNProtocols:['h2']},{headers:{'bad\r\nname':'x'}},{headers:{foo:'x\r\nInjected: yes'}},{headers:{Foo:'a',foo:'b'}},{headers:{'Content-Length':1}},{headers:{'Transfer-Encoding':'chunked'}}])assert.throws(()=>new HttpsProxyAgent('http://localhost',options));
});
test('credentials and reserved headers are case-insensitive and providers are not mutated',async t=>{
  const target=await origin(t),p=await proxy(t);const fields=Object.freeze({host:'wrong','proxy-authorization':'wrong','proxy-connection':'keep-alive',Foo:'é'});
  const a=agent(t,p.url.replace('://','://alice%3Aname:p%40ss@'),{headers:()=>fields});
  await request(target.url,{agent:a});const h=p.requests[0].headers;
  assert.equal(h.host,new URL(target.url).host);assert.equal(h['proxy-authorization'],'Basic '+Buffer.from('alice:name:p@ss').toString('base64'));assert.equal(h['proxy-connection'],'keep-alive');assert.equal(h.foo,'é');assert.equal(fields.host,'wrong');
});
test('dynamic headers are read for each new tunnel',async t=>{
  const target=await origin(t),p=await proxy(t);let calls=0;const a=agent(t,p.url,{headers:()=>({Number:++calls})});
  await request(target.url,{agent:a});await request(target.url,{agent:a});assert.equal(calls,2);assert.deepEqual(p.requests.map(q=>q.headers.number),['1','2']);
});
test('invalid dynamic headers fail without opening a proxy socket',async t=>{
  let connects=0;const p=await proxy(t);p.server.on('connection',()=>connects++);
  const a=agent(t,p.url,{headers:()=>({foo:'bad\r\nvalue'})});await assert.rejects(request('http://example.invalid',{agent:a}),/Invalid proxy header value/);assert.equal(connects,0);
});
test('non-2xx replays the response without forwarding destination secrets',async t=>{
  let received='';const server=await start(t,net.createServer(s=>{s.on('data',b=>{received+=b.toString();if(received.includes('\r\n\r\n'))s.write('HTTP/1.1 407 Auth required\r\nContent-Length: 6\r\n\r\ndenied');});}));
  const a=agent(t,'http://127.0.0.1:'+server.address().port);a.on('proxyConnect',response=>{response.statusCode=200;});
  const result=await request('http://destination.invalid',{agent:a,headers:{Authorization:'origin-secret'}});assert.equal(result.status,407);assert.equal(result.body,'denied');assert(!received.includes('origin-secret'));
});
test('coalesced tunnel bytes are returned intact after every successful 2xx status',async t=>{
  for(const code of [200,201,204,299]){
    const server=await start(t,net.createServer(s=>s.once('data',()=>s.write('HTTP/1.1 '+code+' Tunnel\r\n\r\nHTTP/1.1 200 OK\r\nContent-Length: 5\r\n\r\nhello'))));
    const a=agent(t,'http://127.0.0.1:'+server.address().port);assert.equal((await request('http://unused.test',{agent:a})).body,'hello');
  }
});
test('destroying a request during CONNECT closes the real proxy socket',async t=>{
  let connected;const accepted=new Promise(r=>connected=r);const server=await start(t,net.createServer(s=>connected(s)));
  const a=agent(t,'http://127.0.0.1:'+server.address().port);const q=http.get('http://unused.test',{agent:a});q.on('error',()=>{});const socket=await accepted;socket.resume();const closed=once(socket,'close');q.destroy();await closed;assert.equal(a.totalSocketCount,0);
});
test('connection deadlines close silent proxy sockets and release capacity',async t=>{
  let accepted;const seen=new Promise(r=>accepted=r);const server=await start(t,net.createServer(s=>{s.resume();accepted(s);}));
  const a=agent(t,'http://127.0.0.1:'+server.address().port,{connectTimeout:20,maxSockets:1});const promise=request('http://unused.test',{agent:a});const socket=await seen;const closed=once(socket,'close');await assert.rejects(promise,{code:'ETIMEDOUT'});await closed;assert.equal(a.totalSocketCount,0);
});
test('agent destruction closes unfinished tunnels and queued requests',async t=>{
  let accepted;const seen=new Promise(r=>accepted=r);const server=await start(t,net.createServer(s=>{s.resume();accepted(s);}));
  const a=agent(t,'http://127.0.0.1:'+server.address().port,{maxSockets:1});const results=Promise.allSettled([request('http://unused.test',{agent:a}),request('http://unused.test',{agent:a})]);const socket=await seen;const closed=once(socket,'close');a.destroy();assert((await results).every(x=>x.status==='rejected'));await closed;
});
test('proxyConnect listener exceptions and cancellation close the tunnel',async t=>{
  for(const action of ['throw','destroy']){const p=await proxy(t),target=await origin(t),a=agent(t,p.url);a.on('proxyConnect',()=>{if(action==='throw')throw Error('listener');a.destroy();});await assert.rejects(request(target.url,{agent:a}));}
});
test('header size failures release the queue for subsequent requests',async t=>{
  let count=0;const server=await start(t,net.createServer(s=>s.once('data',()=>{if(count++===0)s.write('HTTP/1.1 200 OK\r\nX: '+'x'.repeat(1000));else s.write('HTTP/1.1 200 OK\r\n\r\nHTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok');})));
  const a=agent(t,'http://127.0.0.1:'+server.address().port,{maxSockets:1,maxProxyHeaderSize:128});const results=await Promise.allSettled([request('http://unused.test',{agent:a}),request('http://unused.test',{agent:a})]);assert.equal(results[0].reason.code,'ERR_PROXY_HEADER_SIZE');assert.equal(results[1].value.body,'ok');
});
test('parser handles every split boundary, duplicate fields and prototype names',()=>{
  const wire=Buffer.from('HTTP/1.1 200 OK\r\n__proto__: safe\r\nX: one\r\nx: two\r\n\r\ntail');
  for(let split=1;split<wire.length-4;split++){const p=new HeaderParser();let result=p.write(wire.subarray(0,split));if(!result)result=p.write(wire.subarray(split));assert.equal(result.connect.statusCode,200);assert.equal(Object.getPrototypeOf(result.connect.headers),null);assert.equal(result.connect.headers.__proto__,'safe');assert.deepEqual(result.connect.headers.x,['one','two']);assert.equal(result.head.toString(),'tail');}
});
test('parser rejects malformed status and fields without echoing proxy text',()=>{
  for(const value of ['BOGUS 200 OK\r\n\r\n','HTTP/1.1 200 OK\n\r\n\r\n','HTTP/1.1 20x secret\r\n\r\n','HTTP/1.1 200 OK\r\nsecret\r\n\r\n','HTTP/1.1 200 OK\r\n X: secret\r\n\r\n','HTTP/1.1 200 OK\r\nX: secret\0\r\n\r\n'])assert.throws(()=>new HeaderParser().write(Buffer.from(value)),e=>e.code==='ERR_PROXY_RESPONSE'&&!e.message.includes('secret'));
});
test('informational responses share the same byte budget and preserve final bytes',()=>{
  const first='HTTP/1.1 103 Early Hints\r\n\r\n',last='HTTP/1.1 200 OK\r\n\r\n';const p=new HeaderParser(first.length+last.length);const r=p.write(Buffer.from(first+last+'bytes'));assert.equal(r.head.toString(),'bytes');assert.equal(r.connect.statusCode,200);
  assert.throws(()=>new HeaderParser(first.length+last.length-1).write(Buffer.from(first+last)),{code:'ERR_PROXY_HEADER_SIZE'});
  assert.throws(()=>new HeaderParser().write(Buffer.from('HTTP/1.1 101 Switching\r\n\r\n')),{code:'ERR_PROXY_RESPONSE'});
});
test('fragmented headers have exact limits and preserve Latin-1 values',()=>{
  const wire=Buffer.from('HTTP/1.0 200 OK\r\nX: é\r\n\r\n','latin1');const p=new HeaderParser(wire.length);let r;for(const byte of wire)r=p.write(Buffer.from([byte]));assert.equal(r.connect.headers.x,'é');assert.throws(()=>new HeaderParser(wire.length-1).write(wire),{code:'ERR_PROXY_HEADER_SIZE'});
});
test('early close and read errors settle the parser and detach listeners',async()=>{
  for(const mode of ['close','end','error']){const socket=new PassThrough();const result=readResponse(socket,100);if(mode==='close')socket.destroy();else if(mode==='end')socket.end('HTTP/1.');else socket.destroy(Error('offline'));await assert.rejects(result);for(const event of ['readable','end','close','error'])assert.equal(socket.listenerCount(event),0);}
});
test('destination validation and IPv6 authorities are explicit',async()=>{
  const a=new HttpsProxyAgent('http://localhost:1');const q=new EventEmitter();q.destroyed=false;
  for(const o of [{host:'bad\r\nHost: x',port:80},{host:'good\n',port:80},{host:'good',port:'80\n'},{host:'[]',port:80},{host:'good',port:0},{host:'good',port:'80junk'},{host:'',port:80}])await assert.rejects(a.connect(q,o));
  const {authority}=require('../lib/options');assert.equal(authority({host:'::1',port:'443'}).text,'[::1]:443');assert.equal(authority({host:'[::1]',port:443}).text,'[::1]:443');
});
test('debug output omits proxy credentials and custom authorization headers',()=>{
  const {spawnSync}=require('node:child_process');
  const source="const {HttpsProxyAgent}=require('./packages/vhttps-proxy-agent');new HttpsProxyAgent('http://secret-user:secret-pass@proxy.test',{headers:{'Proxy-Authorization':'secret-header'}});";
  const r=spawnSync(process.execPath,['-e',source],{cwd:require('node:path').resolve(__dirname,'../../..'),env:{...process.env,DEBUG:'https-proxy-agent',DEBUG_COLORS:'0'},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.match(r.stderr,/proxy.test/);assert.doesNotMatch(r.stderr,/secret-user|secret-pass|secret-header/);
});
test('sequential informational responses can be fragmented at every byte',()=>{
  const p=new HeaderParser(),bytes=Buffer.from('HTTP/1.1 100 Continue\r\n\r\nHTTP/1.1 103 Early\r\nLink: x\r\n\r\nHTTP/1.1 200 OK\r\n\r\n');let result;
  for(const byte of bytes)result=p.write(Buffer.from([byte]));assert.equal(result.connect.statusCode,200);
});

test('proxy and destination SNI are independent',async t=>{
  const target=await origin(t,true),p=await proxy(t,true);let proxyName,targetName;
  p.server.on('secureConnection',s=>{proxyName=s.servername;});target.server.on('secureConnection',s=>targetName=s.servername);
  const a=agent(t,p.url,{servername:'proxy.test',rejectUnauthorized:false});
  assert.equal((await request(target.url,{agent:a,servername:'origin.test',rejectUnauthorized:false})).body,'ok');
  assert.equal(proxyName,'proxy.test');assert.equal(targetName,'origin.test');assert.deepEqual(a.connectOpts.ALPNProtocols,['http/1.1']);
});
test('nested TLS records and byte arrays are detached snapshots',()=>{
  const pem=Buffer.from('abc'),key=[{pem,passphrase:'one'}];const a=new HttpsProxyAgent('https://proxy.test',{key});
  pem.fill(0);key[0].passphrase='two';assert.equal(a.connectOpts.key[0].pem.toString(),'abc');assert.equal(a.connectOpts.key[0].passphrase,'one');
  a.connectOpts.key[0].pem.fill(0);assert.equal(a.connectOpts.key[0].pem.toString(),'abc');
});
test('changing keepAlive updates the next CONNECT default header',async t=>{
  const target=await origin(t),p=await proxy(t),a=agent(t,p.url);await request(target.url,{agent:a});a.keepAlive=true;await request(target.url,{agent:a});
  assert.deepEqual(p.requests.map(q=>q.headers['proxy-connection']),['close','Keep-Alive']);
});
test('aborting a request during CONNECT closes the real proxy socket',async t=>{
  let accepted;const seen=new Promise(r=>accepted=r);const server=await start(t,net.createServer(s=>{s.resume();accepted(s);}));
  const a=agent(t,'http://127.0.0.1:'+server.address().port);const q=http.get('http://unused.test',{agent:a});q.on('error',()=>{});
  const socket=await seen,closed=once(socket,'close');q.abort();await closed;assert.equal(a.totalSocketCount,0);
});

test('long-field fast path still validates every possible byte',()=>{
  for(let byte=0;byte<256;byte++){
    const wire=Buffer.concat([Buffer.from('HTTP/1.1 200 OK\r\nX: '+'a'.repeat(256)),Buffer.from([byte]),Buffer.from('z\r\n\r\n')]);
    if(byte<32&&byte!==9||byte===127)assert.throws(()=>new HeaderParser().write(wire),{code:'ERR_PROXY_RESPONSE'});
    else assert.equal(new HeaderParser().write(wire).connect.headers.x.charCodeAt(256),byte);
  }
});

test('long-field validation rejects terminal bare newlines and control bytes',()=>{
  for(const byte of [0,10,13,127])for(const leading of [false,true]){
    const text=Buffer.alloc(300,97),bad=Buffer.from([byte]);
    const wire=Buffer.concat([Buffer.from('HTTP/1.1 200 OK\r\nX: '),...(leading?[bad,text]:[text,bad]),Buffer.from('\r\n\r\n')]);
    assert.throws(()=>new HeaderParser().write(wire),{code:'ERR_PROXY_RESPONSE'});
  }
});
