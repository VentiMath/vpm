'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {once, getEventListeners} = require('node:events');
const {Readable} = require('node:stream');
const {gzipSync} = require('node:zlib');
const {Gaxios, GaxiosError} = require('..');
const client = () => new Gaxios({noProxy: ['*']});
async function server(t, handler) {
  const s = http.createServer(handler); s.listen(0, '127.0.0.1'); await once(s, 'listening');
  t.after(() => {s.closeAllConnections(); return new Promise(resolve => s.close(resolve));});
  return 'http://127.0.0.1:' + s.address().port;
}
test('default requests use native fetch; explicit agents use the VPM transport', async t => {
  const url = await server(t, (q, s) => s.end('ok'));
  const original = globalThis.fetch; let native = 0, connections = 0;
  globalThis.fetch = (...args) => {native++; return original(...args);};
  const agent = new http.Agent(); const connect = agent.createConnection;
  agent.createConnection = function(...args) {connections++; return connect.apply(this, args);};
  try {
    const result = await client().request({url});
    assert(result instanceof Response); assert(result.config.url instanceof URL); assert(result.headers instanceof Headers);
    assert.equal(native, 1);
    assert.equal((await client().request({url, agent})).data, 'ok');
    assert.equal(native, 1); assert.equal(connections, 1);
  } finally {globalThis.fetch = original; agent.destroy();}
});
test('fetch accepts native Request bodies and merges Headers without losing cookies', async t => {
  const url = await server(t, (q, s) => {s.setHeader('x-request', q.headers['x-request']); q.pipe(s);});
  const c = client();
  const result = await c.fetch(new Request(url, {method: 'POST', headers: {'x-request': 'old'}, body: 'request body'}), {headers: {'x-request': 'new'}, responseType: 'text'});
  assert.equal(result.data, 'request body'); assert.equal(result.headers.get('x-request'), 'new');
  const headers = Gaxios.mergeHeaders(new Headers({'set-cookie': 'a=1'}), new Headers([['set-cookie', 'b=2'], ['set-cookie', 'c=3']]));
  assert.deepEqual(headers.getSetCookie(), ['a=1', 'b=2', 'c=3']);
});
test('native redirects enforce limits and strip credentials across ports', async t => {
  const destination = await server(t, (q, s) => {s.setHeader('content-type', 'application/json'); s.end(JSON.stringify({headers: q.headers, method: q.method}));});
  const url = await server(t, (q, s) => {s.writeHead(303, {location: destination}); s.end();});
  const c = client();
  const result = await c.request({url, method: 'POST', data: 'body', headers: {authorization: 'secret', cookie: 'private', 'proxy-authorization': 'private'}});
  assert.equal(result.data.method, 'GET');
  for (const name of ['authorization', 'cookie', 'proxy-authorization', 'content-type']) assert.equal(result.data.headers[name], undefined);
  assert.equal(result.redirected, true); assert.equal(result.url, destination + '/');
  await assert.rejects(c.request({url, maxRedirects: 0}), e => e.error.type === 'max-redirect');
  await assert.rejects(c.request({url, redirect: 'error'}), e => e.error.type === 'no-redirect');
  assert.equal((await c.request({url, redirect: 'manual', validateStatus: () => true})).status, 303);
});
test('307 redirects cannot replay one-shot uploads', async t => {
  const url = await server(t, (q, s) => {q.resume(); s.writeHead(307, {location: '/again'}); s.end();});
  await assert.rejects(client().request({url, method: 'PUT', data: Readable.from(['upload'])}), e => e.error.type === 'unsupported-redirect');
});
test('native limits bound chunked and decompressed bodies, including streamed data', async t => {
  const url = await server(t, (q, s) => {
    if (q.url === '/gzip') {s.setHeader('content-encoding', 'gzip'); s.end(gzipSync('x'.repeat(1000)));}
    else {s.write('123'); setImmediate(() => s.end('456'));}
  });
  for (const path of ['/', '/gzip']) {
    await assert.rejects(client().request({url: url + path, maxContentLength: 4}), e => e.error.type === 'max-size');
    const result = await client().request({url: url + path, maxContentLength: 4, responseType: 'stream'});
    await assert.rejects(async () => {for await (const chunk of result.data) void chunk;}, e => e.type === 'max-size');
  }
});
test('bodyless responses work through native and explicit-agent transports', async t => {
  const url = await server(t, (q, s) => {s.statusCode = q.method === 'HEAD' ? 200 : Number(q.url.slice(1)); s.setHeader('content-length', q.method === 'HEAD' ? 100 : 0); s.end();});
  const agent = new http.Agent(); t.after(() => agent.destroy());
  for (const transport of [{}, {agent}]) for (const status of [204, 205, 304]) {
    const result = await client().request({url: url + '/' + status, ...transport, validateStatus: () => true});
    assert.equal(result.data, ''); assert.equal(result.body, null);
  }
  assert.equal((await client().request({url, method: 'HEAD', agent, maxContentLength: 1})).data, '');
});
test('deadlines cover delayed bodies and each retry receives a fresh signal', async t => {
  let attempts = 0;
  const url = await server(t, (q, s) => {
    if (q.url === '/retry' && ++attempts > 1) {s.end('ok'); return;}
    s.writeHead(200); s.flushHeaders();
  });
  await assert.rejects(client().request({url, timeout: 40}), e => e.code === 'TimeoutError');
  const retried = await client().request({url: url + '/retry', timeout: 40, retry: true, retryConfig: {retry: 1, retryDelay: 0}});
  assert.equal(retried.data, 'ok'); assert.equal(attempts, 2);
  for (const fetchImplementation of [undefined, fetch]) {
    const result = await client().request({url, timeout: 40, responseType: 'stream', fetchImplementation});
    await assert.rejects(async () => {for await (const chunk of result.data) void chunk;});
  }
});
test('caller cancellation and completed streams release signal listeners', async t => {
  const url = await server(t, (q, s) => s.end('ok'));
  const controller = new AbortController();
  for (const responseType of ['text', 'stream']) {
    const result = await client().request({url, responseType, signal: controller.signal});
    if (responseType === 'stream') for await (const chunk of result.data) void chunk;
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  }
  controller.abort(); await assert.rejects(client().request({url, signal: controller.signal}), e => e.code === 'AbortError');
});
test('streamed HTTP errors preserve body text with native custom fetch', async t => {
  const url = await server(t, (q, s) => {s.writeHead(400); s.end('remote error body');});
  for (const fetchImplementation of [undefined, fetch]) {
    await assert.rejects(client().request({url, responseType: 'stream', fetchImplementation}), e => {
      assert.equal(e.status, 400); assert.equal(e.response.data, 'remote error body');
      assert.equal(e.message, 'remote error body'); return true;
    });
  }
});
test('AIP errors retain cause, late redaction protects snapshots and retries keep credentials', async t => {
  let attempts = 0;
  const url = await server(t, (q, s) => {
    assert.equal(q.headers.authorization, 'secret'); q.resume(); attempts++;
    s.writeHead(503, {'content-type': 'application/json', 'set-cookie': 'private'});
    s.end(JSON.stringify({error: {code: 503, status: 'UNAVAILABLE', message: 'Unavailable', details: [{reason: 'retry'}]}}));
  });
  const headers = new Headers({authorization: 'secret'}), data = new URLSearchParams({client_secret: 'private'});
  await assert.rejects(client().request({url: new URL(url), method: 'PUT', headers, data, retry: true, retryConfig: {retry: 1, retryDelay: 0}}), e => {
    assert(e instanceof GaxiosError); assert.equal(e.message, 'Unavailable'); assert.equal(e.cause.status, 'UNAVAILABLE');
    assert.notEqual(e.config.headers.get('authorization'), 'secret'); assert.notEqual(e.config.body.get('client_secret'), 'private');
    assert.notEqual(e.response.headers.get('set-cookie'), 'private'); return true;
  });
  assert.equal(attempts, 2); assert.equal(headers.get('authorization'), 'secret'); assert.equal(data.get('client_secret'), 'private');
});
for (const version of [10, 11]) test(`Google Auth ${version} OAuth credentials and authenticated requests use the VPM client`, async t => {
  const {OAuth2Client} = require('../../../scripts/google-http-conformance/node_modules/google-auth' + version);
  let refreshes = 0;
  const url = await server(t, (q, s) => {
    s.setHeader('content-type', 'application/json');
    if (q.url === '/token') {let body = ''; q.on('data', chunk => body += chunk); q.on('end', () => {assert.equal(new URLSearchParams(body).get('refresh_token'), 'refresh'); refreshes++; s.end(JSON.stringify({access_token: 'access', expires_in: 3600, token_type: 'Bearer'}));});}
    else {assert.equal(q.headers.authorization, 'Bearer access'); s.end('{"ok":true}');}
  });
  const auth = new OAuth2Client({clientId: 'id', clientSecret: 'secret', endpoints: {oauth2TokenUrl: url + '/token'}, transporter: client()});
  auth.setCredentials({refresh_token: 'refresh'});
  const result = await auth.request({url: url + '/resource'});
  assert.equal(result.data.ok, true); assert.equal(refreshes, 1);
  assert.equal((await auth.getRequestHeaders(url)).get('authorization'), 'Bearer access');
});
