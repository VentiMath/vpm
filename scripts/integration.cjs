'use strict';
// The integration gate. Aliases every VPM package into ventimath's pinned HTTP
// consumers (scripts/consumers) inside this process only, then drives those
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

// Walk every dependency edge from the fixture roots and alias matching copies.
const aliased = new Map();
const uncovered = new Map();
const seen = new Set();
const queue = Object.keys(fixture.dependencies).map(name => require.resolve(path.join(modules, name, 'package.json')));
while (queue.length) {
  const manifest = queue.pop();
  if (seen.has(manifest)) continue;
  seen.add(manifest);
  const data = require(manifest);
  const from = createRequire(manifest);
  for (const name of Object.keys(Object.assign({}, data.dependencies, data.optionalDependencies))) {
    let child;
    try { child = from.resolve(name + '/package.json'); } catch { continue; }
    queue.push(child);
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
  if (request.path === '/pdf') {
    response.set('Content-Type', 'application/pdf; name=report (1).pdf');
    return response.send(Buffer.from('%PDF-1.4'));
  }
  if (request.path === '/typed') return response.type('json').send('{"ok":true}');
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
app.get('/error', (_req, _res, next) => next(createError(401, 'private', { headers: { 'WWW-Authenticate': 'Basic' } })));
app.get('/double', (_req, _res, next) => { next(); setImmediate(() => next(new Error('late error'))); });
app.get('/framing', (_req, res, next) => { res.setHeader('Transfer-Encoding', 'chunked'); next(createError(429, 'slow down', { headers: { 'Retry-After': '5' } })); });
functions.http('app', onRequest(app));


async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server;
}

function request(server, route, { headers = {}, method = 'GET', body } = {}) {
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
    req.end(body);
  });
}

async function run() {
  const apiServer = await listen(getTestServer('api'));
  const appServer = await listen(getTestServer('app'));
  try {
    // JSON bodies parsed by the Functions Framework (body-parser, raw-body, type-is, http-errors).
    const echo = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json; CHARSET=utf-8' }, body: '{"a":1}' });
    assert.equal(echo.status, 200); assert.equal(echo.body, '{"a":1}');
    assert.equal(echo.headers['content-type'], 'application/json; charset=utf-8');
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
    assert.equal(redirect.body, "<p>Found. Redirecting to /landing?next=%3Ca%20b%3E&amp;x=%25zz</p>");
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
    assert.equal(download.body, content); assert.match(download.headers['content-disposition'], /renamed.txt/);
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
    for (const name of ['file', 'empty', 'download']) assert.ok(completed.includes(name), `missing ${name} completion callback`);
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
    for (const server of [apiServer, appServer]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    fs.rmSync(directory, { recursive: true, force: true });
  }
  const runtime = process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version;
  const installed = name => require(path.join(modules, name, 'package.json')).version;
  console.log(`${runtime}: ${checks} HTTP checks passed through functions-framework ${installed('@google-cloud/functions-framework')}, firebase-functions ${installed('firebase-functions')}, express ${installed('express')}.`);
  console.log('Aliased: ' + [...aliased.keys()].map(label => `${label} ×${calls[label.replace(/@[^@]+$/, '')]}`).join(', '));
  console.log('Not covered by VPM: ' + ([...uncovered].map(([label, via]) => `${label} (via ${[...via].join(', ')})`).join('; ') || 'none'));
}

run().catch(error => { console.error(error); process.exitCode = 1; });
