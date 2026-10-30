'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const http = require('node:http'), net = require('node:net'), {once} = require('node:events');
const {HttpProxyAgent} = require('..'), {Agent} = require('vagent-base');
const {target} = require('../lib/options'), {buffered, rebuild} = require('../lib/request');
const {proxy, request, start} = require('./helpers.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function agent(t, url, options) {const result = new HttpProxyAgent(url, options); t.after(() => result.destroy()); return result;}
test('CommonJS and ESM named exports share a vagent-base subclass', async () => {
  assert.equal((await import('../index.js')).HttpProxyAgent, HttpProxyAgent);
  assert(new HttpProxyAgent('http://localhost') instanceof Agent);
  assert.deepEqual(HttpProxyAgent.protocols, ['http', 'https']);
  assert.deepEqual(Object.keys(require('../package.json').dependencies).sort(), ['vagent-base', 'vdebug']);
});
for (const secure of [false, true]) test('HTTP GET and streamed binary POST through ' + (secure ? 'TLS' : 'TCP') + ' proxy', async t => {
  const origin = await start(t, http.createServer((req, res) => req.pipe(res)));
  const p = await proxy(t, secure), a = agent(t, p.url, {rejectUnauthorized: false, keepAlive: true, maxSockets: 1});
  const url = 'http://127.0.0.1:' + origin.address().port + '/a?b=c';
  const body = Buffer.alloc(160 * 1024); for (let i = 0; i < body.length; i++) body[i] = i & 255;
  const chunks = Array.from({length: 20}, (_, i) => body.subarray(i * 8192, (i + 1) * 8192));
  assert.equal((await request(url, {agent: a})).status, 200);
  assert.deepEqual((await request(url, {agent: a, method: 'POST'}, chunks)).body, body);
  assert.deepEqual((await request(url, {agent: a, method: 'POST', headers: {'Content-Length': body.length}}, chunks)).body, body);
  assert(p.requests.every(req => req.url === url));
});
test('queued keep-alive requests prepare dynamic headers once per request', async t => {
  let calls = 0, connections = 0; const seen = [];
  const p = await proxy(t, false, (req, res) => {seen.push(req.headers.sequence); setTimeout(() => res.end('ok'), 5);});
  p.server.on('connection', () => connections++);
  const a = agent(t, p.url, {keepAlive: true, maxSockets: 1, headers: () => Object.freeze({Sequence: ++calls})});
  const results = await Promise.all(Array.from({length: 8}, () => request('http://unused.test/queue', {agent: a})));
  assert(results.every(result => result.body.toString() === 'ok')); assert.equal(calls, 8); assert.equal(connections, 1);
  assert.deepEqual(seen, ['1', '2', '3', '4', '5', '6', '7', '8']);
});
test('credentials, empty values, zero values and reserved decisions are case-insensitive', async t => {
  const fields = Object.freeze({'proxy-authorization': 'ignored', 'proxy-connection': 'keep-alive', Zero: 0, Empty: '', Multi: Object.freeze(['one', 'two'])});
  const p = await proxy(t, false, (req, res) => res.end(JSON.stringify(req.headers)));
  const a = agent(t, p.url.replace('://', '://alice%3Aname:p%40ss@'), {headers: () => fields});
  const data = JSON.parse((await request('http://unused.test/', {agent: a})).body);
  assert.equal(data['proxy-authorization'], 'Basic ' + Buffer.from('alice:name:p@ss').toString('base64'));
  assert.equal(data['proxy-connection'], 'keep-alive'); assert.equal(data.zero, '0'); assert.equal(data.empty, ''); assert.equal(data.multi, 'one, two');
  assert.equal(fields['proxy-authorization'], 'ignored');
});
test('URL and nested TLS configuration are detached from caller mutations', () => {
  const url = new URL('https://alice:secret@proxy.test'), bytes = Buffer.from('abc'), headers = {Foo: ['one']}, key = [{pem: bytes, passphrase: 'secret'}];
  const a = new HttpProxyAgent(url, {headers, key});
  url.host = 'wrong.test'; headers.Foo[0] = 'two'; bytes.fill(0); key[0].passphrase = 'changed'; a.proxy.host = 'ignored.test';
  assert.equal(a.proxy.host, 'proxy.test'); assert.deepEqual(a.proxyHeaders.Foo, ['one']);
  assert.equal(a.connectOpts.key[0].pem.toString(), 'abc'); assert.equal(a.connectOpts.key[0].passphrase, 'secret');
  a.connectOpts.key[0].pem.fill(0); assert.equal(a.connectOpts.key[0].pem.toString(), 'abc');
});
test('invalid configuration is rejected without echoing credentials', () => {
  for (const url of [null, {}, '', 'ftp://secret@proxy.test', 'http://secret%xy:pass@proxy.test']) assert.throws(() => new HttpProxyAgent(url), error => !error.message.includes('secret'));
  for (const options of [null, [], {negotiate: true}, {onProxyAuth() {}}, {connectTimeout: -1}, {connectTimeout: Infinity}, {ALPNProtocols: ['h2']}, {headers: []}, {headers: {'x\r\nsecret': 'x'}}, {headers: {Foo: 'secret\r\nX: y'}}, {headers: {Foo: 'a', foo: 'b'}}, ...['Host','Content-Length','Transfer-Encoding','Trailer'].map(name => ({headers: {[name]: 'x'}}))]) {
    assert.throws(() => new HttpProxyAgent('http://proxy.test', options), error => !error.message.includes('secret'));
  }
  assert.doesNotThrow(() => new HttpProxyAgent('http://proxy.test', {negotiate: false, connectTimeout: 0}));
});
test('bad dynamic headers fail before opening a socket', async t => {
  let connects = 0; const p = await proxy(t); p.server.on('connection', () => connects++);
  const a = agent(t, p.url, {headers: () => ({Foo: 'secret\r\nInjected: yes'})});
  await assert.rejects(request('http://unused.test/', {agent: a}), /Invalid proxy header/); assert.equal(connects, 0);
});
test('origin-form paths retain their authority, double slashes, dots and escapes', async t => {
  const p = await proxy(t, false, (req, res) => res.end(JSON.stringify({url: req.url, host: req.headers.host})));
  const a = agent(t, p.url);
  for (const path of ['//other.test/secret', '/a/../b/%2e%2e/%2F?q=%FF', '/a#fragment']) {
    const result = JSON.parse((await request('http://original.test:8080', {agent: a, path, headers: {Host: 'virtual.test'}})).body);
    assert.equal(result.url, 'http://original.test:8080' + path.split('#')[0]); assert.equal(result.host, 'virtual.test');
  }
});
test('IPv6 and absolute targets validate authority, credentials and ports', () => {
  assert.equal(target({path: '/x'}, {host: '::1', port: '8080'}), 'http://[::1]:8080/x');
  assert.equal(target({path: '/x'}, {host: '[::1]', port: 80}), 'http://[::1]/x');
  assert.equal(target({path: 'http://destination.test/x#f'}, {}), 'http://destination.test/x');
  for (const path of ['https://destination.test', 'http://secret:password@destination.test/', '/a\r\nb', '/a b', 'relative']) assert.throws(() => target({path}, {host: 'target.test'}));
  for (const options of [{host: 'x\n'}, {host: ''}, {host: 'target.test', port: '80junk'}, {host: 'target.test', port: 0}, {host: 'target.test', port: 65536}, {host: 'target.test', secureEndpoint: true}]) assert.throws(() => target({path: '/'}, options));
});
test('proxy response status, headers and body pass through without hidden retries', async t => {
  let calls = 0; const p = await proxy(t, false, (_req, res) => {calls++; res.writeHead(407, {'Proxy-Authenticate': 'Basic realm="test"'}); res.end('denied');});
  const result = await request('http://unused.test/', {agent: agent(t, p.url)});
  assert.equal(result.status, 407); assert.equal(result.body.toString(), 'denied'); assert.equal(result.headers['proxy-authenticate'], 'Basic realm="test"'); assert.equal(calls, 1);
});
test('TLS proxy certificates are verified before readiness events', async t => {
  const p = await proxy(t, true), a = agent(t, p.url); let ready = 0; a.on('proxyConnect', () => ready++);
  await assert.rejects(request('http://unused.test/', {agent: a}), /certificate|self.signed/i); assert.equal(ready, 0);
});
test('explicit CA trust and proxy SNI work with HTTP/1.1 configuration', async t => {
  const p = await proxy(t, true, (_req, res) => res.end('ok')); let name;
  p.server.on('secureConnection', socket => {name = socket.servername;});
  const a = agent(t, p.url, {ca: require('./helpers.cjs').ssl.cert, servername: 'CommonNameOrHostname'});
  assert.equal((await request('http://unused.test/', {agent: a})).body.toString(), 'ok'); assert.equal(name, 'CommonNameOrHostname'); assert.deepEqual(a.connectOpts.ALPNProtocols, ['http/1.1']);
});
for (const mode of ['destroy', 'abort', 'agent']) test(mode + ' cancels an unfinished TLS connection and queued work', async t => {
  let accept; const accepted = new Promise(resolve => accept = resolve);
  const server = await start(t, net.createServer(socket => {socket.resume(); accept(socket);}));
  const a = agent(t, 'https://127.0.0.1:' + server.address().port, {maxSockets: 1});
  const req = http.get('http://unused.test/', {agent: a}); req.on('error', () => {});
  const socket = await accepted, closed = once(socket, 'close');
  if (mode === 'agent') {
    const queued = request('http://unused.test/', {agent: a}); a.destroy(); await assert.rejects(queued);
  } else req[mode]();
  await closed; await delay(5); assert.equal(a.totalSocketCount, 0);
});
test('bounded TLS handshakes time out and release reserved capacity', async t => {
  const sockets = []; const server = await start(t, net.createServer(socket => {sockets.push(socket); socket.resume();}));
  const a = agent(t, 'https://127.0.0.1:' + server.address().port, {connectTimeout: 25, maxSockets: 1});
  const outcomes = await Promise.allSettled([request('http://unused.test/', {agent: a}), request('http://unused.test/', {agent: a})]);
  assert(outcomes.every(result => result.reason?.code === 'ETIMEDOUT')); await delay(10); assert(sockets.every(socket => socket.destroyed)); assert.equal(a.totalSocketCount, 0);
});
for (const mode of ['throw', 'destroy', 'socket-error']) test('readiness listener ' + mode + ' settles the request without leaked sockets', async t => {
  const p = await proxy(t, false, (_req, res) => res.end('unexpected')), a = agent(t, p.url);
  a.on('proxyConnect', ({socket}, req) => {if (mode === 'throw') throw Error('listener'); if (mode === 'destroy') req.destroy(); if (mode === 'socket-error') socket.destroy(Error('observer'));});
  await assert.rejects(request('http://unused.test/', {agent: a}));
});
test('diagnostic events and debug logs omit credentials, headers and URL query secrets', async t => {
  const p = await proxy(t, false, (_req, res) => res.end('ok'));
  const a = agent(t, p.url.replace('://', '://secret-user:secret-pass@') + '?secret-query#secret-fragment');
  const req = http.get('http://unused.test/', {agent: a}); let event;
  req.on('proxy', value => event = value); req.on('error', () => {});
  const [res] = await once(req, 'response'); res.resume(); await once(res, 'end');
  assert.equal(event.proxy, p.url + '/'); assert(event.socket);
  const result = require('node:child_process').spawnSync(process.execPath, ['-e', "new (require('./packages/vhttp-proxy-agent').HttpProxyAgent)('http://secret-user:secret-pass@proxy.test/?secret-query',{headers:{'Proxy-Authorization':'secret-header'}})"], {cwd: require('node:path').resolve(__dirname, '../../..'), env: {...process.env, DEBUG: 'http-proxy-agent', DEBUG_COLORS: '0'}, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /proxy.test/); assert.doesNotMatch(result.stderr, /secret-user|secret-pass|secret-query|secret-header/);
});
test('delayed delegation preserves buffered UTF-8, binary and chunked POST bodies', async t => {
  const origin = await start(t, http.createServer((req, res) => req.pipe(res))), p = await proxy(t), a = agent(t, p.url);
  class Deferred extends Agent {async connect() {await delay(5); return a;}}
  const delegate = new Deferred(); t.after(() => delegate.destroy());
  const url = 'http://127.0.0.1:' + origin.address().port;
  for (const chunks of [['héllo🙂'], [Buffer.from([0, 255, 13, 10, 128])], ['first🙂', Buffer.alloc(128 * 1024, 255), 'last']]) {
    assert.deepEqual((await request(url, {agent: delegate, method: 'POST'}, chunks)).body, Buffer.concat(chunks.map(chunk => Buffer.from(chunk))));
  }
});
test('buffer replacement checks exact prefixes and pending-byte accounting', () => {
  for (const binary of [false, true]) {
    const old = 'POST / HTTP/1.1\r\n\r\n', next = 'POST http://target.test/ HTTP/1.1\r\n\r\n', body = Buffer.from([0, 255, 1]); let pending = 0;
    const data = binary ? Buffer.concat([Buffer.from(old), body]) : old + 'body';
    const first = {data, encoding: binary ? undefined : 'utf8', callback() {}};
    const req = {_header: old, _headerSent: true, outputData: [first], outputSize: data.length, _onPendingData(value) {pending += value;}, _implicitHeader() {this._header = next; this._headerSent = false;}};
    const saved = buffered(req); req._header = null; rebuild(req, saved);
    assert.equal(req.outputSize, data.length + next.length - old.length); assert.equal(pending, next.length - old.length); assert.equal(req._headerSent, true);
    if (binary) assert.deepEqual(first.data.subarray(next.length), body); else assert.equal(first.data, next + 'body');
  }
  assert.throws(() => buffered({_header: 'sent', _headerSent: true, outputData: []}), /already|after/);
});
