'use strict';
// Caller-level checks, not a claim of complete node-fetch 3 API parity.
// --upstream selects the published Fetch 3 implementation; --native probes the
// runtime implementation and explicitly records its different transport contract.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {Readable} = require('node:stream');
const {gzipSync} = require('node:zlib');
const native = process.argv.includes('--native') || process.env.FETCH_MODE === 'native';
const implementation = native ? Promise.resolve(globalThis.fetch) :
  (process.argv.includes('--upstream') || process.env.FETCH_MODE === 'upstream') ? import('./node_modules/node-fetch3/src/index.js').then(m => m.default) :
  Promise.resolve(require('../../packages/vnode-fetch'));

async function serve(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  return 'http://127.0.0.1:' + server.address().port;
}
function echo(req, res) {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString()}));
  });
}
for (const [label, {Gaxios, GaxiosError}] of [['7.1.3', require('gaxios7')], ['8.3.2', require('gaxios8')]]) {
  const client = async () => new Gaxios({fetchImplementation: await implementation, noProxy: ['*'], retry: false});
  function check(name, fn) { test(`Gaxios ${label}: ${name}`, {timeout: 5000}, async t => fn(t, await client())); }

  check('JSON, native Headers, URL objects and query parameters', async (t, c) => {
    const url = await serve(t, echo);
    const res = await c.request({url: new URL(url + '/path'), method: 'POST', params: {q: 'a b'}, headers: new Headers({'x-test': 'yes'}), data: {ok: true}});
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/json');
    assert.equal(res.data.body, '{"ok":true}');
    assert.equal(res.data.headers['x-test'], 'yes');
    assert.equal(res.data.url, '/path?q=a+b');
  });
  check('OAuth form bodies', async (t, c) => {
    const url = await serve(t, echo);
    const data = new URLSearchParams({grant_type: 'urn:test:grant', assertion: 'a+b/c='});
    const res = await c.request({url, method: 'POST', data});
    assert.match(res.data.headers['content-type'], /^application\/x-www-form-urlencoded/);
    assert.deepEqual([...new URLSearchParams(res.data.body)], [...data]);
  });
  check('bytes, Blob and Node-stream uploads', async (t, c) => {
    const url = await serve(t, echo);
    for (const data of [Buffer.from('payload'), new Uint8Array([0,112,97,121,108,111,97,100,0]).subarray(1,8), new Blob(['payload']), Readable.from(['pay', 'load'])]) {
      const res = await c.request({url, method: 'POST', data});
      assert.equal(res.data.body, 'payload');
    }
  });
  check('streamed Google multipart upload', async (t, c) => {
    const url = await serve(t, echo);
    const res = await c.request({url, method: 'POST', multipart: [
      {headers: new Headers({'content-type': 'application/json'}), content: '{"name":"file"}'},
      {headers: new Headers({'content-type': 'text/plain'}), content: Readable.from(['file contents'])},
    ]});
    const boundary = res.data.headers['content-type'].split('boundary=')[1];
    assert(boundary);
    assert(res.data.body.includes('--' + boundary));
    assert(res.data.body.includes('{"name":"file"}'));
    assert(res.data.body.includes('file contents'));
  });
  check('JSON, text, ArrayBuffer and Blob response readers', async (t, c) => {
    const url = await serve(t, (q, s) => {s.setHeader('content-type', 'application/json'); s.end('{"ok":true}');});
    assert.deepEqual((await c.request({url})).data, {ok: true});
    assert.equal((await c.request({url, responseType: 'text'})).data, '{"ok":true}');
    assert.equal(Buffer.from((await c.request({url, responseType: 'arraybuffer'})).data).toString(), '{"ok":true}');
    assert.equal(await (await c.request({url, responseType: 'blob'})).data.text(), '{"ok":true}');
  });
  check('gzip response decompression', async (t, c) => {
    const url = await serve(t, (q, s) => {s.setHeader('content-encoding', 'gzip'); s.setHeader('content-type', 'application/json'); s.end(gzipSync('{"ok":true}'));});
    assert.deepEqual((await c.request({url})).data, {ok: true});
  });
  check('HTTP errors and retryable responses', async (t, c) => {
    let attempts = 0;
    const url = await serve(t, (q, s) => {
      if (q.url === '/denied') {s.statusCode = 403; s.end('denied');}
      else {s.statusCode = ++attempts === 1 ? 503 : 200; s.end('ok');}
    });
    await assert.rejects(c.request({url: url + '/denied'}), e => e instanceof GaxiosError && e.status === 403);
    const res = await c.request({url, retry: true, retryConfig: {retry: 1, retryDelay: 0, maxRetryDelay: 0}});
    assert.equal(res.data, 'ok');
    assert.equal(attempts, 2);
  });
  check('AbortSignal cancellation and deadlines', async (t, c) => {
    const url = await serve(t, () => {});
    const controller = new AbortController();
    const request = c.request({url, signal: controller.signal});
    controller.abort();
    await assert.rejects(request, e => e instanceof GaxiosError);
    await assert.rejects(c.request({url, timeout: 25}), e => e instanceof GaxiosError);
  });
  check(native ? 'native response bodies use Web Streams' : 'response bodies preserve Node streams', async (t, c) => {
    const url = await serve(t, (q, s) => s.end('stream payload'));
    const {data} = await c.request({url, responseType: 'stream'});
    assert.equal(typeof data.pipe, native ? 'undefined' : 'function');
    if (native) assert.equal(typeof data.getReader, 'function');
    const parts = [];
    for await (const chunk of data) parts.push(Buffer.from(chunk));
    assert.equal(Buffer.concat(parts).toString(), 'stream payload');
  });
  check(native ? 'native fetch ignores the Node agent option' : 'Node agent controls connection creation and reuse', async (t, c) => {
    const url = await serve(t, (q, s) => s.end('ok'));
    const agent = new http.Agent({keepAlive: true});
    t.after(() => agent.destroy());
    let connections = 0;
    const create = agent.createConnection;
    agent.createConnection = function(...args) { connections++; return create.apply(this, args); };
    for (let i = 0; i < 3; i++) assert.equal((await c.request({url, agent})).data, 'ok');
    assert.equal(connections, native ? 0 : 1);
  });
  check(native ? 'native fetch ignores the streamed body size option' : 'streamed responses enforce maxContentLength', async (t, c) => {
    const url = await serve(t, (q, s) => {s.write('123'); s.end('456');});
    const request = c.request({url, maxContentLength: 3, responseType: 'text'});
    if (native) assert.equal((await request).data, '123456');
    else await assert.rejects(request, e => e instanceof GaxiosError);
  });
  check(native && !process.versions.bun ? 'Node native fetch ignores the redirect-count option' : 'redirects honor the configured count', async (t, c) => {
    const url = await serve(t, (q, s) => {if (q.url === '/') {s.writeHead(302, {location: '/end'}); s.end();} else s.end('ok');});
    assert.equal((await c.request({url})).data, 'ok');
    const request = c.request({url, maxRedirects: 0});
    if (native && !process.versions.bun) assert.equal((await request).data, 'ok');
    else await assert.rejects(request, e => e instanceof GaxiosError);
  });
}
