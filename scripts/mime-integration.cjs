'use strict';
// Run against an existing Express 5 installation. Aliases affect this process
// only; application manifests and installed files are unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { createRequire } = require('node:module');
const mime = require('../packages/vmime-types');
if (!process.argv[2]) throw Error('Usage: node scripts/mime-integration.cjs /path/to/express-5/node_modules');
const modules = path.resolve(process.argv[2]);
const manifest = require.resolve(path.join(modules, 'express/package.json'));
assert.match(require(manifest).version, /^5\./, 'This check targets the mime-types 3.x stack in Express 5');
const counts = Object.fromEntries(['charset', 'contentType', 'extension', 'lookup'].map(key => [key, 0]));
const replacement = { ...mime };
for (const method of Object.keys(counts)) replacement[method] = (...args) => { counts[method]++; return mime[method](...args); };
replacement.charsets = { lookup: replacement.charset };
const queue = [manifest]; const visited = new Set(); let aliases = 0;
while (queue.length) {
  const file = queue.pop(); if (visited.has(file)) continue; visited.add(file);
  const from = createRequire(file); const data = require(file);
  if (data.name === 'mime-types') {
    assert.equal(data.version, '3.0.2');
    const entry = from.resolve('mime-types'); require(entry);
    require.cache[entry].exports = replacement; aliases++;
  }
  for (const dependency of Object.keys(data.dependencies || {})) {
    try { queue.push(from.resolve(dependency + '/package.json')); } catch {}
  }
}
assert.ok(aliases > 0);
const express = require(path.join(modules, 'express'));
const fromExpress = createRequire(manifest);
const typeIs = fromExpress('type-is');
const accepts = fromExpress('accepts');
assert.equal(typeIs.is('application/json; charset=utf-8', ['json']), 'json');
assert.equal(typeIs.is('image/svg+xml', ['+xml']), 'image/svg+xml');
assert.equal(accepts({ headers: { accept: 'application/json' } }).type(['html', 'json']), 'json');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-mime-integration-'));
const files = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', wasm: 'application/wasm',
  mp4: 'video/mp4', unknownvpm: 'application/octet-stream' };
for (const extension of Object.keys(files)) fs.writeFileSync(path.join(directory, 'file.' + extension), '0123456789');
const app = express(); app.set('env', 'production');
app.use('/static', express.static(directory));
app.get('/typed', (_req, res) => res.type('json').send('{"ok":true}'));
app.get('/download', (_req, res) => res.download(path.join(directory, 'file.json')));
app.get('/format', (req, res) => res.format({ html: () => res.send('<p>ok</p>'), json: () => res.send({ ok: true }) }));
app.post('/body', express.json(), (req, res) => res.json(req.body));
const server = http.createServer(app); let requests = 0;
function request(route, headers = {}, method = 'GET', body) {
  requests++;
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: route, headers, method, agent: false }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    }); req.on('error', reject); req.end(body);
  });
}
(async () => {
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    for (const [extension, expected] of Object.entries(files)) {
      for (const method of ['GET', 'HEAD']) {
        const response = await request('/static/file.' + extension, {}, method);
        assert.equal(response.status, 200); assert.equal(response.headers['content-type'], expected, extension);
        assert.equal(response.body, method === 'HEAD' ? '' : '0123456789');
      }
    }
    const partial = await request('/static/file.json', { range: 'bytes=2-4' });
    assert.equal(partial.status, 206); assert.equal(partial.body, '234');
    assert.equal(partial.headers['content-type'], files.json);
    const download = await request('/download'); assert.equal(download.headers['content-type'], files.json);
    assert.match(download.headers['content-disposition'], /attachment; filename="file.json"/);
    const typed = await request('/typed'); assert.equal(typed.headers['content-type'], files.json);
    assert.equal(typed.body, '{"ok":true}');
    const format = await request('/format', { accept: 'application/json' });
    assert.equal(format.headers['content-type'], files.json); assert.equal(format.body, '{"ok":true}');
    const body = await request('/body', { 'content-type': 'application/json; CHARSET=utf-8' }, 'POST', '{"ok":true}');
    assert.equal(body.status, 200); assert.equal(body.body, '{"ok":true}');
    assert.ok(counts.contentType > 0); assert.ok(counts.lookup > 0);
    console.log(`Express ${require(manifest).version}: ${requests} HTTP checks; ${aliases} MIME aliases; calls ${JSON.stringify(counts)}`);
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
