'use strict';
const {test, afterEach} = require('node:test'), assert = require('node:assert/strict');
const http = require('node:http'), https = require('node:https');
const {once} = require('node:events'), {Readable} = require('node:stream'), {gzipSync} = require('node:zlib');
const {teenyRequest} = require('..'), agents = require('../lib/agents');
const {TeenyStatistics} = require('../lib/statistics');
const proxyHelpers = require('../../vhttp-proxy-agent/test/helpers.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const call = (options, request = teenyRequest) => new Promise((resolve, reject) => request({proxy: false, ...options}, (error, response, body) => error ? reject(error) : resolve({response, body})));
async function serve(t, handler, options) {
  const server = options ? https.createServer(options, handler) : http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {teenyRequest.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));});
  return {server, uri: `${options ? 'https' : 'http'}://127.0.0.1:${server.address().port}`};
}
afterEach(() => teenyRequest.close());
test('callback JSON, request metadata and immutable options', async t => {
  const {uri} = await serve(t, async (req, res) => {let data = ''; for await (const chunk of req) data += chunk; assert.equal(data, '{"hi":1}'); assert.equal(req.url, '/?existing=1&added=two'); res.writeHead(201, {'Content-Type': 'Application/JSON;charset=utf-8'}); res.end('{"ok":true}');});
  const headers = Object.freeze({'content-type': 'old', 'X-Test': 'yes'});
  const input = Object.freeze({uri: uri + '/?existing=1#fragment', qs: {added: 'two'}, headers, json: {hi: 1}, method: 'POST'});
  const {response, body} = await call(input);
  assert.deepEqual(body, {ok: true}); assert.equal(response.statusCode, 201); assert.equal(response.request.href, uri + '/?existing=1&added=two'); assert.equal(headers['content-type'], 'old'); assert(response instanceof Readable);
});
test('strings, exact byte windows, raw readable uploads, object JSON and defaults snapshots', async t => {
  const {uri} = await serve(t, async (req, res) => {const chunks = []; for await (const c of req) chunks.push(c); res.end(Buffer.concat(chunks));});
  const original = Buffer.from('!hello!'), view = new DataView(original.buffer, original.byteOffset + 1, 5);
  for (const body of ['hello', view, Readable.from(['hel', 'lo'])]) assert.equal((await call({uri, method: 'POST', body})).body, 'hello');
  assert.equal((await call({uri, method: 'POST', body: {hi: 1}})).body, '{"hi":1}');
  const defaults = {uri, method: 'POST', body: {hi: 1}, headers: {'X-Original': 'yes'}};
  const request = teenyRequest.defaults(defaults); defaults.body.hi = 2; defaults.headers['X-Original'] = 'changed';
  assert.equal((await call({}, request)).body, '{"hi":1}');
});
test('gzip callback decoding and stream byte preservation', async t => {
  const compressed = gzipSync('hello');
  const {uri} = await serve(t, (req, res) => {res.setHeader('Content-Encoding', 'gzip'); res.end(compressed);});
  assert.equal((await call({uri})).body, 'hello');
  const stream = teenyRequest({uri, proxy: false}); const chunks = []; for await (const c of stream) chunks.push(c); assert.deepEqual(Buffer.concat(chunks), compressed);
});
test('204 JSON completes exactly once with the upstream stream body shape', async t => {
  const {uri} = await serve(t, (req, res) => {res.writeHead(204, {'Content-Type': 'application/json'}); res.end();});
  let count = 0; const result = await new Promise((resolve, reject) => teenyRequest({uri, proxy: false, timeout: 50}, (e, r, b) => {count++; e ? reject(e) : resolve({r,b});}));
  assert(result.b instanceof Readable); assert.equal(result.r.body, result.b); await delay(70); assert.equal(count, 1);
});
test('malformed JSON errors do not expose response text or request secrets', async t => {
  const {uri} = await serve(t, (req, res) => {res.setHeader('Content-Type', 'application/json'); res.end('SECRET_RESPONSE');});
  await assert.rejects(call({uri: uri + '/?token=SECRET_QUERY'}), e => e.type === 'invalid-json' && !String(e.stack).includes('SECRET'));
});
test('callback and streamed response limits', async t => {
  const {uri} = await serve(t, (req, res) => res.end('123456'));
  await assert.rejects(call({uri, maxResponseSize: 5}), e => e.type === 'max-size');
  const s = teenyRequest({uri, proxy: false, maxResponseSize: 5}); await assert.rejects(async () => {for await (const c of s) void c;}, e => e.type === 'max-size');
});
test('lazy stream consumption, response shape and eventual backpressure', async t => {
  const bytes = Buffer.alloc(512 * 1024, 99);
  const {uri} = await serve(t, (req, res) => res.end(bytes));
  const s = teenyRequest({uri, proxy: false}); const [response] = await once(s, 'response');
  assert.equal(response.body._readableState.pipes.length, 0); assert.deepEqual(response.toJSON(), {headers: response.headers});
  await delay(10); assert.equal(s.readableLength, 0); let length = 0; for await (const c of s) length += c.length; assert.equal(length, bytes.length);
});
test('destroy before headers cancels the connection', async t => {
  let accepted; const ready = new Promise(resolve => accepted = resolve); let disconnected; const gone = new Promise(resolve => disconnected = resolve);
  const {uri} = await serve(t, (req, res) => {res.on('close', disconnected); accepted();});
  const s = teenyRequest({uri, proxy: false}); await ready; s.destroy(); await gone; assert(s.destroyed);
});
test('destroy after headers without reading cancels the connection', async t => {
  let disconnected; const gone = new Promise(resolve => disconnected = resolve);
  const {uri} = await serve(t, (req, res) => {res.on('close', disconnected); res.write('partial');});
  const s = teenyRequest({uri, proxy: false}); await once(s, 'response'); s.destroy(); await gone; assert(s.destroyed);
});
for (const mode of ['headers', 'body', 'redirect']) test('deadline covers ' + mode, async t => {
  const {uri} = await serve(t, (req, res) => {
    if (mode === 'body') res.write('partial');
    if (mode === 'redirect') {const timer = setTimeout(() => {res.writeHead(302, {Location: '/again'}); res.end();}, 20); res.on('close', () => clearTimeout(timer));}
  });
  const start = Date.now(); await assert.rejects(call({uri, timeout: 65}), e => e.code === 'ETIMEDOUT' && e.type === 'request-timeout'); assert(Date.now() - start < 1500);
});
test('external cancellation works before request and during body', async t => {
  let signalBody; const started = new Promise(resolve => signalBody = resolve);
  const {uri} = await serve(t, (req, res) => {res.write('partial'); signalBody();});
  const a = new AbortController(); a.abort(new Error('secret'));
  await assert.rejects(call({uri, signal: a.signal}), e => e.name === 'AbortError' && !e.message.includes('secret'));
  const b = new AbortController(), pending = call({uri, signal: b.signal}); await started; b.abort(); await assert.rejects(pending, e => e.name === 'AbortError');
});
test('multipart strings, byte windows and streams stay ordered and terminate', async t => {
  let wire, type;
  const {uri} = await serve(t, async (req, res) => {type = req.headers['content-type']; const chunks = []; for await (const c of req) chunks.push(c); wire = Buffer.concat(chunks).toString(); res.end('ok');});
  const buf = Buffer.from('!THIRD!'); const second = Readable.from((async function* () {yield 'SEC'; await delay(5); yield 'OND';})());
  const parts = [{body: 'FIRST'}, {body: second, 'Content-Type': 'text/plain'}, {body: buf.subarray(1, -1)}];
  assert.equal((await call({uri, method: 'POST', multipart: parts})).body, 'ok');
  const boundary = type.split('boundary=')[1]; assert.equal(wire, `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\nFIRST\r\n--${boundary}\r\nContent-Type: text/plain\r\n\r\nSECOND\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\nTHIRD\r\n--${boundary}--`);
  assert.equal((await call({uri, method: 'POST', multipart: [{body: 'a'}, {body: 'b'}]})).body, 'ok');
});
test('multipart cancellation destroys a stalled current and unstarted input', async t => {
  const {uri} = await serve(t, (req, res) => req.resume());
  const a = new Readable({read(){this.push('partial'); this._read = () => {};}}), b = new Readable({read(){}});
  await assert.rejects(call({uri, method: 'POST', multipart: [{body: a}, {body: b}], timeout: 40}), e => e.code === 'ETIMEDOUT');
  assert(a.destroyed); assert(b.destroyed);
});
test('multipart future input errors reject once without exposing error details', async t => {
  const {uri} = await serve(t, (req, res) => req.resume());
  const a = new Readable({read(){}}), b = new Readable({read(){}});
  const pending = call({uri, method: 'POST', multipart: [{body: a}, {body: b}]}); b.destroy(new Error('secret input path'));
  await assert.rejects(pending, e => !String(e.stack).includes('secret')); assert(a.destroyed);
});
test('statistics reset during flight leaves both instances nonnegative', async t => {
  let release; const {uri} = await serve(t, (req, res) => {release = () => res.end('ok');});
  teenyRequest.resetStats(); const original = teenyRequest.stats; const pending = call({uri});
  while (!release) await delay(1);
  assert.equal(original.counters.concurrentRequests, 1); teenyRequest.resetStats(); release(); await pending;
  assert.equal(original.counters.concurrentRequests, 0); assert.equal(teenyRequest.stats.counters.concurrentRequests, 0);
  const stats = new TeenyStatistics(); stats.requestFinished(); assert.equal(stats.counters.concurrentRequests, 0);
});
test('pool cache isolates configuration, snapshots inputs and stays bounded', () => {
  const options = {forever: true, proxy: false, pool: {maxSockets: 2}};
  const a = agents.getAgent('http://example.test', options), same = agents.getAgent('http://else.test', options);
  assert.equal(a, same); options.pool.maxSockets = 3; const b = agents.getAgent('http://example.test', options); assert.notEqual(a,b); assert.equal(a.maxSockets, 2);
  for (let i = 1; i < 100; i++) agents.getAgent('http://example.test', {forever: true, proxy: false, pool: {maxSockets: i}});
  assert.equal(agents.pool.size, 64);
});
test('NO_PROXY supports exact names, suffixes, ports and IPv6 without partial matches', () => {
  for (const [url, rule, expected] of [['http://a.example.test', '.example.test', true], ['http://example.test', '.example.test', false], ['http://badexample.test', 'example.test', false], ['https://a.test', 'a.test:443', true], ['http://a.test:8080', 'a.test:80', false], ['http://[::1]:8080', '[::1]:8080', true]]) assert.equal(agents.bypass(new URL(url), rule), expected);
});
for (const secure of [false,true]) test((secure ? 'TLS' : 'HTTP') + ' forwarding, proxy auth and forever pool reuse', async t => {
  const target = await serve(t, (req, res) => res.end('ok'));
  const p = await proxyHelpers.proxy(t, secure); const proxyUrl = new URL(p.url); proxyUrl.username = 'user'; proxyUrl.password = 'pass';
  let first; for (let i = 0; i < 2; i++) {const result = await call({uri: target.uri, proxy: proxyUrl.href, forever: true, pool: {ca: proxyHelpers.ssl.cert, servername: 'CommonNameOrHostname'}}); assert.equal(result.body, 'ok'); if (first) assert.equal(result.response.request.agent, first); first = result.response.request.agent;}
  for(const request of p.requests) assert.equal(request.headers['proxy-authorization'], 'Basic ' + Buffer.from('user:pass').toString('base64'));
});
test('TLS origin trust options are isolated in the forever pool', async t => {
  const {uri} = await serve(t, (req, res) => res.end('secure'), proxyHelpers.ssl);
  const pool = {ca: proxyHelpers.ssl.cert, servername: 'CommonNameOrHostname'};
  assert.equal((await call({uri, forever: true, pool})).body, 'secure');
  await assert.rejects(call({uri, forever: true}), e => e.type === 'system');
});
test('invalid inputs fail before starting requests', () => {
  for (const options of [{uri: ''}, {uri: 'file:///secret'}, {uri: 'http://user:secret@test'}, {uri: 'http://test', timeout: -1}, {uri: 'http://test', timeout: Infinity}, {uri: 'http://test', headers: {'x-secret': 'secret\r\nvalue'}}, {uri: 'http://test', maxResponseSize: -1}, {uri: 'http://test', multipart: []}]) assert.throws(() => teenyRequest(options, () => {}));
  assert.throws(() => teenyRequest({uri: 'http://test', multipart: [{body: 'a'}]}), /callback/);
});
test('header pairs and native Headers are accepted without mutation', async t => {
  const {uri} = await serve(t, (req, res) => res.end(req.headers['x-pair']));
  for (const headers of [Object.freeze([Object.freeze(['X-Pair','value'])]), new Headers({'X-Pair':'value'})]) assert.equal((await call({uri, headers})).body, 'value');
  assert.equal((await call({uri, headers: [['X-Pair','first'],['X-Pair','second'],['x-pair','third']]})).body, 'first, second, third');
  assert.throws(() => teenyRequest({uri, headers:'wrong'}), /headers/);
});
test('cross-origin redirects remove credentials on the wire', async t => {
  const target = await serve(t, (req, res) => {assert.equal(req.headers.authorization, undefined); assert.equal(req.headers.cookie, undefined); assert.equal(req.headers['proxy-authorization'], undefined); res.end('ok');});
  const source = await serve(t, (req, res) => {res.writeHead(302, {Location: target.uri}); res.end();});
  assert.equal((await call({uri: source.uri, headers: {Authorization:'Bearer secret',Cookie:'sid=secret','Proxy-Authorization':'Basic secret'}})).body, 'ok');
});
test('closing the agent pool does not interrupt an active response', async t => {
  let release; const {uri} = await serve(t, (req, res) => {res.write('a'); release = () => res.end('b');});
  const s = teenyRequest({uri, proxy:false, forever:true}); await once(s,'response'); teenyRequest.close(); release();
  let data = ''; for await (const c of s) data += c; assert.equal(data,'ab'); assert.equal(agents.pool.size,0);
});
test('stream deadline and abort errors are delivered once', async t => {
  const {uri} = await serve(t, (req, res) => res.write('partial'));
  for (const timeout of [0,30]) {
    const stream = teenyRequest({uri, proxy:false, timeout}); let errors = 0;
    const error = new Promise(resolve => stream.on('error', e => {errors++; resolve(e);}));
    await once(stream,'response'); stream.resume(); if (!timeout) stream.abort();
    const caught = await error; assert.equal(caught.name,'AbortError'); if(timeout) assert.equal(caught.code,'ETIMEDOUT');
    await delay(5); assert.equal(errors,1);
  }
});
test('callback decoding preserves split multibyte UTF-8 and detects premature close', async t => {
  const bytes = Buffer.from('{"value":"🌎 café"}');
  const {uri} = await serve(t, (req,res) => {
    res.setHeader('Content-Type','application/json');
    if(req.url==='/truncated'){res.setHeader('Content-Length',1000);res.write('partial');setTimeout(()=>res.destroy(),5);return;}
    let i=0;const timer=setInterval(()=>{if(i===bytes.length){clearInterval(timer);res.end();}else {res.write(bytes.subarray(i,i+1));i++;}},1);res.on('close',()=>clearInterval(timer));
  });
  assert.deepEqual((await call({uri})).body,{value:'🌎 café'});
  await assert.rejects(call({uri:uri+'/truncated'}));
});
