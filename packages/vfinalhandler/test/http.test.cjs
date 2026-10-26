'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const http2 = require('node:http2');
const { Writable } = require('node:stream');
const { setImmediate: tick } = require('node:timers/promises');
const finalhandler = require('..');
const upstream = require('./load-upstream.cjs');

async function listen(t, listener, protocol = http) {
  const server = protocol.createServer(listener);
  const sessions = new Set();
  server.on('session', session => { sessions.add(session); session.on('close', () => sessions.delete(session)); });
  t.after(async () => {
    for (const session of sessions) session.destroy();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

function request(server, path, { method = 'GET', body, agent = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, agent }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, message: res.statusMessage, headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'), reusedSocket: req.reusedSocket }));
    });
    req.on('error', reject); req.end(body);
  });
}

test('real HTTP/1 responses cover errors, 404s, HEAD, and draining unread bodies', { timeout: 10000 }, async t => {
  const server = await listen(t, (req, res) => {
    const done = finalhandler(req, res, { env: 'production' });
    if (req.url === '/error') done(Object.assign(new Error('private details'), { status: 403 }));
    else if (req.url === '/unknown') done({ status: 499 });
    else if (req.url === '/invalid') { res.statusCode = NaN; done(new Error('invalid')); }
    else { done(); done(new Error('duplicate')); }
  });
  const missing = await request(server, '/missing?secret=1');
  assert.equal(missing.status, 404); assert.match(missing.body, /Cannot GET \/missing/);
  assert.doesNotMatch(missing.body, /secret/);
  const head = await request(server, '/error', { method: 'HEAD' });
  const error = await request(server, '/error');
  assert.equal(error.status, 403); assert.equal(error.message, 'Forbidden');
  assert.doesNotMatch(error.body, /private details/); assert.equal(head.body, '');
  assert.equal(head.headers['content-length'], error.headers['content-length']);
  assert.equal(Number(error.headers['content-length']), Buffer.byteLength(error.body));
  assert.equal(error.headers['content-security-policy'], "default-src 'none'");
  assert.equal(error.headers['x-content-type-options'], 'nosniff');
  assert.equal((await request(server, '/unknown')).message, 'Unknown Error');
  assert.equal((await request(server, '/invalid')).status, 500);
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 }); t.after(() => agent.destroy());
  const posted = await request(server, '/unread', { method: 'POST', body: 'x'.repeat(256 * 1024), agent });
  assert.equal(posted.status, 404); assert.match(posted.body, /Cannot POST/);
  const reused = await request(server, '/next', { agent });
  assert.equal(reused.status, 404); assert.equal(reused.reusedSocket, true);
});

test('real HTTP unpipes an active destination and drains the remaining body', { timeout: 10000 }, async t => {
  let unpiped = false;
  const server = await listen(t, (req, res) => {
    const destination = new Writable({ write(_chunk, _encoding, callback) { setImmediate(callback); } });
    destination.on('unpipe', () => { unpiped = true; });
    req.pipe(destination);
    req.once('data', () => finalhandler(req, res)({ status: 400 }));
  });
  const result = await request(server, '/piped', { method: 'POST', body: 'x'.repeat(256 * 1024) });
  assert.equal(result.status, 400); assert.equal(unpiped, true);
});

test('removes conflicting HTTP/1 framing that breaks the upstream response', { timeout: 10000 }, async t => {
  const before = await listen(t, (req, res) => {
    res.setHeader('Transfer-Encoding', 'chunked'); upstream(req, res)();
  });
  await assert.rejects(request(before, '/'), error =>
    /^HPE_(UNEXPECTED|INVALID)_CONTENT_LENGTH$/.test(error.code));
  const after = await listen(t, (req, res) => {
    res.setHeader('Transfer-Encoding', 'chunked'); res.setHeader('Trailer', 'Digest');
    finalhandler(req, res)({ status: 429, headers: { 'TRANSFER-ENCODING': 'chunked', Trailer: 'Digest',
      'Content-Encoding': 'gzip', 'Content-Language': 'nl', 'Content-Range': 'bytes 0-1/2',
      'Retry-After': '5', 'Set-Cookie': ['a=1', 'b=2'] } });
  });
  const result = await request(after, '/');
  assert.equal(result.status, 429); assert.equal(result.headers['retry-after'], '5');
  assert.deepEqual(result.headers['set-cookie'], ['a=1', 'b=2']);
  for (const name of ['transfer-encoding', 'trailer', 'content-encoding', 'content-range', 'content-language']) {
    assert.equal(result.headers[name], undefined);
  }
  assert.equal(Number(result.headers['content-length']), Buffer.byteLength(result.body));
});

test('an error after a completed response leaves the keep-alive connection usable', { timeout: 10000 }, async t => {
  const errors = [];
  const server = await listen(t, (req, res) => {
    const done = finalhandler(req, res, { onerror: error => errors.push(error) });
    res.end('finished'); done(new Error('late'));
  });
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 }); t.after(() => agent.destroy());
  assert.equal((await request(server, '/first', { agent })).body, 'finished');
  const second = await request(server, '/second', { agent });
  assert.equal(second.body, 'finished'); assert.equal(second.reusedSocket, true);
  await tick(); assert.equal(errors.length, 2);
});

test('a real client abort during draining releases request completion listeners', { timeout: 10000 }, async t => {
  let received; let closed;
  const ready = new Promise(resolve => { received = resolve; });
  const finished = new Promise(resolve => { closed = resolve; });
  let requestMessage; let responseMessage; let initialEndListeners;
  const server = await listen(t, (req, res) => {
    requestMessage = req; responseMessage = res;
    initialEndListeners = req.listenerCount('end');
    req.once('data', received);
    req.once('close', closed);
    finalhandler(req, res)();
  });
  const client = http.request({ host: '127.0.0.1', port: server.address().port, path: '/', method: 'POST' });
  client.on('error', () => {}); t.after(() => client.destroy());
  client.write('incomplete body'); await ready; client.destroy(); await finished; await tick();
  assert.equal(responseMessage.writableEnded, false);
  assert.equal(requestMessage.listenerCount('end'), initialEndListeners);
});

test('real HTTP/2 handles 404, HEAD, production errors, and replaced error headers', { timeout: 10000 }, async t => {
  const server = await listen(t, (req, res) => {
    const done = finalhandler(req, res, { env: 'production' });
    if (req.url === '/error') done({ status: 503, stack: 'private', headers: {
      'Retry-After': '5', 'Transfer-Encoding': 'chunked', Trailer: 'Digest', 'Content-Encoding': 'gzip',
    } });
    else done();
  }, http2);
  const client = http2.connect('http://127.0.0.1:' + server.address().port);
  t.after(() => client.destroy());
  function get(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const req = client.request({ ':path': path, ':method': method }); const chunks = []; let headers;
      req.on('response', value => { headers = value; }); req.on('data', chunk => chunks.push(chunk));
      req.on('error', reject); req.on('end', () => resolve({ headers, body: Buffer.concat(chunks).toString('utf8') }));
      req.end();
    });
  }
  const missing = await get('/missing?secret=1');
  assert.equal(missing.headers[':status'], 404); assert.match(missing.body, /Cannot GET \/missing/);
  const error = await get('/error'); const head = await get('/error', 'HEAD');
  assert.equal(error.headers[':status'], 503); assert.equal(error.headers['retry-after'], '5');
  assert.match(error.body, /Service Unavailable/); assert.doesNotMatch(error.body, /private/);
  assert.equal(error.headers['transfer-encoding'], undefined); assert.equal(error.headers.trailer, undefined);
  assert.equal(error.headers['content-encoding'], undefined);
  assert.equal(head.body, ''); assert.equal(head.headers['content-length'], error.headers['content-length']);
});
