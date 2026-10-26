'use strict';
// Optional integration check against an existing Express installation. Aliases
// affect this process only; no installed files or dependency manifests change.
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');

if (!process.argv[2]) throw new Error('Usage: node express-integration.cjs /path/to/node_modules');
const modules = path.resolve(process.argv[2]);
const entry = require.resolve(path.join(modules, 'express'));
const oldHandler = require.resolve('finalhandler', { paths: [path.dirname(entry)] });
const replacement = require('..');
let calls = 0;
require(oldHandler);
require.cache[oldHandler].exports = (...args) => {
  const done = replacement(...args);
  return error => { calls++; return done(error); };
};
const express = require(entry);
const app = express(); app.set('env', 'production');
app.get('/ok', (_req, res) => res.send('ok'));
app.get('/error', (_req, _res, next) => next(new Error('private secret')));
app.get('/status', (_req, res, next) => { res.statusCode = 422; next(new Error('invalid')); });
app.get('/headers', (_req, res, next) => {
  res.setHeader('Transfer-Encoding', 'chunked');
  next(Object.assign(new Error('limit'), { status: 429, headers: { 'Retry-After': '5' } }));
});
app.use('/mounted', express.Router());
const server = http.createServer(app);
function request(route, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: route, method, agent: false }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    }); req.on('error', reject); req.end(body);
  });
}

(async () => {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const logs = [];
  const originalError = console.error;
  console.error = value => logs.push(value);
  try {
    assert.equal((await request('/ok')).body, 'ok'); assert.equal(calls, 0);
    const missing = await request('/missing?secret=1');
    assert.equal(missing.status, 404); assert.match(missing.body, /Cannot GET \/missing/);
    assert.doesNotMatch(missing.body, /secret/);
    const error = await request('/error'); assert.equal(error.status, 500); assert.doesNotMatch(error.body, /private secret/);
    assert.equal((await request('/status')).status, 422);
    const headers = await request('/headers'); assert.equal(headers.status, 429);
    assert.equal(headers.headers['retry-after'], '5'); assert.equal(headers.headers['transfer-encoding'], undefined);
    assert.match((await request('/mounted/absent')).body, /Cannot GET \/mounted\/absent/);
    const head = await request('/missing', 'HEAD'); assert.equal(head.status, 404); assert.equal(head.body, '');
    const posted = await request('/unread', 'POST', 'x'.repeat(65536)); assert.equal(posted.status, 404);
    assert.match((await request('/missing/%a')).body, /\/missing\/%25a/);
    assert.equal(calls, 8);
    assert.equal(logs.length, 3);
    console.log(`Express ${require(path.join(modules, 'express/package.json')).version}: 9 HTTP checks, ${calls} vfinalhandler calls, ${logs.length} error logs`);
  } finally {
    console.error = originalError;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
