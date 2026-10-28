'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const express = require('..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vexpress-test-'));
fs.writeFileSync(path.join(root, 'file.txt'), 'file body');
fs.writeFileSync(path.join(root, 'view.tpl'), 'template');
after(() => fs.rmSync(root, { recursive: true, force: true }));
function app() { return express().set('env', 'test'); }
async function serve(application, run) {
  const server = http.createServer(application);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  async function request(url = '/', options = {}, body) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: url, agent: false, ...options }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => { const bytes = Buffer.concat(chunks); resolve({ status: res.statusCode, headers: res.headers, bytes, text: bytes.toString() }); });
      });
      req.on('error', reject); req.end(body);
    });
  }
  try { await run(request, server); } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
test('exports, defaults, isolated prototypes, and dependency closure', () => {
  const a = app(), b = app();
  assert.equal(a.get('query parser'), 'simple'); assert.equal(a.get('etag'), 'weak');
  assert.notEqual(a.request, b.request); assert.notEqual(a.response, b.response);
  assert.equal(Object.getPrototypeOf(a.settings), null);
  assert.equal(express.Router, require('vrouter'));
  assert.equal(express.Route, express.Router.Route);
  for (const name of ['json', 'raw', 'text', 'urlencoded']) assert.equal(express[name], require('vbody-parser')[name]);
  assert.equal(express.static, require('vserve-static'));
  const seen = new Set();
  function walk(name) {
    if (seen.has(name)) return; seen.add(name);
    const metadata = require(path.join(__dirname, '../../', name, 'package.json'));
    for (const dep of Object.keys(metadata.dependencies || {})) { assert.match(dep, /^v/); walk(dep); }
  }
  walk('vexpress'); assert.equal(seen.size, 40);
});
test('application route, param, query and JSON methods work over HTTP', async () => {
  const a = app(); a.param('id', (req, res, next, id) => { req.params.id = id.toUpperCase(); next(); });
  a.get('/users/:id', (req, res) => res.status(201).json({ id: req.params.id, query: req.query, path: req.path }));
  await serve(a, async get => {
    const r = await get('/users/abc?q=%E9%9B%AA');
    assert.equal(r.status, 201); assert.deepEqual(JSON.parse(r.text), { id: 'ABC', query: { q: '雪' }, path: '/users/abc' });
    assert.equal(r.headers['content-type'], 'application/json; charset=utf-8'); assert.ok(r.headers.etag);
  });
});
test('promise rejection enters error middleware', async () => {
  const a = app(); a.get('/', async () => { throw new Error('expected'); });
  a.use((err, req, res, next) => res.status(409).send(err.message));
  await serve(a, async get => { const r = await get(); assert.equal(r.status, 409); assert.equal(r.text, 'expected'); });
});
test('mounted applications inherit settings and restore parent prototypes', async () => {
  const a = app(), b = app(); let mount;
  b.on('mount', parent => { mount = parent; });
  a.request.label = 'parent'; b.request.label = 'child'; a.set('trust proxy', 'loopback');
  b.get('/hit', (req, res) => res.json({ label: req.label, base: req.baseUrl, original: req.originalUrl, trust: req.app.get('trust proxy') }));
  a.use('/child', b); a.use((req, res) => res.send(req.label));
  assert.equal(mount, a); assert.equal(b.path(), '/child');
  await serve(a, async get => {
    assert.deepEqual(JSON.parse((await get('/child/hit')).text), { label: 'child', base: '/child', original: '/child/hit', trust: 'loopback' });
    assert.equal((await get('/child/miss')).text, 'parent');
  });
});
test('registration rejects invalid later handlers without partial layers', () => {
  for (const method of ['use', 'get', 'post', 'all']) {
    const a = app(); const before = a.router.stack.length;
    assert.throws(() => a[method]('/path', (req, res, next) => next(), [null]), TypeError);
    assert.equal(a.router.stack.length, before, method);
  }
});
test('route method overrides remain observable on instances and the application prototype', () => {
  const original = express.application.route; let calls = 0;
  function overridden(path) { calls++; return original.call(this, path); }
  const a = app(); a.route = overridden; a.get('/one', () => {}); a.post('/two', () => {});
  assert.equal(calls, 2); assert.equal(a.router.stack.length, 2);
  assert.throws(() => a.get('/bad', () => {}, false), TypeError); assert.equal(calls, 2);
  try {
    express.application.route = overridden;
    const b = app(); b.get('/three', () => {}); assert.equal(calls, 3); assert.equal(b.router.stack.length, 1);
  } finally { express.application.route = original; }
});
test('cyclic and very deep middleware arrays terminate correctly', () => {
  const a = app(), cycle = []; cycle.push(cycle);
  assert.throws(() => a.use(cycle), /cyclic/);
  assert.throws(() => a.use('/', [() => {}, cycle]), /cyclic/);
  let nested = () => {}; for (let i = 0; i < 20000; i++) nested = [nested];
  a.use(nested); assert.equal(a.router.stack.length, 1);
});
test('mounting validates patterns and handler names before changing children', () => {
  const a = app(), b = app(); let mounted = 0; b.on('mount', () => mounted++);
  assert.throws(() => a.use('/*', b));
  assert.equal(b.parent, undefined); assert.equal(mounted, 0); assert.equal(a.router.stack.length, 0);
  const bad = () => {}; Object.defineProperty(bad, 'name', { get() { throw new Error('bad name'); } });
  assert.throws(() => a.use('/child', b, bad), /bad name/);
  assert.equal(b.parent, undefined); assert.equal(a.router.stack.length, 0);
});
for (const [setting, initial, invalid] of [
  ['etag', 'strong', 'invalid'], ['query parser', 'extended', 'invalid'], ['trust proxy', 'loopback', 'not-an-ip'],
]) test('invalid ' + setting + ' leaves the active setting and compiled function unchanged', () => {
  const a = app().set(setting, initial), fn = a.get(setting + ' fn');
  assert.throws(() => a.set(setting, invalid));
  assert.equal(a.get(setting), initial); assert.equal(a.get(setting + ' fn'), fn);
});
test('trust proxy hop counts reject non-integers and preserve inheritance', () => {
  const a = app(); const fn = a.get('trust proxy fn');
  for (const count of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => a.set('trust proxy', count), TypeError);
  assert.equal(a.get('trust proxy'), false); assert.equal(a.get('trust proxy fn'), fn);
  const parent = app().set('trust proxy', 1); parent.use(a);
  assert.equal(a.get('trust proxy'), 1); assert.equal(a.get('trust proxy fn')('x', 0), true); assert.equal(a.get('trust proxy fn')('x', 1), false);
});
for (const etag of [false, 'weak', 'strong']) test('all binary view windows send exact bytes, etag=' + etag, async () => {
  const bytes = Uint8Array.from([99, 98, 1, 2, 3, 4, 97, 96]);
  const values = [new DataView(bytes.buffer, 2, 4), new Uint16Array(bytes.buffer, 2, 2), new Int32Array(bytes.buffer, 4, 1), bytes.subarray(2, 6), new DataView(bytes.buffer, 2, 0)];
  const a = app().set('etag', etag); a.get('/:id', (req, res) => res.send(values[req.params.id]));
  await serve(a, async get => {
    for (let i = 0; i < values.length; i++) {
      const value = values[i], r = await get('/' + i), expected = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
      assert.deepEqual(r.bytes, expected); assert.equal(r.headers['content-length'], String(expected.length));
      assert.equal(r.headers['content-type'], 'application/octet-stream');
      assert.equal(r.headers.etag, etag ? require('vetag')(expected, { weak: etag === 'weak' }) : undefined);
    }
  });
});
test('send resolves preexisting Transfer-Encoding and Content-Length conflict', async () => {
  const a = app(); a.get('/{empty}', (req, res) => res.set({ 'Transfer-Encoding': 'chunked', 'Content-Length': '999' }).send(req.path === '/empty' ? undefined : 'abc'));
  await serve(a, async get => {
    for (const path of ['/', '/empty']) {
      const r = await get(path); assert.equal(r.text, path === '/empty' ? '' : 'abc'); assert.equal(r.headers['content-length'], undefined); assert.equal(r.headers['transfer-encoding'], 'chunked');
    }
  });
});
for (const status of [204, 205, 304]) test('bodyless status ' + status + ' removes stale streaming/trailer headers', async () => {
  const a = app(); a.get('/', (req, res) => res.set({ Trailer: 'X-Checksum', 'Transfer-Encoding': 'chunked' }).status(status).send('discard'));
  await serve(a, async get => {
    const r = await get(); assert.equal(r.status, status); assert.equal(r.text, ''); assert.equal(r.headers.trailer, undefined); assert.equal(r.headers['transfer-encoding'], undefined);
    assert.equal(r.headers['content-length'], status === 205 ? '0' : undefined);
  });
});
for (const status of [302, 204, 205, 304]) test('redirect ' + status + ' uses coherent framing', async () => {
  const a = app(); a.get('/', (req, res) => res.set({ Trailer: 'X-Checksum', 'Transfer-Encoding': 'chunked' }).redirect(status, '/next'));
  await serve(a, async get => {
    const r = await get('/', { headers: { Accept: 'text/plain' } }); assert.equal(r.status, status); assert.equal(r.headers.location, '/next'); assert.equal(r.headers.trailer, undefined); assert.equal(r.headers['transfer-encoding'], undefined);
    if (status !== 302) assert.equal(r.text, ''); else assert.equal(Number(r.headers['content-length']), r.bytes.length);
  });
});
test('HEAD, conditional GET and JSON escaping retain their contracts', async () => {
  const a = app().set('json escape', true); a.get('/', (req, res) => res.json({ value: '<&>' }));
  await serve(a, async get => {
    const r = await get(); assert.equal(r.text, '{"value":"\\u003c\\u0026\\u003e"}');
    const head = await get('/', { method: 'HEAD' }); assert.equal(head.text, ''); assert.equal(head.headers['content-length'], r.headers['content-length']);
    assert.equal((await get('/', { headers: { 'If-None-Match': r.headers.etag } })).status, 304);
  });
});
test('custom ETag functions keep receiving Buffer bodies', async () => {
  const a = app().set('etag', body => { assert.ok(Buffer.isBuffer(body)); return '"custom"'; });
  a.get('/', (req, res) => res.send('雪'));
  await serve(a, async get => assert.equal((await get()).headers.etag, '"custom"'));
});
test('built-in ETags preserve UTF-8, lone surrogate, boundary lengths and encoding behavior', async () => {
  const values = ['', 'hello', '雪🧮', '\ud800x\udc00', 'a'.repeat(999), 'a'.repeat(1000), '雪'.repeat(999)];
  for (const strength of ['weak', 'strong']) {
    const a = app().set('etag', strength); a.get('/:id', (req, res) => res.send(values[req.params.id]));
    await serve(a, async get => {
      for (let i = 0; i < values.length; i++) {
        const expected = Buffer.from(values[i]), r = await get('/' + i);
        assert.deepEqual(r.bytes, expected); assert.equal(r.headers['content-length'], String(expected.length));
        assert.equal(r.headers.etag, require('vetag')(expected, { weak: strength === 'weak' }));
      }
    });
  }
  const utils = require('../lib/utils');
  assert.equal(utils.etag('é', 'latin1'), require('vetag')(Buffer.from('é', 'latin1')));
});
test('canonical Content-Type fast path preserves general parsing and response overrides', async () => {
  const utils = require('../lib/utils'), contentType = require('vcontent-type');
  for (const type of ['application/json; charset=utf-8', 'text/html; charset=utf-8', 'text/plain; charset=utf-8', 'TEXT/HTML; CHARSET="latin1"', 'text/html; z=x; a=y', 'text/plain; charset=UTF-8']) {
    const parsed = contentType.parse(type); parsed.parameters.charset = 'utf-8';
    assert.equal(utils.setCharset(type, 'utf-8'), contentType.format(parsed));
  }
  assert.throws(() => utils.setCharset('not a media type', 'utf-8'));
  const a = app(); const set = a.response.set; let calls = 0;
  a.response.set = function(name, value) { if (name.toLowerCase() === 'content-type') calls++; return set.call(this, name, value); };
  a.get('/', (req, res) => res.json({ ok: true }));
  await serve(a, async get => { assert.equal((await get()).headers['content-type'], 'application/json; charset=utf-8'); assert.equal(calls, 2); });
});
test('request header getters ignore inherited header fields including referer aliases', () => {
  const req = Object.create(express.request); req.headers = Object.create({ referer: 'bad', referrer: 'bad', constructor: 'bad', accept: 'bad' });
  for (const key of ['referer', 'referrer', 'constructor', 'Accept']) assert.equal(req.get(key), undefined);
  req.headers.referer = 'own'; assert.equal(req.header('Referrer'), 'own');
});
test('response header objects and format defaults ignore inherited properties', async () => {
  const a = app(); a.get('/', (req, res) => {
    res.set(Object.assign(Object.create({ 'X-Inherited': 'bad' }), { 'X-Own': 'yes' }));
    res.format(Object.create({ default() { throw new Error('inherited callback'); } }));
  });
  await serve(a, async get => { const r = await get(); assert.equal(r.status, 406); assert.equal(r.headers['x-own'], 'yes'); assert.equal(r.headers['x-inherited'], undefined); });
});
test('sendFile accepts frozen options and snapshots delayed header values', async () => {
  const headers = { 'X-Test': ['before'] }, options = Object.freeze({ root, headers });
  const a = app(); a.get('/', (req, res) => { res.sendFile('file.txt', options); headers['X-Test'][0] = 'after'; headers['X-New'] = 'later'; });
  await serve(a, async get => { const r = await get(); assert.equal(r.text, 'file body'); assert.equal(r.headers['x-test'], 'before'); assert.equal(r.headers['x-new'], undefined); });
  assert.equal(Object.hasOwn(options, 'etag'), false);
});
test('download preserves copied root/maxAge/headers and cannot override disposition', async () => {
  const options = Object.freeze({ root, maxAge: 2000, headers: Object.freeze({ 'Content-Disposition': 'bad', 'X-Test': 'yes' }) });
  const a = app(); a.get('/', (req, res) => res.download('file.txt', 'nice.txt', options));
  await serve(a, async get => { const r = await get(); assert.equal(r.text, 'file body'); assert.equal(r.headers['content-disposition'], 'attachment; filename=nice.txt'); assert.equal(r.headers['x-test'], 'yes'); assert.match(r.headers['cache-control'], /max-age=2/); });
});
test('render accepts frozen options and retains local precedence', async () => {
  const a = app().set('views', root).set('view engine', 'tpl'); const options = Object.freeze({ name: 'option' });
  a.locals.name = 'application'; a.engine('tpl', (file, opts, cb) => cb(null, opts.name + ':' + opts.local));
  a.get('/', (req, res) => { res.locals = { name: 'response', local: 'local' }; res.render('view', options); });
  await serve(a, async get => assert.equal((await get()).text, 'option:local'));
  assert.equal(Object.hasOwn(options, '_locals'), false);
});
for (const mode of ['twice', 'callback-then-throw', 'throw', 'async-twice']) test('view engines settle once: ' + mode, async () => {
  const a = app().set('views', root).set('view engine', 'tpl');
  a.engine('tpl', (file, opts, cb) => {
    if (mode === 'throw') throw new Error('first');
    const finish = () => { cb(null, 'first'); if (mode === 'callback-then-throw') throw new Error('late'); cb(new Error('late')); };
    if (mode === 'async-twice') setImmediate(finish); else finish();
  });
  let calls = 0, sync = true;
  const rendered = new Promise((resolve, reject) => a.render('view', (error, html) => {
    calls++; try { assert.equal(sync, false); if (mode === 'throw') assert.equal(error.message, 'first'); else { assert.equal(error, null); assert.equal(html, 'first'); } resolve(); } catch (err) { reject(err); }
  }));
  sync = false; await rendered; await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 1);
});
test('VPM body parsing and negotiation boundaries are retained in the application', async () => {
  const a = app(); a.use(express.json());
  a.get('/', (req, res) => res.json({ type: req.accepts('html'), language: req.acceptsLanguages('en') }));
  a.post('/', (req, res) => res.json(req.body)); a.use((err, req, res, next) => res.status(err.status || 500).json({ type: err.type, message: err.message }));
  await serve(a, async get => {
    const r = await get('/', { headers: { Accept: '*/html', 'Accept-Language': 'en;q=.5,en-US' } });
    assert.deepEqual(JSON.parse(r.text), { type: false, language: false });
    const invalid = await get('/', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, 'true');
    assert.equal(invalid.status, 400); assert.deepEqual(JSON.parse(invalid.text), { type: 'entity.parse.failed', message: 'JSON body must be an object or array' });
  });
  for (const extended of [true, false]) assert.throws(() => express.urlencoded({ extended, parameterLimit: 10.1 }), TypeError);
});
test('listen reports address conflicts once', async () => {
  await serve(app(), async (get, server) => {
    let calls = 0;
    await new Promise((resolve, reject) => {
      const other = app().listen(server.address().port, '127.0.0.1', error => { calls++; try { assert.equal(error.code, 'EADDRINUSE'); resolve(); } catch (err) { reject(err); } });
      other.unref();
    });
    assert.equal(calls, 1);
  });
});
