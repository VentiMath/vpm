'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const [variant, mode, sourceType = 'cjs'] = process.argv.slice(2);
const root = path.resolve(__dirname, '../../..');
const base = variant === 'upstream'
  ? path.join(root, 'scripts/consumers/node_modules/@google-cloud/functions-framework/build/src')
  : path.resolve(__dirname, '../lib');
let tmp;
if (mode === 'startup') {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vframework-bench-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: sourceType === 'esm' ? 'module' : 'commonjs', main: 'index.js' }));
  fs.writeFileSync(path.join(tmp, 'index.js'), sourceType === 'esm'
    ? 'export function hello(req,res) { res.end("ready"); }'
    : 'exports.hello = (req,res) => res.end("ready");');
}
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
async function call(server, entry) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: entry.path || '/',
      method: entry.body ? 'POST' : 'GET', agent,
      headers: { ...(entry.body ? { 'content-length': Buffer.byteLength(entry.body) } : {}), ...entry.headers } }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; });
      res.on('end', () => { try { assert.equal(res.statusCode, entry.status || 200); assert.equal(body, entry.expected); resolve(); } catch (error) { reject(error); } });
      res.on('error', reject);
    });
    req.on('error', reject); req.end(entry.body);
  });
}
const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const close = server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
async function run() {
  const start = performance.now();
  const { parseOptions } = require(path.join(base, 'options'));
  const { getUserFunction } = require(path.join(base, 'loader'));
  const { getServer } = require(path.join(base, 'server'));
  const options = parseOptions(['node', 'framework'], {});
  if (mode === 'startup') {
    const loaded = await getUserFunction(tmp, 'hello', 'http'); assert.ok(loaded);
    const server = getServer(loaded.userFunction, options);
    await listen(server); const listeningMs = performance.now() - start;
    await call(server, { expected: 'ready' }); const firstResponseMs = performance.now() - start;
    await close(server); return { listeningMs, firstResponseMs };
  }
  const cases = [
    { name: 'http-get', handler: (req, res) => res.send('hello'), expected: 'hello' },
    { name: 'http-deep-path', path: '/users/alice/files/a/b/c?sort=name&limit=20', handler: (req, res) => res.send('hello'), expected: 'hello' },
    { name: 'http-json', headers: { 'content-type': 'application/json' }, body: '{"name":"alice","count":42}',
      handler: (req, res) => res.json(req.body), expected: '{"name":"alice","count":42}' },
    { name: 'http-form', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'name=alice&tags[]=a&tags[]=b',
      handler: (req, res) => res.json(req.body), expected: '{"name":"alice","tags":["a","b"]}' },
  ];
  // The published upstream event path fails on Bun (process.domain is null).
  // Compare working event handling on Node, never time those failures as work.
  if (!process.versions.bun) cases.push({ name: 'cloud-event', signatureType: 'cloudevent',
    body: '{"specversion":"1.0","id":"1","type":"example","source":"/test","data":{"name":"alice"}}',
    headers: { 'content-type': 'application/cloudevents+json' }, handler: event => event.data,
    expected: '{"name":"alice"}' });
  const results = {};
  for (const entry of cases) {
    const server = getServer(entry.handler, { ...options, signatureType: entry.signatureType || 'http' });
    await listen(server);
    try {
      for (let i = 0; i < 200; i++) await call(server, entry);
      const began = performance.now();
      for (let i = 0; i < 1000; i++) await call(server, entry);
      results[entry.name] = (performance.now() - began) * 1000 / 1000;
    } finally { await close(server); }
  }
  return results;
}
run().then(result => { console.log(JSON.stringify(result)); }, error => { console.error(error); process.exitCode = 1; }).finally(() => {
  agent.destroy(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});
