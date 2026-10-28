'use strict';
// The integration gate. Aliases every VPM package into ventimath's pinned HTTP
// consumer upgrade target (scripts/consumers) inside this process only, then drives those
// consumers the way ventimath's Cloud Functions use them: an onRequest handler
// and an Express application served by the Functions Framework. Installed copies
// whose versions VPM does not target are reported, not aliased.
//
//   npm --prefix scripts/consumers ci --ignore-scripts
//   node scripts/integration.cjs [path/to/node_modules]
//   bun scripts/integration.cjs [path/to/node_modules]

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { gzipSync } = require('node:zlib');
const { createRequire } = require('node:module');

process.env.GCLOUD_PROJECT ||= 'vpm-integration';
process.env.DEBUG = 'express:*,router:*,send,body-parser:*,finalhandler';
process.env.DEBUG_COLORS = '0';
process.env.DEBUG_HIDE_DATE = '1';
process.env.NODE_ENV ||= 'development';

const modules = path.resolve(process.argv[2] || path.join(__dirname, 'consumers/node_modules'));
const fixture = require(path.join(__dirname, 'consumers/package.json'));

// Upstream name -> VPM package and the upstream versions that package targets.
const targets = {
  'content-disposition': { pkg: 'vcontent-disposition', versions: /^2\.0\.1$/ },
  'body-parser': { pkg: 'vbody-parser', versions: /^2\.4\.0$/ },
  qs: { pkg: 'vqs', versions: /^6\.17\.0$/ },
  'iconv-lite': { pkg: 'viconv-lite', versions: /^0\.7\./ },
  'raw-body': { pkg: 'vraw-body', versions: /^3\.0\./ },
  bytes: { pkg: 'vbytes', versions: /^3\.1\./ },
  negotiator: { pkg: 'vnegotiator', versions: /^1\.1\./ },
  accepts: { pkg: 'vaccepts', versions: /^2\.0\./ },
  'content-type': { pkg: 'vcontent-type', versions: /^2\.1\./ },
  'media-typer': { pkg: 'vmedia-typer', versions: /^1\.1\./ },
  'type-is': { pkg: 'vtype-is', versions: /^2\.1\./ },
  'ee-first': { pkg: 'vee-first', versions: /^1\.1\./ },
  'on-finished': { pkg: 'von-finished', versions: /^2\.4\./ },
  parseurl: { pkg: 'vparseurl', versions: /^1\.3\./ },
  encodeurl: { pkg: 'vencodeurl', versions: /^2\./ },
  'escape-html': { pkg: 'vescape-html', versions: /^1\.0\./ },
  statuses: { pkg: 'vstatuses', versions: /^2\./ },
  ms: { pkg: 'vms', versions: /^2\.1\./ },
  debug: { pkg: 'vdebug', versions: /^4\./ },
  finalhandler: { pkg: 'vfinalhandler', versions: /^2\./ },
  'http-errors': { pkg: 'vhttp-errors', versions: /^2\./ },
  etag: { pkg: 'vetag', versions: /^1\.8\./ },
  fresh: { pkg: 'vfresh', versions: /^2\./ },
  'range-parser': { pkg: 'vrange-parser', versions: /^1\.2\./ },
  'mime-db': { pkg: 'vmime-db', versions: /^1\.54\./ },
  'mime-types': { pkg: 'vmime-types', versions: /^3\./ },
  send: { pkg: 'vsend', versions: /^1\.2\.1$/ },
  'serve-static': { pkg: 'vserve-static', versions: /^2\.2\.1$/ },
};

// Calls and property reads are both counted: consumers read tables such as
// statuses.message and mime.types as often as they call functions.
const calls = Object.fromEntries(Object.keys(targets).map(name => [name, 0]));
function counting(name, value) {
  return new Proxy(value, {
    apply(target, thisArg, args) { calls[name]++; return Reflect.apply(target, thisArg, args); },
    construct(target, args, newTarget) { calls[name]++; return Reflect.construct(target, args, newTarget); },
    get(target, key, receiver) { if (typeof key === 'string') calls[name]++; return Reflect.get(target, key, receiver); },
  });
}
// Instrument VPM exports before loading their parents, so transitive calls
// (including range-parser through vsend) are measured, not exempted.
const replacements = {};
const upstreamNames = Object.fromEntries(Object.entries(targets).map(([name, { pkg }]) => [pkg, name]));
function replacement(name) {
  if (Object.hasOwn(replacements, name)) return replacements[name];
  const directory = path.join(__dirname, '../packages', targets[name].pkg);
  for (const pkg of Object.keys(require(path.join(directory, 'package.json')).dependencies || {})) {
    if (Object.hasOwn(upstreamNames, pkg)) replacement(upstreamNames[pkg]);
  }
  const entry = require.resolve(directory);
  const value = counting(name, require(entry));
  require.cache[entry].exports = value;
  replacements[name] = value;
  return value;
}
for (const name of Object.keys(targets)) replacement(name);

// Some packages hide package.json or expose only ESM entry points. Locate their
// metadata through Node's package search paths without executing their code.
function resolveManifest(from, name) {
  try { return from.resolve(name + '/package.json'); } catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    for (const directory of from.resolve.paths(name) || []) {
      const manifest = path.join(directory, name, 'package.json');
      if (fs.existsSync(manifest) && require(manifest).name === name) return fs.realpathSync(manifest);
    }
    throw error;
  }
}

// Walk every dependency edge from the fixture roots and alias matching copies.
const aliased = new Map();
const uncovered = new Map();
const contentTypes = new Map();
const contentTypeCallers = new Set();
const seen = new Set();
const queue = Object.keys(fixture.dependencies).map(name => require.resolve(path.join(modules, name, 'package.json')));
while (queue.length) {
  const manifest = queue.pop();
  if (seen.has(manifest)) continue;
  seen.add(manifest);
  const data = require(manifest);
  if (data.name === 'content-type') contentTypes.set(manifest, data.version);
  const from = createRequire(manifest);
  for (const name of Object.keys(Object.assign({}, data.dependencies, data.optionalDependencies))) {
    let child;
    try { child = resolveManifest(from, name); } catch (error) {
      if (Object.hasOwn(data.optionalDependencies || {}, name) && error.code === 'MODULE_NOT_FOUND') continue;
      throw error;
    }
    queue.push(child);
    if (name === 'content-type') contentTypeCallers.add(data.name);
    if (!Object.hasOwn(targets, name)) continue;
    const version = require(child).version;
    const label = name + '@' + version;
    if (!targets[name].versions.test(version)) {
      const via = uncovered.get(label) || new Set();
      via.add(data.name + '@' + data.version);
      uncovered.set(label, via);
      continue;
    }
    const entry = from.resolve(name);
    if (!require.cache[entry]?.vpmAlias) {
      require(entry);
      require.cache[entry].exports = replacements[name];
      require.cache[entry].vpmAlias = true;
    }
    aliased.set(label, path.relative(modules, path.dirname(entry)));
  }
}
// Upgrade callers instead of overriding a parser across incompatible APIs.
// In particular, old body-parser passes a request object; content-type 2 takes
// a header string. Every current caller must share the supported 2.x copy.
assert.equal(contentTypes.size, 1, 'the consumer graph must share one content-type copy');
assert.match([...contentTypes.values()][0], /^2\./, 'content-type must stay on the compatible 2.x baseline');
for (const name of ['express', 'body-parser', 'type-is', 'negotiator']) {
  assert.ok(contentTypeCallers.has(name), `content-type dependency traversal missed ${name}`);
}
for (const name of Object.keys(targets)) {
  assert.ok([...aliased.keys()].some(label => label.startsWith(name + '@')), `no installed copy of ${name} was aliased`);
}

// Debug output and error logs from the consumers are collected from here on.
const stderr = [];
const writeStderr = process.stderr.write.bind(process.stderr);
const consoleError = console.error;
process.stderr.write = chunk => { stderr.push(String(chunk)); return true; };
console.error = (...args) => { stderr.push(args.map(String).join(' ')); };
let checks = 0;

// Consumers load after aliasing so their require() calls receive VPM exports.
const from = createRequire(path.join(modules, 'package.json'));
const express = from('express');
const getRawBody = from('raw-body');
const createError = from('http-errors');
const jwt = from('jsonwebtoken');
const functions = from('@google-cloud/functions-framework');
const { getTestServer } = from('@google-cloud/functions-framework/testing');
const { onRequest } = from('firebase-functions/v2/https');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-integration-'));
const content = '0123456789abcdefghij';
fs.writeFileSync(path.join(directory, 'data.txt'), content);
fs.writeFileSync(path.join(directory, 'page.html'), '<p>page</p>');
fs.writeFileSync(path.join(directory, 'empty.txt'), '');
fs.writeFileSync(path.join(directory, '.secret'), 'hidden');
fs.mkdirSync(path.join(directory, 'nested dir'));
fs.writeFileSync(path.join(directory, 'nested dir', 'index.html'), '<p>index</p>');

// ventimath's functions are onRequest handlers that route on request.path and
// read the JSON body the Functions Framework already parsed.
const api = onRequest({ cors: true }, async (request, response) => {
  if (request.path === '/echo' && request.method === 'POST') return response.json(request.body);
  if (request.path === '/is') return response.json({
    type: request.is(), exact: request.is('APPLICATION/JSON'), suffix: request.is('+JSON'),
    shortcut: request.is(['urlencoded', 'multipart']),
  });
  if (request.path === '/pdf') {
    response.set('Content-Type', 'application/pdf; name=report (1).pdf');
    return response.send(Buffer.from('%PDF-1.4'));
  }
  if (request.path === '/typed') return response.type('json').send('{"ok":true}');
  if (request.path === '/parameterized') return response.set('Content-Type', 'text/plain; note="a;b"; charset=iso-8859-1').send('café');
  if (request.path === '/accept') return response.json({ type: request.accepts(['application/json; profile="a,b"', 'text/html']) });
  if (request.path === '/negotiate') return response.json({
    type: request.accepts('html', 'json'),
    encoding: request.acceptsEncodings('gzip', 'br', 'identity'),
    charset: request.acceptsCharsets('utf-8', 'iso-8859-1'),
    language: request.acceptsLanguages('en', 'fr'),
  });
  if (request.path === '/accept-profile') return response.json({ type: request.accepts(['application/json;profile=ABC', 'text/html']) });
  if (request.path === '/accept-specific') return response.json({ type: request.accepts(['text/html;level=1;profile=a', 'application/json']) });
  if (request.path === '/redirect') return response.redirect('/landing?next=<a b>&x=%zz');
  if (request.path === '/file') return response.sendFile(path.join(directory, 'data.txt'), { maxAge: '1 day' });
  if (request.path === '/deny') throw createError(403, 'forbidden by policy', { headers: { 'X-Policy': 'deny' } });
  if (request.path === '/crash') throw new Error('unexpected failure with secret details');
  response.status(404).json({ error: 'not found' });
});
functions.http('api', api);

// Express applications are also deployed as onRequest handlers.
const app = express();
const completed = []; const failures = [];
function sent(name, next) {
  return error => { if (error) { failures.push(error); next(error); } else completed.push(name); };
}
app.get('/send-file', (_req, res, next) => res.sendFile('data.txt', { root: directory, headers: { 'X-Custom': 'yes' } }, sent('file', next)));
app.get('/send-empty', (_req, res, next) => res.sendFile(path.join(directory, 'empty.txt'), sent('empty', next)));
app.get('/download', (_req, res, next) => res.download(path.join(directory, 'data.txt'), 'renamed.txt', sent('download', next)));
const downloadNames = [
  ['unicode', 'café-雪.txt', 'attachment; filename="caf?-?.txt"; filename*=UTF-8\'\'caf%C3%A9-%E9%9B%AA.txt'],
  ['quotes', 'a"b.txt', 'attachment; filename="a\\"b.txt"'],
  ['percent', '%20.txt', 'attachment; filename=%20.txt; filename*=UTF-8\'\'%2520.txt'],
  ['control', 'a\r\nb.txt', 'attachment; filename="a??b.txt"; filename*=UTF-8\'\'a%0D%0Ab.txt'],
];
for (const [id, filename] of downloadNames) {
  app.get('/download-' + id, (_req, res, next) => res.download(path.join(directory, 'data.txt'), filename, sent('download-' + id, next)));
  app.get('/attachment-' + id, (_req, res) => res.attachment(filename).send(content));
}
app.get('/send-missing', (_req, res, next) => res.sendFile('missing.txt', { root: directory }, sent('missing', next)));
app.use('/static', express.static(directory, { maxAge: '2 hours', extensions: ['html'], setHeaders: res => res.setHeader('X-Static', 'yes') }));
app.use('/strict', express.static(directory, { fallthrough: false, redirect: false }));
app.use('/hidden', express.static(directory, { fallthrough: false, dotfiles: 'deny' }));
app.use('/mounted', express.static(directory, { index: 'page.html' }));
app.use('/static-framing', (_req, res, next) => {
  res.setHeader('Transfer-Encoding', 'chunked'); res.setHeader('Trailer', 'Digest');
  res.setHeader('Content-Encoding', 'gzip'); res.setHeader('Content-Range', 'bytes 0-1/2'); next();
}, express.static(directory, { fallthrough: false }));
app.post('/body', express.json({ limit: '64b' }), (req, res) => res.json(req.body));
app.get('/cached', (_req, res) => res.send('stable body'));
app.get('/format', (_req, res) => res.format({
  html: () => res.send('<p>html</p>'),
  json: () => res.json({ format: 'json' }),
}));
app.get('/error', (_req, _res, next) => next(createError(401, 'private', { headers: { 'WWW-Authenticate': 'Basic' } })));
app.get('/double', (_req, _res, next) => { next(); setImmediate(() => next(new Error('late error'))); });
app.get('/framing', (_req, res, next) => { res.setHeader('Transfer-Encoding', 'chunked'); next(createError(429, 'slow down', { headers: { 'Retry-After': '5' } })); });
functions.http('app', onRequest(app));

// A direct Express app also tests custom parser patterns before the framework's
// catch-all raw parser can consume their bodies.
const parserApp = express();
parserApp.set('query parser', 'extended');
parserApp.get('/nested-query', (req, res) => res.json(req.query));
parserApp.post('/nested-form', express.urlencoded({ extended: true, depth: 3, parameterLimit: 8, charsetSentinel: true, interpretNumericEntities: true }), (req, res) => res.json(req.body));
parserApp.post('/large-form-limit', express.urlencoded({ extended: true, parameterLimit: 2 ** 32 }), (req, res) => res.json(req.body));
const frozenVerificationError = Object.freeze(Object.assign(new Error('rejected'), { status: 422 }));
parserApp.post('/frozen-verify', express.json({ verify() { throw frozenVerificationError; } }), (_req, _res) => assert.fail('verification should fail'),
  (error, _req, res, _next) => {
    assert.equal(error.cause, frozenVerificationError);
    assert.equal(error.type, 'entity.verify.failed');
    res.status(error.status).json({ type: error.type });
  });
parserApp.post('/primitive-reviver', express.json({ reviver() { throw null; } }), (_req, _res) => assert.fail('reviver should fail'),
  (error, _req, res, _next) => {
    assert.equal(error.cause, null);
    assert.equal(error.type, 'entity.parse.failed');
    res.status(error.status).json({ type: error.type });
  });
// Exercise byte limits before the framework's parser has consumed the stream.
for (const limit of ['100kbjunk', '1e3', '', '8pb', Infinity]) {
  const expected = { name: limit === '8pb' || limit === Infinity ? 'RangeError' : 'TypeError' };
  assert.throws(() => express.json({ limit }), expected);
  const stream = new PassThrough();
  // raw-body normally interprets a null parse result as unlimited. Invalid
  // supplied limits must throw before reading, including its callback API.
  assert.throws(() => getRawBody(stream, { limit }, () => assert.fail('invalid limit invoked callback')), expected);
  assert.throws(() => getRawBody(stream, { limit }), expected);
  assert.equal(stream.readableFlowing, null);
  assert.equal(stream.listenerCount('data'), 0);
  stream.destroy();
}
parserApp.post('/limit-json', express.json({ limit: '7b' }), (req, res) => res.json(req.body));
parserApp.post('/limit-raw', express.raw({ limit: '1kb' }), (req, res) => res.json({ length: req.body.length }));
parserApp.post('/limit-text', express.text({ limit: '3b' }), (req, res) => res.json({ text: req.body }));
parserApp.post('/verified-json', express.json({ verify(_req, _res, buffer, encoding) {
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(encoding, 'utf-8');
  if (buffer.toString() !== '{"a":1}') throw new Error('verification failed');
} }), (req, res) => res.json(req.body));
parserApp.post('/direct-raw', async (req, res, next) => {
  try { const body = await getRawBody(req, { limit: '4b' }); res.json({ length: body.length }); } catch (error) { next(error); }
});
parserApp.post('/encoded-raw', async (req, res, next) => {
  let chunks = 0;
  req.on('data', () => { chunks++; });
  try { const text = await getRawBody(req, { encoding: req.query.charset, limit: '16kb' }); res.json({ text, chunks }); }
  catch (error) { next(error); }
});
parserApp.post('/unlimited-raw', async (req, res, next) => {
  try { const body = await getRawBody(req); res.json({ length: body.length }); } catch (error) { next(error); }
});
parserApp.post('/invalid-limit', (req, res) => {
  try { getRawBody(req, { limit: '100kbjunk' }, () => res.sendStatus(200)); }
  catch (error) { assert.ok(error instanceof TypeError); req.resume(); res.sendStatus(400); }
});
parserApp.use(express.json({ type: ['APPLICATION/JSON', 'application/*+JSON'] }));
parserApp.use(express.text({ type: 'TEXT/*' }));
parserApp.use(express.urlencoded({ extended: false, type: 'URLENCODED' }));
parserApp.use((req, res) => res.json({ body: req.body === undefined ? null : req.body }));

async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server;
}

async function abortedRequest() {
  checks++;
  let client, resolveRead, rejectRead;
  const completed = new Promise((resolve, reject) => { resolveRead = resolve; rejectRead = reject; });
  const server = await listen(http.createServer(req => {
    req.once('data', () => client.destroy());
    getRawBody(req, { length: 8 }, error => {
      try {
        assert.equal(error.type, 'request.aborted');
        assert.equal(error.status, 400); assert.equal(error.code, 'ECONNABORTED');
        assert.equal(error.received, 2); assert.equal(error.expected, 8);
        assert.equal(req.listenerCount('data'), 0);
        resolveRead();
      } catch (error) { rejectRead(error); }
    });
  }));
  const timer = setTimeout(() => rejectRead(new Error('aborted body read did not settle')), 5000);
  try {
    client = http.request({ host: '127.0.0.1', port: server.address().port, method: 'POST', headers: { 'content-length': '8' }, agent: false });
    client.on('error', error => { if (error.code !== 'ECONNRESET') rejectRead(error); });
    client.write('ab');
    await completed;
  } finally {
    clearTimeout(timer); client?.destroy();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}

function request(server, route, { headers = {}, method = 'GET', body, chunks } = {}) {
  checks++;
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: route, headers, method, agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('integration request timed out')));
    if (chunks) {
      const send = index => {
        if (index === chunks.length) { req.end(); return; }
        req.write(chunks[index]); setTimeout(() => send(index + 1), 10);
      };
      send(0);
    } else req.end(body);
  });
}

async function run() {
  const apiServer = await listen(getTestServer('api'));
  const appServer = await listen(getTestServer('app'));
  const parserServer = await listen(http.createServer(parserApp));
  try {
    await abortedRequest();
    const largeLimit = await request(parserServer, '/large-form-limit', { method: 'POST', body: 'a=1&b=2', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(largeLimit.status, 200); assert.deepEqual(JSON.parse(largeLimit.body), { a: '1', b: '2' });
    for (const [route, status, type] of [['/frozen-verify', 422, 'entity.verify.failed'], ['/primitive-reviver', 400, 'entity.parse.failed']]) {
      const result = await request(parserServer, route, { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } });
      assert.equal(result.status, status); assert.deepEqual(JSON.parse(result.body), { type });
    }
    for (const [query, expected] of [
      ['person[name]=Ada&tags[]=math&tags[]=code', { person: { name: 'Ada' }, tags: ['math', 'code'] }],
      ['a=1&a=2&bad=%E0%A4%A&text=hello+world', { a: ['1', '2'], bad: '%E0%A4%A', text: 'hello world' }],
      ['__proto__[vqsPolluted]=yes&safe=ok', { safe: 'ok' }],
    ]) {
      const result = await request(parserServer, '/nested-query?' + query);
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), expected);
      assert.equal(Object.prototype.vqsPolluted, undefined);
    }
    for (const [body, expected] of [
      ['person[name]=Ada&tags[]=math&tags[]=code', { person: { name: 'Ada' }, tags: ['math', 'code'] }],
      ['a[2]=x&a[0]=y', { a: ['y', 'x'] }],
      ['a[b]=x&a=y&a=z', { a: { b: 'x', 0: 'y', 1: 'z' } }],
      ['a=1&a=2&empty=&bare', { a: ['1', '2'], empty: '', bare: '' }],
      ['a=%F0%9F%92%A9&bad=%E0%A4%A', { a: '💩', bad: '%E0%A4%A' }],
      ['utf8=%26%2310003%3B&a=%E9&b=%26%2310003%3B', { a: 'é', b: '✓' }],
      ['__proto__[vqsPolluted]=yes&safe=ok', { safe: 'ok' }],
    ]) {
      const result = await request(parserServer, '/nested-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), expected);
      assert.equal(Object.prototype.vqsPolluted, undefined);
    }
    for (const [body, status] of [['a[b][c][d][e]=x', 400], [Array(9).fill('a=1').join('&'), 413]]) {
      const result = await request(parserServer, '/nested-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
      assert.equal(result.status, status);
    }
    const defaults = { type: 'html', encoding: 'identity', charset: 'utf-8', language: 'en' };
    for (const [headers, changes] of [
      [{}, {}],
      [{ accept: 'text/html;q=2, application/json;q=0.7' }, { type: 'json' }],
      [{ accept: 'text/html;q=0.8junk, application/json;q=0.5' }, { type: 'json' }],
      [{ accept: '' }, { type: false }],
      [{ accept: '*/*;q=0' }, { type: false }],
      [{ accept: 'text/html;q=0, */*;q=1' }, { type: 'json' }],
      [{ accept: 'text/html, application/json, text/html' }, {}],
      [{ accept: ['text/html;q=0.2', 'application/json'] }, { type: 'json' }],
      [{ 'accept-encoding': 'gzip;q=0.5, br;q=0.9' }, { encoding: 'br' }],
      [{ 'accept-encoding': '*;q=0' }, { encoding: false }],
      [{ 'accept-charset': 'utf-8;Q=2, iso-8859-1;q=0.5' }, { charset: 'iso-8859-1' }],
      [{ 'accept-language': 'en;q=0.8junk, fr;q=0.5' }, { language: 'fr' }],
    ]) {
      const result = await request(apiServer, '/negotiate', { headers });
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), { ...defaults, ...changes });
    }
    const profile = await request(apiServer, '/accept-profile', { headers: { accept: 'application/json;profile=abc, text/html;q=0.5' } });
    assert.equal(profile.status, 200); assert.deepEqual(JSON.parse(profile.body), { type: 'text/html' });
    const specific = await request(apiServer, '/accept-specific', { headers: { accept: 'text/html;level=1;q=0.9, text/html;level=1;profile=a;q=0, application/json;q=0.5' } });
    assert.equal(specific.status, 200); assert.deepEqual(JSON.parse(specific.body), { type: 'application/json' });
    const formatted = await request(appServer, '/format', { headers: { accept: 'text/html;q=2, application/json;q=0.5' } });
    assert.equal(formatted.status, 200); assert.equal(formatted.body, '{"format":"json"}');
    assert.equal(formatted.headers['content-type'], 'application/json; charset=utf-8');
    assert.match(formatted.headers.vary, /Accept/);
    assert.equal((await request(appServer, '/format', { headers: { accept: 'text/html' } })).body, '<p>html</p>');
    assert.equal((await request(appServer, '/format', { headers: { accept: '*/*;q=0' } })).status, 406);
    // Express req.is preserves null / false / matching-string results.
    for (const [options, expected] of [
      [{}, { type: null, exact: null, suffix: null, shortcut: null }],
      [{ method: 'POST', body: 'x' }, { type: false, exact: false, suffix: false, shortcut: false }],
      [{ method: 'POST', headers: { 'content-type': 'APPLICATION/JSON' }, body: '{}' },
        { type: 'application/json', exact: 'APPLICATION/JSON', suffix: false, shortcut: false }],
      [{ method: 'POST', headers: { 'content-type': 'application/problem+json' }, body: '{}' },
        { type: 'application/problem+json', exact: false, suffix: 'application/problem+json', shortcut: false }],
      [{ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=1' },
        { type: 'application/x-www-form-urlencoded', exact: false, suffix: false, shortcut: 'urlencoded' }],
      [{ method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: 'x' },
        { type: 'multipart/form-data', exact: false, suffix: false, shortcut: 'multipart' }],
      [{ method: 'POST', headers: { 'content-type': 'text/@bad' }, body: 'x' },
        { type: false, exact: false, suffix: false, shortcut: false }],
    ]) {
      const result = await request(apiServer, '/is', options);
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), expected);
    }
    for (const [type, body, parsed] of [
      ['application/json', '{"a":1}', { a: 1 }],
      ['APPLICATION/PROBLEM+JSON; charset=utf-8', '{"a":2}', { a: 2 }],
      ['application/vnd.foo+bar+json', '{"a":3}', { a: 3 }],
      ['text/plain', 'hello', 'hello'],
      ['application/x-www-form-urlencoded', 'a=1&b=two', { a: '1', b: 'two' }],
      ['application/octet-stream', 'ignored', null],
      ['text/@bad', 'ignored', null],
    ]) {
      const result = await request(parserServer, '/', { method: 'POST', headers: { 'content-type': type }, body });
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), { body: parsed });
    }
    for (const [route, type, body, extra, expected] of [
      ['/limit-json', 'application/json', '{"a":1}', {}, 200],
      ['/limit-json', 'application/json', '{"a":10}', {}, 413],
      ['/limit-raw', 'application/octet-stream', 'x'.repeat(1024), { 'content-length': '1024' }, 200],
      ['/limit-raw', 'application/octet-stream', 'x'.repeat(1025), { 'content-length': '1025' }, 413],
      ['/direct-raw', 'application/octet-stream', '1234', { 'transfer-encoding': 'chunked' }, 200],
      ['/direct-raw', 'application/octet-stream', '12345', { 'transfer-encoding': 'chunked' }, 413],
      ['/limit-text', 'text/plain', 'éa', {}, 200],
      ['/limit-text', 'text/plain', 'éé', {}, 413],
      ['/limit-raw', 'application/octet-stream', gzipSync('x'.repeat(1024)), { 'content-encoding': 'gzip' }, 200],
      ['/limit-raw', 'application/octet-stream', gzipSync('x'.repeat(1025)), { 'content-encoding': 'gzip' }, 413],
      ['/unlimited-raw', 'application/octet-stream', '12345', {}, 200],
      ['/invalid-limit', 'application/octet-stream', 'x'.repeat(200), {}, 400],
    ]) {
      const result = await request(parserServer, route, { method: 'POST', headers: { 'content-type': type, ...extra }, body });
      assert.equal(result.status, expected, route + ' ' + body.length);
      if (route === '/limit-raw' && expected === 200) assert.deepEqual(JSON.parse(result.body), { length: 1024 });
      if (route === '/direct-raw' && expected === 200) assert.deepEqual(JSON.parse(result.body), { length: 4 });
      if (route === '/limit-json' && expected === 200) assert.deepEqual(JSON.parse(result.body), { a: 1 });
      if (route === '/limit-text' && expected === 200) assert.deepEqual(JSON.parse(result.body), { text: 'éa' });
      if (route === '/unlimited-raw') assert.deepEqual(JSON.parse(result.body), { length: 5 });
    }
    for (const [charset, hex, expected] of [
      ['windows-1251', 'cff0e8e2e5f2', 'Привет'],
      ['shift_jis', '93fa967b', '日本'],
      ['gb18030', '9439da33', '💩'],
      ['big5hkscs', '8862', 'Ê̄'],
      ['utf-16be', 'feffd83ddca9', '💩'],
      ['utf-32le', 'fffe0000a9f40100', '💩'],
      ['cesu8', 'e2', '�'],
      ['utf7', '2b4141412d', '\0'],
      ['utf7imap', '264141412d', '\0'],
    ]) {
      const result = await request(parserServer, '/', { method: 'POST', headers: { 'content-type': 'text/plain; charset=' + charset }, body: Buffer.from(hex, 'hex') });
      assert.equal(result.status, 200, charset); assert.deepEqual(JSON.parse(result.body), { body: expected }, charset);
    }
    for (const [charset, parts, expected] of [
      ['gb18030', ['9439da', '33'], '💩'],
      ['big5hkscs', ['88', '62'], 'Ê̄'],
      ['utf7', ['2b414141', '2d'], '\0'],
    ]) {
      const result = await request(parserServer, '/encoded-raw?charset=' + charset, { method: 'POST', chunks: parts.map(hex => Buffer.from(hex, 'hex')) });
      assert.equal(result.status, 200); const decoded = JSON.parse(result.body);
      assert.equal(decoded.text, expected); assert.equal(decoded.chunks, parts.length, 'raw-body must receive the intended split');
    }
    for (const [route, headers, body, status] of [
      ['/encoded-raw?charset=unknown-charset', {}, 'abc', 415],
      ['/', { 'content-type': 'text/plain; charset=unknown-charset' }, 'abc', 415],
      ['/limit-raw', { 'content-type': 'application/octet-stream', 'content-encoding': 'gzip' }, Buffer.from('not gzip'), 400],
      ['/verified-json', { 'content-type': 'application/json' }, '{"a":1}', 200],
      ['/verified-json', { 'content-type': 'application/json' }, '{"a":2}', 403],
    ]) {
      const result = await request(parserServer, route, { method: 'POST', headers, body });
      assert.equal(result.status, status, route);
      if (status === 200) assert.deepEqual(JSON.parse(result.body), { a: 1 });
    }
    // JSON bodies parsed by the Functions Framework (body-parser, raw-body, type-is, http-errors).
    const echo = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json; CHARSET=utf-8' }, body: '{"a":1}' });
    assert.equal(echo.status, 200); assert.equal(echo.body, '{"a":1}');
    assert.equal(echo.headers['content-type'], 'application/json; charset=utf-8');
    // A parser-only override of the old body-parser silently loses charset.
    const utf16 = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json; CHARSET="UTF-16LE"' }, body: Buffer.from('{"word":"café"}', 'utf16le') });
    assert.equal(utf16.status, 200); assert.equal(utf16.body, '{"word":"café"}');
    const unsupportedCharset = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json; charset=iso-8859-1' }, body: '{"a":1}' });
    assert.equal(unsupportedCharset.status, 415);
    const malformed = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    // CORS preflight through firebase-functions.
    const preflight = await request(apiServer, '/echo', { method: 'OPTIONS', headers: { origin: 'https://ventimath.com', 'access-control-request-method': 'POST' } });
    assert.equal(preflight.status, 204); assert.equal(preflight.headers['access-control-allow-origin'], 'https://ventimath.com');
    // Content-Type values pass through res.set() (mime-types), including syntax upstream tolerated.
    const pdf = await request(apiServer, '/pdf');
    assert.equal(pdf.headers['content-type'], 'application/pdf; name=report (1).pdf');
    const typed = await request(apiServer, '/typed');
    assert.equal(typed.headers['content-type'], 'application/json; charset=utf-8'); assert.equal(typed.body, '{"ok":true}');
    const parameterized = await request(apiServer, '/parameterized');
    assert.equal(parameterized.status, 200); assert.equal(parameterized.body, 'café');
    assert.equal(parameterized.headers['content-type'], 'text/plain; note="a;b"; charset=utf-8');
    // negotiator uses content-type's comma/start options to walk Accept lists;
    // a comma inside a quoted parameter must not split a media type.
    const acceptsJson = await request(apiServer, '/accept', { headers: { accept: 'text/html;q=0.5, application/json; profile="a,b";q=0.9' } });
    assert.equal(acceptsJson.status, 200); assert.deepEqual(JSON.parse(acceptsJson.body), { type: 'application/json; profile="a,b"' });
    const acceptsHtml = await request(apiServer, '/accept', { headers: { accept: 'application/json; profile="a,b";q=0, text/html;q=0.5' } });
    assert.equal(acceptsHtml.status, 200); assert.deepEqual(JSON.parse(acceptsHtml.body), { type: 'text/html' });
    // The Functions Framework disables ETags on its own app, so conditional
    // requests to plain handlers never reach etag or fresh; Express applications
    // deployed as handlers and files served by send still use them.
    const cached = await request(appServer, '/cached');
    assert.equal(cached.status, 200); assert.match(cached.headers.etag, /^W\/"/);
    const notModified = await request(appServer, '/cached', { headers: { 'if-none-match': cached.headers.etag } });
    assert.equal(notModified.status, 304); assert.equal(notModified.body, '');
    assert.equal((await request(appServer, '/cached', { headers: { 'if-none-match': cached.headers.etag, 'cache-control': 'NO-CACHE' } })).status, 200);
    assert.equal((await request(appServer, '/cached', { headers: { 'if-none-match': '"a,b", ' + cached.headers.etag } })).status, 304);
    // Redirect formatting (encodeurl, escape-html).
    const redirect = await request(apiServer, '/redirect', { headers: { accept: 'text/html' } });
    assert.equal(redirect.status, 302); assert.equal(redirect.headers.location, '/landing?next=%3Ca%20b%3E&x=%25zz');
    assert.equal(redirect.body, '<!DOCTYPE html><head><title>Found</title></head><body><p>Found. Redirecting to /landing?next=%3Ca%20b%3E&amp;x=%25zz</p></body>');
    // sendFile through send (mime-types, etag, fresh, range-parser, ms for maxAge).
    const file = await request(apiServer, '/file');
    assert.equal(file.body, content); assert.equal(file.headers['content-type'], 'text/plain; charset=utf-8');
    assert.equal(file.headers['cache-control'], 'public, max-age=86400');
    // Under the framework's etag:false setting, sendFile responses carry only Last-Modified.
    assert.equal(file.headers.etag, undefined);
    assert.equal((await request(apiServer, '/file', { headers: { 'if-modified-since': file.headers['last-modified'] } })).status, 304);
    const partial = await request(apiServer, '/file', { headers: { range: 'bytes=2-5' } });
    assert.equal(partial.status, 206); assert.equal(partial.body, '2345'); assert.equal(partial.headers['content-range'], 'bytes 2-5/20');
    assert.equal((await request(apiServer, '/file', { headers: { range: 'bytes=-1000' } })).body, content);
    assert.equal((await request(apiServer, '/file', { headers: { range: 'bytes=100-200' } })).status, 416);
    assert.equal((await request(apiServer, '/file', { headers: { range: 'bytes=1junk-4' } })).status, 200);
    assert.equal((await request(apiServer, '/file', { headers: { 'if-match': '*' } })).status, 200);
    assert.equal((await request(apiServer, '/file', { headers: { 'if-none-match': '*' } })).status, 304);
    // firebase-functions answers errors thrown by an onRequest handler itself, with a
    // structured log and a plain 500; finalhandler only sees Express applications.
    for (const route of ['/deny', '/crash']) {
      const failed = await request(apiServer, route);
      assert.equal(failed.status, 500); assert.equal(failed.body, 'Internal Server Error');
    }
    assert.ok(stderr.some(line => line.includes('"severity":"ERROR"') && line.includes('forbidden by policy')));
    assert.ok(stderr.some(line => line.includes('"severity":"ERROR"') && line.includes('unexpected failure')));
    const missing = await request(apiServer, '/missing');
    assert.equal(missing.status, 404); assert.equal(missing.body, '{"error":"not found"}');

    // The Express application: static files via serve-static, body limits, error headers, late errors.
    const page = await request(appServer, '/static/page.html');
    assert.equal(page.status, 200); assert.equal(page.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(page.headers['x-static'], 'yes');
    assert.equal(page.headers['cache-control'], 'public, max-age=7200');
    const data = await request(appServer, '/static/data.txt');
    assert.equal(data.body, content); assert.match(data.headers.etag, /^W\/"/);
    const conditional = await request(appServer, '/static/data.txt', { headers: { 'if-none-match': 'W/"x", ' + data.headers.etag, 'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT' } });
    assert.equal(conditional.status, 304);
    const head = await request(appServer, '/static/data.txt', { method: 'HEAD' });
    assert.equal(head.body, ''); assert.equal(head.headers['content-length'], '20');
    const dir = await request(appServer, '/static/nested%20dir');
    assert.equal(dir.status, 301); assert.equal(dir.headers.location, '/static/nested%20dir/');
    assert.equal((await request(appServer, '/static/nested%20dir/')).body, '<p>index</p>');
    assert.equal((await request(appServer, '/static/missing%a')).status, 400); assert.equal((await request(appServer, '/static/missing.txt')).status, 404);
    // send's actual Express callers inherit options with Object.create(), and
    // rely on its event order to deliver sendFile/download completion callbacks.
    const sentFile = await request(appServer, '/send-file');
    assert.equal(sentFile.body, content); assert.equal(sentFile.headers['x-custom'], 'yes');
    const sentHead = await request(appServer, '/send-file', { method: 'HEAD' });
    assert.equal(sentHead.body, ''); assert.equal(sentHead.headers['content-length'], '20');
    assert.equal((await request(appServer, '/send-file', { headers: { 'if-none-match': sentFile.headers.etag } })).status, 304);
    assert.equal((await request(appServer, '/send-file', { headers: { range: 'bytes=2-5' } })).body, '2345');
    const unsatisfied = await request(appServer, '/send-file', { headers: { range: 'bytes=100-' } });
    assert.equal(unsatisfied.status, 416); assert.equal(unsatisfied.headers['content-range'], 'bytes */20');
    assert.equal((await request(appServer, '/send-empty')).body, '');
    const download = await request(appServer, '/download');
    assert.equal(download.body, content); assert.equal(download.headers['content-disposition'], 'attachment; filename=renamed.txt');
    for (const [id, , expected] of downloadNames) {
      for (const prefix of ['download-', 'attachment-']) {
        const response = await request(appServer, '/' + prefix + id);
        assert.equal(response.status, 200);
        assert.equal(response.body, content);
        assert.equal(response.headers['content-disposition'], expected);
      }
    }
    const unicodeHead = await request(appServer, '/download-unicode', { method: 'HEAD' });
    assert.equal(unicodeHead.status, 200); assert.equal(unicodeHead.body, '');
    assert.equal(unicodeHead.headers['content-disposition'], downloadNames[0][2]);
    const unicodeRange = await request(appServer, '/download-unicode', { headers: { range: 'bytes=2-5' } });
    assert.equal(unicodeRange.status, 206); assert.equal(unicodeRange.body, '2345');
    assert.equal(unicodeRange.headers['content-disposition'], downloadNames[0][2]);
    assert.equal((await request(appServer, '/send-missing')).status, 404);
    assert.equal((await request(appServer, '/static/page')).body, '<p>page</p>');
    assert.equal((await request(appServer, '/static/.secret')).status, 404);
    assert.equal((await request(appServer, '/hidden/.secret')).status, 403);
    assert.equal((await request(appServer, '/strict/nested%20dir')).status, 404);
    assert.equal((await request(appServer, '/strict/absent')).status, 404);
    assert.equal((await request(appServer, '/static/%2e%2e/outside')).status, 404);
    assert.equal((await request(appServer, '/strict/data.txt', { method: 'POST' })).status, 405);
    const queryRedirect = await request(appServer, '/static/nested%20dir?x=1');
    assert.equal(queryRedirect.status, 301); assert.equal(queryRedirect.headers.location, '/static/nested%20dir/?x=1');
    const headRange = await request(appServer, '/send-file', { method: 'HEAD', headers: { range: 'bytes=2-5' } });
    assert.equal(headRange.status, 200); assert.equal(headRange.headers['content-length'], '20');
    assert.equal((await request(appServer, '/send-file', { headers: { 'if-match': sentFile.headers.etag } })).status, 412);
    assert.equal((await request(appServer, '/send-file', { headers: { range: 'bytes=2-5', 'if-range': sentFile.headers.etag } })).status, 200);
    const laterDate = new Date(Date.parse(data.headers['last-modified']) + 86400000).toUTCString();
    assert.equal((await request(appServer, '/static/data.txt', { headers: { range: 'bytes=2-5', 'if-range': laterDate } })).status, 200);
    // Full mount paths and queries survive Express's rewriting of req.url.
    const mount = await request(appServer, '/mounted?x=1');
    assert.equal(mount.status, 301); assert.equal(mount.headers.location, '/mounted/?x=1');
    assert.equal((await request(appServer, '/mounted/?x=1')).body, '<p>page</p>');
    const mountHead = await request(appServer, '/mounted?x=1', { method: 'HEAD' });
    assert.equal(mountHead.status, 301); assert.equal(mountHead.body, '');
    assert.equal(mountHead.headers['content-length'], mount.headers['content-length']);
    for (const method of ['GET', 'HEAD', 'POST']) {
      const generated = await request(appServer, '/static-framing/nested%20dir?x=1', { method });
      assert.equal(generated.status, method === 'POST' ? 405 : 301);
      for (const name of ['transfer-encoding', 'trailer', 'content-encoding', 'content-range']) assert.equal(generated.headers[name], undefined);
      if (method === 'POST') assert.equal(generated.headers.allow, 'GET, HEAD');
      if (method !== 'GET') assert.equal(generated.body, '');
    }
    assert.equal((await request(appServer, '/body', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' })).body, '{"a":1}');
    // The framework's own body-parser runs first, so the application's limit is never consulted.
    assert.equal((await request(appServer, '/body', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(100) }) })).status, 200);
    const error = await request(appServer, '/error');
    assert.equal(error.status, 401); assert.equal(error.headers['www-authenticate'], 'Basic');
    const framing = await request(appServer, '/framing');
    assert.equal(framing.status, 429); assert.equal(framing.headers['retry-after'], '5'); assert.equal(framing.headers['transfer-encoding'], undefined);
    const double = await request(appServer, '/double?token=secret');
    assert.equal(double.status, 404); assert.match(double.body, /Cannot GET \/double/); assert.doesNotMatch(double.body, /secret/);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(stderr.some(line => line.includes('late error')), 'an error after the 404 must still be logged');
    for (const name of ['file', 'empty', 'download', ...downloadNames.map(([id]) => 'download-' + id)]) assert.ok(completed.includes(name), `missing ${name} completion callback`);
    assert.ok(failures.some(error => error.status === 404), 'missing sendFile error callback');

    // Duration strings (ms) through jsonwebtoken, as ventimath signs tokens.
    const token = jwt.sign({ sub: 'student' }, 'secret', { expiresIn: '2 hours' });
    const claims = jwt.verify(token, 'secret');
    assert.equal(claims.exp - claims.iat, 7200);

    // Debug namespaces from the consumers reached vdebug's output.
    for (const namespace of ['express:application', 'router', 'send', 'body-parser:json', 'finalhandler']) {
      assert.ok(stderr.some(line => line.startsWith(namespace)), `no debug output for ${namespace}`);
    }
    for (const [name, count] of Object.entries(calls)) {
      assert.ok(count > 0, `${name} was aliased but never reached`);
    }
  } finally {
    process.stderr.write = writeStderr;
    console.error = consoleError;
    for (const server of [apiServer, appServer, parserServer]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    fs.rmSync(directory, { recursive: true, force: true });
  }
  const runtime = process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version;
  const installed = name => require(path.join(modules, name, 'package.json')).version;
  console.log(`${runtime}: ${checks} HTTP checks passed through functions-framework ${installed('@google-cloud/functions-framework')}, firebase-functions ${installed('firebase-functions')}, express ${installed('express')}.`);
  console.log(`Shared content-type ${[...contentTypes.values()][0]}: ${[...contentTypeCallers].sort().join(', ')}.`);
  console.log('Aliased: ' + [...aliased.keys()].map(label => `${label} ×${calls[label.replace(/@[^@]+$/, '')]}`).join(', '));
  console.log('Not covered by VPM: ' + ([...uncovered].map(([label, via]) => `${label} (via ${[...via].join(', ')})`).join('; ') || 'none'));
}

run().catch(error => { console.error(error); process.exitCode = 1; });
