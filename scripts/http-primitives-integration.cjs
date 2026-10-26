'use strict';
// Process-local aliases against an existing Express installation. No application
// files or dependency manifests are changed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { createRequire } = require('node:module');
if (!process.argv[2]) throw new Error('Usage: node scripts/http-primitives-integration.cjs /path/to/node_modules');
const modules = path.resolve(process.argv[2]);
const replacements = {
  'http-errors': require('../packages/vhttp-errors'), etag: require('../packages/vetag'),
  fresh: require('../packages/vfresh'), 'range-parser': require('../packages/vrange-parser'),
  finalhandler: require('../packages/vfinalhandler'),
};
const counts = Object.fromEntries(Object.keys(replacements).map(name => [name, 0]));
const queue = [require.resolve(path.join(modules, 'express/package.json'))];
const visited = new Set();
while (queue.length) {
  const manifest = queue.pop();
  if (visited.has(manifest)) continue;
  visited.add(manifest);
  const data = require(manifest); const from = createRequire(manifest);
  for (const name of Object.keys(data.dependencies || {})) {
    if (Object.hasOwn(replacements, name)) {
      const entry = from.resolve(name);
      if (require.cache[entry]?.vpmAlias) continue;
      require(entry);
      const wrapped = (...args) => { counts[name]++; return replacements[name](...args); };
      Object.assign(wrapped, replacements[name]);
      require.cache[entry].exports = wrapped; require.cache[entry].vpmAlias = true;
    }
    try { queue.push(from.resolve(name + '/package.json')); } catch {}
  }
}
const express = require(path.join(modules, 'express'));
const fromExpress = createRequire(require.resolve(path.join(modules, 'express')));
const createError = fromExpress('http-errors');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-http-integration-'));
const content = '0123456789abcdefghij'; fs.writeFileSync(path.join(directory, 'data.txt'), content);
const app = express(); app.set('env', 'production');
app.get('/etag', (_req, res) => res.send('ordinary response'));
app.get('/quoted', (_req, res) => res.set('ETag', '"a,b"').send('quoted tag'));
app.get('/bad', (_req, _res, next) => next(createError(401, 'private', { headers: { 'WWW-Authenticate': 'Basic' } })));
app.post('/body', express.json({ limit: '32b' }), (req, res) => res.json(req.body));
app.use('/static', express.static(directory));
const server = http.createServer(app);
let requests = 0;
function request(route, headers = {}, method = 'GET', body) {
  requests++;
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: route, headers, method, agent: false }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    }); req.on('error', reject); req.end(body);
  });
}
(async () => {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const logs = []; const originalError = console.error; console.error = value => logs.push(value);
  try {
    const entity = await request('/etag'); assert.equal(entity.status, 200); assert.ok(entity.headers.etag);
    assert.equal((await request('/etag', { 'if-none-match': entity.headers.etag })).status, 304);
    assert.equal((await request('/etag', { 'if-none-match': entity.headers.etag, 'cache-control': 'NO-CACHE' })).status, 200);
    assert.equal((await request('/quoted', { 'if-none-match': 'W/"a,b"' })).status, 304);
    assert.equal((await request('/quoted', { 'if-none-match': '"a,b",invalid' })).status, 200);
    const bad = await request('/bad'); assert.equal(bad.status, 401); assert.equal(bad.headers['www-authenticate'], 'Basic');
    assert.doesNotMatch(bad.body, /private/);
    assert.equal((await request('/body', { 'content-type': 'application/json' }, 'POST', '{')).status, 400);
    assert.equal((await request('/body', { 'content-type': 'application/json' }, 'POST', JSON.stringify({ text: 'x'.repeat(64) }))).status, 413);
    assert.equal((await request('/body', { 'content-type': 'application/json' }, 'POST', '{"a":1}')).body, '{"a":1}');
    const file = await request('/static/data.txt'); assert.equal(file.body, content);
    const conditional = await request('/static/data.txt', { 'if-none-match': file.headers.etag, 'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT' });
    assert.equal(conditional.status, 304); assert.equal(conditional.body, '');
    const partial = await request('/static/data.txt', { range: 'bytes=2-5' });
    assert.equal(partial.status, 206); assert.equal(partial.body, '2345'); assert.equal(partial.headers['content-range'], 'bytes 2-5/20');
    const suffix = await request('/static/data.txt', { range: 'bytes=-1000' }); assert.equal(suffix.status, 206); assert.equal(suffix.body, content);
    const malformed = await request('/static/data.txt', { range: 'bytes=1junk-4' }); assert.equal(malformed.status, 200); assert.equal(malformed.body, content);
    assert.equal((await request('/static/data.txt', { range: 'bytes=100-200' })).status, 416);
    const head = await request('/static/data.txt', {}, 'HEAD'); assert.equal(head.body, ''); assert.equal(head.headers['content-length'], '20');
    for (const [name, calls] of Object.entries(counts)) assert.ok(calls > 0, name + ' was not exercised');
    console.log(`Express ${require(path.join(modules, 'express/package.json')).version}: ${requests} HTTP checks; calls ${JSON.stringify(counts)}`);
  } finally {
    console.error = originalError;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
