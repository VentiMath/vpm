'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const serveStatic = require('..');
const upstream = require('./upstream.cjs');
const parseUrl = require('vparseurl');
const { files, server, request } = require('../../vsend/test/helpers.cjs');
const content = '0123456789abcdefghij';

function fallback(res, error) {
  if (res.headersSent) { res.destroy(); return; }
  for (const name of res.getHeaderNames()) res.removeHeader(name);
  res.statusCode = error?.statusCode || 404;
  if (error?.headers) for (const [name, value] of Object.entries(error.headers)) res.setHeader(name, value);
  res.end(error ? 'error ' + res.statusCode : 'fallthrough');
}
async function app(t, middleware, before) {
  return server(t, (req, res) => {
    if (before) before(req, res);
    middleware(req, res, error => fallback(res, error));
  });
}

test('ordinary middleware responses match upstream across methods, options, paths and ranges', async t => {
  const { root } = files(t); let current;
  const cases = [
    {}, { route: '/empty.txt' }, { route: '/a%20%26%20b.txt' }, { route: '/missing' },
    { route: '/dir' }, { route: '//dir' }, { route: '/dir?next=hello&x=%zz' }, { route: '/dir/' },
    { route: '/dir/', options: { index: false } }, { route: '/dir', options: { redirect: false } },
    { route: '/dir', options: { redirect: false, fallthrough: false } },
    { route: '/dir/', options: { index: ['missing', 'other.html'] } },
    { route: '/fallback', options: { extensions: ['missing', 'htm'] } },
    { method: 'HEAD' }, { route: '/dir', method: 'HEAD' }, { route: '/missing', method: 'HEAD' },
    { method: 'POST' }, { method: 'POST', options: { fallthrough: false } },
    { method: 'OPTIONS', options: { fallthrough: false } },
    { options: { start: 2, end: 5 } }, { options: { etag: false, lastModified: false, cacheControl: false, acceptRanges: false } },
    { options: { maxAge: '1h', immutable: true } },
    { route: '/.secret' }, { route: '/.secret', options: { dotfiles: 'allow' } },
    { route: '/.secret', options: { dotfiles: 'deny' } }, { route: '/.secret', options: { dotfiles: 'deny', fallthrough: false } },
    { route: '/%zz' }, { route: '/%zz', options: { fallthrough: false } },
    { route: '/../outside.txt' }, { route: '/../outside.txt', options: { fallthrough: false } },
    ...['bytes=2-5', 'bytes=-100', 'bytes=100-200', 'bytes=0-1,5-6', 'bytes=1junk-4'].map(range => ({ headers: { range } })),
    { headers: { 'if-none-match': '*' } }, { headers: { 'if-match': '"missing"' } },
  ];
  const handler = implementation => (req, res) => implementation(root, current.options)(req, res, error => fallback(res, error));
  const old = await server(t, handler(upstream)); const next = await server(t, handler(serveStatic));
  for (current of cases) {
    const [a, b] = await Promise.all([request(old, current.route, current), request(next, current.route, current)]);
    delete a.headers.date; delete b.headers.date;
    assert.deepEqual(b, a, JSON.stringify(current));
  }
});

test('validates middleware and sender options during construction', () => {
  for (const root of [undefined, null, '', 'bad\0root', 3, {}, []]) assert.throws(() => serveStatic(root), TypeError);
  for (const options of [true, [], 'invalid', { setHeaders: false }, { setHeaders: 0 }, { setHeaders: '' },
    { fallthrough: 0 }, { redirect: 'false' }, { dotfiles: 'other' }, { start: -1 }, { start: 4, end: 2 },
    { index: '../secret' }, { extensions: ['../txt'] }, { highWaterMark: 0 }]) {
    assert.throws(() => serveStatic('.', options), undefined, JSON.stringify(options));
  }
  assert.doesNotThrow(() => serveStatic('.', null));
  assert.doesNotThrow(() => upstream('.', { start: -1 })); // Upstream defers sender validation to a request.
});

test('snapshots supported scalar and array options without modifying the caller', async t => {
  const { root } = files(t);
  const index = ['data.txt']; const extensions = ['htm'];
  const options = { index, extensions, maxAge: '1h', root: '/ignored', start: 1, end: 3 };
  const middleware = serveStatic(root, options);
  options.start = 10; options.maxAge = '2h'; index[0] = 'missing'; extensions[0] = 'missing';
  const instance = await app(t, middleware);
  const indexed = await request(instance, '/');
  assert.equal(indexed.body, '123'); assert.equal(indexed.headers['cache-control'], 'public, max-age=3600');
  assert.equal((await request(instance, '/fallback')).body, 'all');
  assert.equal(options.root, '/ignored'); assert.equal(options.maxage, undefined);
});

test('supports inherited and frozen options, with explicit maxAge zero taking precedence', async t => {
  const { root } = files(t);
  const options = Object.freeze(Object.create({ extensions: ['htm'], maxAge: 0, maxage: '1h', root: '/ignored' }));
  const instance = await app(t, serveStatic(root, options));
  const response = await request(instance, '/fallback');
  assert.equal(response.body, 'fallback'); assert.equal(response.headers['cache-control'], 'public, max-age=0');
});

test('redirect formatting preserves the shared original URL cache and request fields', async t => {
  const { root } = files(t);
  for (const implementation of [upstream, serveStatic]) {
    let original; let before; let reqUrl;
    const middleware = implementation(root);
    const instance = await server(t, (req, res) => {
      req.originalUrl = '/mounted/dir?x=1'; reqUrl = req.url;
      original = parseUrl.original(req); before = { ...original };
      middleware(req, res, error => fallback(res, error));
      assert.equal(req.url, reqUrl); assert.equal(req.originalUrl, '/mounted/dir?x=1');
    });
    const response = await request(instance, '/dir?x=1');
    assert.equal(response.headers.location, '/mounted/dir/?x=1');
    if (implementation === serveStatic) assert.deepEqual({ ...original }, before);
    else { assert.equal(original.pathname, '/mounted/dir/'); assert.equal(original.path, null); }
  }
});

test('redirects work with frozen cached URL results and retain encoded queries', async t => {
  const { root } = files(t);
  const instance = await app(t, serveStatic(root), req => Object.freeze(parseUrl.original(req)));
  const response = await request(instance, '//dir?next=<x>&other=%zz');
  assert.equal(response.status, 301); assert.equal(response.headers.location, '/dir/?next=%3Cx%3E&other=%25zz');
  assert.match(response.body, /%3Cx%3E&amp;other=%25zz/);
});

test('mount-root redirects preserve the full original path, query, and index selection', async t => {
  const { root } = files(t);
  const middleware = serveStatic(root, { index: 'data.txt' });
  const instance = await app(t, middleware, req => {
    req.originalUrl = req.url;
    req.url = req.url.startsWith('/assets/?') ? '/?' + req.url.split('?')[1] : '/';
  });
  const redirect = await request(instance, '/assets?x=1');
  assert.equal(redirect.status, 301); assert.equal(redirect.headers.location, '/assets/?x=1');
  assert.equal((await request(instance, '/assets/?x=1')).body, content);
});

test('generated redirects and 405s replace stale representation and framing headers', async t => {
  const { root } = files(t);
  const instance = await app(t, serveStatic(root, { fallthrough: false }), (_req, res) => {
    for (const [name, value] of Object.entries({ 'Transfer-Encoding': 'chunked', Trailer: 'Digest',
      'Content-Encoding': 'gzip', 'Content-Language': 'nl', 'Content-Range': 'bytes 0-1/2', 'Content-Type': 'application/json' })) res.setHeader(name, value);
    res.setHeader('X-Custom', 'kept');
  });
  for (const method of ['GET', 'HEAD', 'POST']) {
    const response = await request(instance, '/dir', { method });
    assert.equal(response.status, method === 'POST' ? 405 : 301);
    for (const name of ['transfer-encoding', 'trailer', 'content-encoding', 'content-language', 'content-range']) assert.equal(response.headers[name], undefined);
    assert.equal(response.headers['x-custom'], 'kept');
    if (method === 'POST') { assert.equal(response.headers.allow, 'GET, HEAD'); assert.equal(response.headers['content-type'], undefined); assert.equal(response.headers['content-length'], '0'); }
    if (method !== 'HEAD') assert.equal(Number(response.headers['content-length']), Buffer.byteLength(response.body));
  }
});

test('HEAD redirects explicitly end without passing body bytes', async t => {
  const { root } = files(t); const bodies = [];
  const instance = await app(t, serveStatic(root), (_req, res) => {
    const end = res.end; res.end = function (...args) { bodies.push(args[0]); return end.apply(this, args); };
  });
  const response = await request(instance, '/dir', { method: 'HEAD' });
  assert.equal(response.status, 301); assert.equal(response.body, ''); assert.deepEqual(bodies, [undefined]);
});

test('setHeaders receives sender context and stat data and may finish the response', async t => {
  const { root } = files(t); let calls = 0;
  const instance = await app(t, serveStatic(root, { setHeaders: function (res, filename, stat) {
    calls++; assert.equal(this.res, res); assert.equal(filename, path.join(root, 'data.txt')); assert.ok(stat.isFile());
    res.setHeader('X-Size', stat.size); res.end('handled by hook');
  } }));
  const response = await request(instance); assert.equal(response.body, 'handled by hook');
  assert.equal(response.headers['x-size'], '20'); assert.equal(calls, 1);
});

test('invalid and missing request URLs follow the selected fallthrough policy', async t => {
  const { root } = files(t);
  for (const fallthrough of [false, true]) for (const url of [undefined, '?query=only', 'http://[invalid']) {
    const instance = await app(t, serveStatic(root, { fallthrough }), req => { req.url = url; });
    const response = await request(instance);
    assert.equal(response.status, fallthrough ? 404 : 400);
    assert.equal(response.body, fallthrough ? 'fallthrough' : 'error 400');
  }
});

test('completed or disconnected responses are not written or passed onward', async t => {
  const { root } = files(t); let nextCalls = 0;
  const middleware = serveStatic(root, { fallthrough: false });
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 }); t.after(() => agent.destroy());
  const sockets = new Set();
  const instance = await server(t, (req, res) => { sockets.add(req.socket); res.end('finished'); middleware(req, res, () => nextCalls++); });
  for (const method of ['GET', 'POST']) assert.equal((await request(instance, '/', { method, agent })).body, 'finished');
  assert.equal(sockets.size, 1); assert.equal(nextCalls, 0);
  for (const [req, res] of [[{ aborted: true }, {}], [{ socket: { destroyed: true } }, {}], [{}, { destroyed: true }]]) {
    middleware(req, res, () => nextCalls++);
  }
  assert.equal(nextCalls, 0);
});

test('a partial response reports an error instead of writing a second 405 response', async t => {
  const { root } = files(t); const errors = [];
  const middleware = serveStatic(root, { fallthrough: false });
  const instance = await server(t, (req, res) => {
    res.write('partial');
    middleware(req, res, error => { errors.push(error); res.end(' completed'); });
  });
  const response = await request(instance, '/', { method: 'POST' });
  assert.equal(response.body, 'partial completed'); assert.equal(response.status, 200);
  assert.equal(errors.length, 1); assert.equal(errors[0].statusCode, 500);
});

test('file errors always reach next with an error, including 412, 416 and short reads', async t => {
  const { root } = files(t); const errors = [];
  const middleware = serveStatic(root, { setHeaders(res, filename) { if (res.req.url === '/empty.txt') fs.truncateSync(filename, 0); } });
  fs.writeFileSync(path.join(root, 'empty.txt'), 'will truncate');
  const instance = await server(t, (req, res) => middleware(req, res, error => { errors.push(error); fallback(res, error); }));
  assert.equal((await request(instance, '/data.txt', { headers: { 'if-match': '"missing"' } })).status, 412);
  const range = await request(instance, '/data.txt', { headers: { range: 'bytes=100-' } });
  assert.equal(range.status, 416); assert.equal(range.headers['content-range'], 'bytes */20');
  assert.equal((await request(instance, '/empty.txt')).status, 500);
  assert.deepEqual(errors.map(error => error.statusCode), [412, 416, 500]);
});

test('filesystem failures before finding a file are forwarded even with fallthrough enabled', async t => {
  const { root } = files(t);
  fs.symlinkSync('loop', path.join(root, 'loop'));
  const instance = await app(t, serveStatic(root));
  const response = await request(instance, '/loop');
  assert.equal(response.status, 500); assert.equal(response.body, 'error 500');
});

test('multiple roots fall through only until a file has been found', async t => {
  const { root, directory } = files(t); const second = path.join(directory, 'second'); fs.mkdirSync(second);
  fs.writeFileSync(path.join(second, 'only.txt'), 'second root');
  let fallthroughs = 0;
  const first = serveStatic(root); const last = serveStatic(second);
  const instance = await server(t, (req, res) => first(req, res, error => {
    if (error) return fallback(res, error);
    fallthroughs++; last(req, res, error => fallback(res, error));
  }));
  assert.equal((await request(instance, '/only.txt')).body, 'second root');
  assert.equal((await request(instance, '/data.txt', { headers: { range: 'bytes=100-' } })).status, 416);
  assert.equal(fallthroughs, 1);
});

test('HTTP/2 supports file delivery, HEAD redirects, queries, and method rejection', { timeout: 5000 }, async t => {
  const http2 = require('node:http2'); const { root } = files(t);
  const middleware = serveStatic(root, { fallthrough: false });
  const instance = http2.createServer((req, res) => middleware(req, res, error => fallback(res, error)));
  const sessions = new Set(); instance.on('session', session => sessions.add(session));
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  const client = http2.connect('http://127.0.0.1:' + instance.address().port);
  t.after(() => new Promise(resolve => { client.destroy(); for (const session of sessions) session.destroy(); instance.close(resolve); }));
  const get = (route, method = 'GET') => new Promise((resolve, reject) => {
    const req = client.request({ ':path': route, ':method': method }); let headers; const chunks = [];
    req.on('response', value => { headers = value; }); req.on('data', chunk => chunks.push(chunk)); req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('HTTP/2 response timed out')));
    req.on('end', () => resolve({ headers, body: Buffer.concat(chunks).toString() })); req.end();
  });
  assert.equal((await get('/data.txt')).body, content);
  const redirected = await get('/dir?x=1', 'HEAD');
  assert.equal(redirected.headers[':status'], 301); assert.equal(redirected.headers.location, '/dir/?x=1'); assert.equal(redirected.body, '');
  const rejected = await get('/data.txt', 'POST'); assert.equal(rejected.headers[':status'], 405); assert.equal(rejected.body, '');
});
