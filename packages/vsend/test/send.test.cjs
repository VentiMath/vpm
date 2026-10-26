'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const send = require('..');
const upstream = require('./upstream.cjs');
const { files, server, request } = require('./helpers.cjs');
const text = '0123456789abcdefghij';
const oldDate = 'Tue, 31 Dec 2024 00:00:00 GMT';
const modified = 'Wed, 01 Jan 2025 00:00:00 GMT';
const future = 'Thu, 01 Jan 2026 00:00:00 GMT';

test('ordinary requests match upstream status, headers, and bytes across option combinations', async t => {
  const { root } = files(t);
  const cases = [
    {}, { route: '/empty.txt' }, { route: '/a%20%26%20b.txt' }, { route: '/two..dots.txt' },
    { route: '/missing' }, { route: '/dir' }, { route: '//dir' }, { route: '/dir/' }, { route: '/dir/', options: { index: false } },
    { method: 'HEAD' }, { route: '/missing', method: 'HEAD' }, { route: '/dir', method: 'HEAD' },
    { options: { start: 2, end: 5 } }, { options: { start: 50 } }, { options: { start: 0, end: 0 } },
    { options: { maxAge: '2h', immutable: true } }, { options: { maxAge: 999999999999 } },
    { options: { etag: false, lastModified: false, cacheControl: false, acceptRanges: false } },
    { route: '/fallback', options: { extensions: ['missing', 'htm'] } },
    { route: '/dir/', options: { index: ['missing.html', 'other.html'] } },
    { route: '/.secret', options: { dotfiles: 'allow' } }, { route: '/.secret', options: { dotfiles: 'deny' } },
    { route: '/.secret' }, { route: '/.private/data.txt' },
    ...['bytes=2-5', 'bytes=2-', 'bytes=-3', 'bytes=100-200', 'bytes=2-99', 'bytes=0-4,4-9', 'bytes=0-1,6-7',
      'items=0-2', 'bytes=invalid'].map(range => ({ headers: { range } })),
    { headers: { 'if-modified-since': future } }, { headers: { 'if-modified-since': oldDate } },
    { headers: { 'if-unmodified-since': oldDate } }, { headers: { 'if-unmodified-since': future } },
    { headers: { 'if-none-match': '*' } }, { headers: { 'if-none-match': '"different"' } },
    { headers: { 'if-match': '*' } }, { headers: { 'if-match': '"different"' } },
  ];
  let current;
  const handler = implementation => (req, res) => implementation(req, req.url, { root, ...current.options }).pipe(res);
  const old = await server(t, handler(upstream)); const next = await server(t, handler(send));
  for (current of cases) {
    const [a, b] = await Promise.all([request(old, current.route, current), request(next, current.route, current)]);
    for (const response of [a, b]) delete response.headers.date;
    assert.deepEqual(b, a, JSON.stringify(current));
  }
});

test('rejects malformed encodings, NULs and root escapes while retaining safe normalization', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => send(req, req.url, { root }).pipe(res));
  for (const route of ['/../outside.txt', '/%2e%2e/outside.txt', '/a/../../outside.txt', '/..%5coutside.txt', '/%5c..%5coutside.txt']) {
    const response = await request(app, route); assert.equal(response.status, 403, route); assert.ok(!response.body.includes(root));
  }
  for (const route of ['/%zz', '/%C0%AE', '/data.txt%00']) assert.equal((await request(app, route)).status, 400, route);
  assert.equal((await request(app, '/nested/../data.txt')).body, text);
  assert.equal((await request(app, '/%252e%252e/outside.txt')).status, 404);
});

test('absolute paths work without root and parent components remain forbidden', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => send(req, encodeURI(path.join(root, 'data.txt'))).pipe(res));
  assert.equal((await request(app)).body, text);
  const bad = await server(t, (req, res) => send(req, root + '/../outside.txt').pipe(res));
  assert.equal((await request(bad)).status, 403);
});

test('index candidates obey dotfile policy and roots can themselves be hidden', async t => {
  const { root, directory } = files(t);
  const app = await server(t, (req, res) => send(req, '/', { root, index: 'nested/.hidden.html' }).pipe(res));
  assert.equal((await request(app)).status, 404);
  const hidden = await server(t, (req, res) => send(req, '/data.txt', { root: path.join(root, '.private'), dotfiles: 'deny' }).pipe(res));
  assert.equal((await request(hidden)).body, 'hidden nested');
  // Existing symlink behavior is retained; a lexical root is not a filesystem jail.
  fs.symlinkSync(path.join(directory, 'outside.txt'), path.join(root, 'link.txt'));
  const linked = await server(t, (req, res) => send(req, '/link.txt', { root }).pipe(res));
  assert.equal((await request(linked)).body, 'outside');
});

test('configuration rejects unsafe bounds and traversal before starting I/O', () => {
  const req = { headers: {} };
  for (const options of [{ start: -1 }, { start: 1.5 }, { end: Infinity }, { end: Number.MAX_SAFE_INTEGER + 1 },
    { start: 5, end: 4 }, { highWaterMark: 0 }, { dotfiles: 'other' }, { index: true }, { extensions: [2] },
    { index: '../outside.txt' }, { index: '/absolute' }, { index: 'a/../../outside' }, { index: 'C:\\absolute' },
    { extensions: '../txt' }, { extensions: '\0' }, { root: 42 }]) {
    assert.throws(() => send(req, '/', options), undefined, JSON.stringify(options));
  }
  assert.throws(() => send(req, null), TypeError);
  assert.throws(() => send(null, '/'), TypeError);
  assert.throws(() => send(req, '/', true), TypeError);
});

test('copies configuration and does not pass descriptor, encoding, flags or fs overrides to the reader', async t => {
  const { root } = files(t); const filename = path.join(root, 'data.txt');
  const options = { root, start: 2, end: 5, index: ['data.txt'], fd: 999999, flags: 'w', encoding: 'hex',
    fs: { open() { throw Error('unexpected custom filesystem'); } } };
  const app = await server(t, (req, res) => {
    const stream = send(req, '/', options);
    options.start = 10; options.index[0] = 'missing';
    stream.pipe(res);
  });
  assert.equal((await request(app)).body, '2345');
  assert.equal(fs.readFileSync(filename, 'utf8'), text);
});

test('explicit maxAge zero takes precedence over the legacy spelling', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => send(req, '/data.txt', { root, maxAge: 0, maxage: '1h' }).pipe(res));
  assert.equal((await request(app)).headers['cache-control'], 'public, max-age=0');
});

test('supported inherited options remain available to Express and serve-static', async t => {
  const { root } = files(t);
  const options = Object.create({ extensions: ['htm'], maxAge: '1h', start: 1, end: 3 });
  options.root = root;
  const app = await server(t, (req, res) => send(req, '/fallback', options).pipe(res));
  const response = await request(app);
  assert.equal(response.body, 'all'); assert.equal(response.headers['cache-control'], 'public, max-age=3600');
});

test('If-Match uses strong comparison and recognizes commas inside opaque tags', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => {
    send(req, '/data.txt', { root }).on('headers', () => res.setHeader('ETag', '"a,b"')).pipe(res);
  });
  for (const match of ['"a,b"', '"other", "a,b"', ',\t"a,b",', ' *\t']) {
    assert.equal((await request(app, '/', { headers: { 'if-match': match } })).status, 200, match);
  }
  for (const match of ['W/"a,b"', '"different"', '"a,b",bad', '', '*, "a,b"']) {
    assert.equal((await request(app, '/', { headers: { 'if-match': match } })).status, 412, match);
  }
  const weak = await server(t, (req, res) => send(req, '/data.txt', { root }).pipe(res));
  const tag = (await request(weak)).headers.etag;
  assert.ok(tag.startsWith('W/'));
  for (const match of [tag, tag.slice(2)]) assert.equal((await request(weak, '/', { headers: { 'if-match': match } })).status, 412);
  assert.equal((await request(weak, '/', { headers: { 'if-none-match': tag } })).status, 304);
});

test('conditional precedence, absent validators and non-GET If-None-Match are handled explicitly', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => send(req, '/data.txt', { root }).on('headers', () => res.setHeader('ETag', '"match"')).pipe(res));
  const check = async (headers, status, method = 'GET') => assert.equal((await request(app, '/', { headers, method })).status, status);
  await check({ 'if-match': '"match"', 'if-unmodified-since': oldDate }, 200);
  await check({ 'if-match': '"wrong"', 'if-none-match': '*' }, 412);
  await check({ 'if-none-match': '"wrong"', 'if-modified-since': future }, 200);
  await check({ 'if-none-match': '', 'if-modified-since': future }, 200);
  await check({ 'if-none-match': '"match"', 'if-modified-since': oldDate }, 304);
  await check({ 'if-none-match': '"match"', 'cache-control': 'NO-CACHE' }, 200);
  await check({ 'if-none-match': '"match"', 'cache-control': 'no-cache' }, 412, 'POST');
  await check({ 'if-modified-since': future }, 200, 'POST');
  const noValidators = await server(t, (req, res) => send(req, '/data.txt', { root, etag: false, lastModified: false }).pipe(res));
  assert.equal((await request(noValidators, '/', { headers: { 'if-match': '*' } })).status, 200);
  assert.equal((await request(noValidators, '/', { headers: { 'if-unmodified-since': oldDate } })).status, 200);
});

test('If-Range requires an exact strong tag or equal modification date', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => send(req, '/data.txt', { root }).on('headers', () => res.setHeader('ETag', '"a,b"')).pipe(res));
  for (const validator of ['"a,b"', modified]) {
    const response = await request(app, '/', { headers: { range: 'bytes=1-3', 'if-range': validator } });
    assert.equal(response.status, 206, validator); assert.equal(response.body, '123');
  }
  for (const validator of ['W/"a,b"', 'prefix"a,b"suffix', '"other", "a,b"', future, oldDate, '', 'invalid']) {
    const response = await request(app, '/', { headers: { range: 'bytes=1-3', 'if-range': validator } });
    assert.equal(response.status, 200, validator); assert.equal(response.body, text);
  }
  const weak = await server(t, (req, res) => send(req, '/data.txt', { root }).pipe(res));
  const tag = (await request(weak)).headers.etag;
  assert.equal((await request(weak, '/', { headers: { range: 'bytes=1-3', 'if-range': tag } })).status, 200);
});

test('Range is GET-only, ignores unknown units and non-200 responses, and accepts case-insensitive bytes', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => { if (req.url === '/accepted') res.statusCode = 202; send(req, '/data.txt', { root }).pipe(res); });
  for (const range of ['bytes=1-3', 'bytes=100-200']) {
    const head = await request(app, '/', { method: 'HEAD', headers: { range } });
    assert.equal(head.status, 200); assert.equal(head.headers['content-length'], '20'); assert.equal(head.body, '');
    assert.equal(head.headers['content-range'], undefined);
  }
  assert.equal((await request(app, '/', { method: 'POST', headers: { range: 'bytes=1-3' } })).body, text);
  const accepted = await request(app, '/accepted', { headers: { range: 'bytes=1-3' } });
  assert.equal(accepted.status, 202); assert.equal(accepted.body, text);
  const partial = await request(app, '/', { headers: { range: 'Bytes=1-3' } });
  assert.equal(partial.status, 206); assert.equal(partial.body, '123');
  const suffix = await request(app, '/', { headers: { range: 'bytes=-100' } });
  assert.equal(suffix.status, 206); assert.equal(suffix.body, text);
  assert.equal((await request(app, '/', { headers: { range: 'bytes=1junk-3' } })).body, text);
});

test('ranges apply within configured offsets and combine overlapping intervals', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => send(req, '/data.txt', { root, start: 4, end: 11 }).pipe(res));
  const response = await request(app, '/', { headers: { range: 'bytes=1-2,2-4' } });
  assert.equal(response.status, 206); assert.equal(response.headers['content-range'], 'bytes 1-4/8'); assert.equal(response.body, '5678');
  assert.equal((await request(app, '/', { headers: { range: 'bytes=8-' } })).headers['content-range'], 'bytes */8');
});

test('generated responses remove conflicting framing and HEAD errors send no body', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => {
    res.setHeader('Transfer-Encoding', 'chunked'); res.setHeader('Trailer', 'Digest'); res.setHeader('Content-Range', 'bytes 0-1/2');
    send(req, req.url, { root }).pipe(res);
  });
  for (const route of ['/data.txt', '/dir', '/missing']) {
    const response = await request(app, route);
    assert.equal(response.headers['transfer-encoding'], undefined); assert.equal(response.headers.trailer, undefined);
    assert.equal(response.headers['content-range'], undefined);
    const head = await request(app, route, { method: 'HEAD' }); assert.equal(head.body, '');
    assert.equal(head.headers['content-length'], response.headers['content-length']);
  }
  const cached = await request(app, '/data.txt', { headers: { 'if-none-match': '*' } });
  assert.equal(cached.status, 304);
  for (const header of ['content-length', 'content-type', 'content-range', 'transfer-encoding', 'trailer']) assert.equal(cached.headers[header], undefined);
});

test('preserves event order, directory handlers, custom headers and error metadata', async t => {
  const { root } = files(t); const events = [];
  const app = await server(t, (req, res) => {
    const sender = send(req, req.url, { root });
    sender.on('file', (file, stat) => { events.push('file'); assert.ok(stat.isFile()); assert.equal(path.dirname(file), root); });
    sender.on('headers', () => { events.push('headers'); res.setHeader('Content-Type', 'custom/example'); });
    sender.on('stream', stream => { events.push('stream'); assert.equal(typeof stream.destroy, 'function'); });
    sender.on('end', () => events.push('end'));
    sender.on('directory', function (response, file) { assert.equal(file, path.join(root, 'dir')); response.end('directory'); });
    sender.on('error', error => { assert.equal(error.status, 404); assert.equal(error.code, 'ENOENT'); res.statusCode = error.status; res.end('custom'); });
    assert.equal(sender.pipe(res), res);
  });
  assert.equal((await request(app)).headers['content-type'], 'custom/example');
  assert.deepEqual(events, ['file', 'headers', 'stream', 'end']);
  assert.equal((await request(app, '/dir')).body, 'directory');
  assert.equal((await request(app, '/missing')).body, 'custom');
});

test('hooks can finish a response without subsequent file writes', async t => {
  const { root } = files(t);
  for (const event of ['file', 'headers', 'stream']) {
    let input; let closed;
    const app = await server(t, (req, res) => {
      const sender = send(req, '/data.txt', { root });
      sender.on(event, (...args) => {
        if (event === 'stream') { input = args[0]; closed = new Promise(resolve => input.once('close', resolve)); }
        res.removeHeader('Content-Length'); res.end('from hook');
      }).pipe(res);
    });
    assert.equal((await request(app)).body, 'from hook', event);
    if (input) { await closed; assert.equal(input.destroyed, true); }
  }
});

test('a synchronous stream-hook error is handled once before piping', async t => {
  const { root } = files(t); let errors = 0;
  const app = await server(t, (req, res) => {
    send(req, '/data.txt', { root })
      .on('stream', input => input.emit('error', new Error('hook failure')))
      .on('error', error => { errors++; res.statusCode = error.status; res.removeHeader('Content-Length'); res.end('handled'); })
      .pipe(res);
  });
  const response = await request(app); assert.equal(response.status, 500); assert.equal(response.body, 'handled'); assert.equal(errors, 1);
});

test('an unhandled file error after headers closes the partial response without a second header write', async t => {
  const { root } = files(t); fs.writeFileSync(path.join(root, 'large.bin'), Buffer.alloc(128 * 1024));
  const app = await server(t, (req, res) => {
    send(req, '/large.bin', { root, highWaterMark: 1024 }).on('stream', input => {
      input.once('data', () => setImmediate(() => input.destroy(new Error('read failure'))));
    }).pipe(res);
  });
  await assert.rejects(request(app), /aborted|socket hang up|reset/i);
});

test('a file truncated after stat does not finish a response with an incorrect Content-Length', async t => {
  const { root } = files(t);
  const app = await server(t, (req, res) => send(req, '/data.txt', { root })
    .on('headers', (_res, filename) => fs.truncateSync(filename, 0)).pipe(res));
  const response = await request(app); assert.equal(response.status, 500);
  assert.equal(Number(response.headers['content-length']), Buffer.byteLength(response.body));
});

test('disconnection during stat prevents file/stream events and opening a file', async t => {
  const { root } = files(t); const events = [];
  const app = await server(t, (req, res) => {
    const sender = send(req, '/data.txt', { root });
    sender.on('file', () => events.push('file')); sender.on('stream', () => events.push('stream'));
    sender.pipe(res); res.destroy();
  });
  await assert.rejects(request(app), /socket hang up|reset|aborted/i);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(events, []);
});

test('client disconnect closes the file descriptor and ends further reads', async t => {
  const { root } = files(t); fs.writeFileSync(path.join(root, 'large.bin'), Buffer.alloc(2 * 1024 * 1024));
  let closed; let input;
  const app = await server(t, (req, res) => {
    send(req, '/large.bin', { root, highWaterMark: 1024 }).on('stream', stream => {
      input = stream; closed = new Promise(resolve => stream.once('close', resolve));
    }).pipe(res);
  });
  await new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: app.address().port, path: '/', agent: false }, res => {
      res.once('data', () => { res.destroy(); req.destroy(); resolve(); }); res.on('error', () => {});
    }); req.on('error', reject);
  });
  await closed; assert.equal(input.destroyed, true); assert.equal(input.closed, true);
  assert.ok(input.bytesRead < 2 * 1024 * 1024);
});

test('a send stream cannot be piped twice and a finished response keeps its connection usable', async t => {
  const { root } = files(t); const agent = new http.Agent({ keepAlive: true, maxSockets: 1 }); t.after(() => agent.destroy());
  const sockets = new Set();
  const app = await server(t, (req, res) => {
    sockets.add(req.socket);
    const sender = send(req, '/data.txt', { root });
    res.end('already finished'); sender.pipe(res);
    assert.throws(() => sender.pipe(res), /only be piped once/);
  });
  assert.equal((await request(app, '/', { agent })).body, 'already finished');
  assert.equal((await request(app, '/', { agent })).body, 'already finished'); assert.equal(sockets.size, 1);
});

test('non-regular filesystem objects are rejected before opening', { skip: process.platform === 'win32' }, async t => {
  const { root } = files(t); const fifo = path.join(root, 'pipe');
  assert.equal(spawnSync('mkfifo', [fifo]).status, 0);
  const app = await server(t, (req, res) => send(req, '/pipe', { root }).pipe(res));
  assert.equal((await request(app)).status, 404);
});

test('strong-tag scanning handles long whitespace and malformed tails without regex trimming', () => {
  const spaces = ' '.repeat(65536);
  const sender = send({ headers: {}, method: 'GET' }, '/');
  sender.res = { getHeader: () => '"a,b"' };
  for (const [value, expected] of [[spaces + '*' + spaces, false], ['"a,b"' + spaces + 'x', true], ['"a,b"' + spaces, false]]) {
    sender.req.headers['if-match'] = value; assert.equal(sender.isPreconditionFailure(), expected);
  }
});

test('HTTP/2 compatibility responses support GET, HEAD, ranges and conditional requests', { timeout: 5000 }, async t => {
  const http2 = require('node:http2');
  const { root } = files(t);
  const app = http2.createServer((req, res) => send(req, '/data.txt', { root }).pipe(res));
  const sessions = new Set(); app.on('session', session => sessions.add(session));
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const client = http2.connect('http://127.0.0.1:' + app.address().port);
  t.after(() => new Promise(resolve => { client.destroy(); for (const session of sessions) session.destroy(); app.close(resolve); }));
  const get = headers => new Promise((resolve, reject) => {
    const stream = client.request({ ':path': '/', ...headers });
    let response; const chunks = [];
    stream.on('response', headers => { response = headers; });
    stream.on('data', chunk => chunks.push(chunk)); stream.on('error', reject);
    stream.setTimeout(2000, () => { stream.destroy(); reject(new Error('HTTP/2 response timed out')); });
    stream.on('end', () => resolve({ headers: response, body: Buffer.concat(chunks).toString() })); stream.end();
  });
  assert.equal((await get({})).body, text);
  const head = await get({ ':method': 'HEAD', range: 'bytes=2-5' });
  assert.equal(head.headers[':status'], 200); assert.equal(head.body, ''); assert.equal(head.headers['content-length'], '20');
  const range = await get({ range: 'bytes=2-5' }); assert.equal(range.headers[':status'], 206); assert.equal(range.body, '2345');
  const cached = await get({ 'if-none-match': '*' }); assert.equal(cached.headers[':status'], 304); assert.equal(cached.body, '');
});
