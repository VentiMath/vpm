'use strict';
// A complete HTTP request/response comparison against the locked stock tree.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const { performance } = require('node:perf_hooks');
const { gzipSync } = require('node:zlib');
const root = path.resolve(__dirname, '../../..');
const from = createRequire(path.join(root, 'scripts/consumers/package.json'));
const upstream = from('body-parser');
assert.equal(from('body-parser/package.json').version, '2.4.0');
const vpm = require('..');
const json = size => JSON.stringify({ title: 'café', data: 'x'.repeat(size) });
const small = json(1024), large = json(65536);
const cases = [
  ['JSON / 1 KiB', 'json', {}, small, 'application/json'],
  ['JSON / 64 KiB', 'json', {}, large, 'application/json'],
  ['JSON / verify', 'json', { verify(_req, _res, bytes) { assert.equal(bytes[0], 123); } }, small, 'application/json'],
  ['JSON / gzip 64 KiB', 'json', {}, gzipSync(large), 'application/json', 'gzip'],
  ['form / flat', 'urlencoded', {}, 'name=Ada&city=London&tags=math&tags=code', 'application/x-www-form-urlencoded'],
  ['form / nested', 'urlencoded', { extended: true }, 'user[name]=Ada&user[address][city]=London&tags[]=math&tags[]=code', 'application/x-www-form-urlencoded'],
  ['text / UTF-8 13 KiB', 'text', {}, 'café 日本 '.repeat(1024), 'text/plain'],
  ['raw / 64 KiB', 'raw', {}, Buffer.alloc(65536, 120), 'application/octet-stream'],
  ['JSON / malformed', 'json', {}, '{"broken":}', 'application/json'],
];
const rounds = 9, count = 1000, warmup = 1000;
let sink = 0;
async function endpoint(middleware) {
  const server = http.createServer((req, res) => middleware(req, res, error => {
    res.statusCode = error?.status || 200;
    // Consume the whole result but send a fixed-size summary, avoiding a large echo.
    res.end(JSON.stringify(error ? { type: error.type } : {
      length: Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length,
      first: Buffer.isBuffer(req.body) ? req.body[0] : null,
    }));
  }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, agent: new http.Agent({ keepAlive: true, maxSockets: 1 }) };
}
function request(endpoint, body, type, encoding) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: endpoint.server.address().port, method: 'POST', agent: endpoint.agent,
      headers: { 'content-type': type, 'content-length': Buffer.byteLength(body), ...(encoding ? { 'content-encoding': encoding } : {}) } }, res => {
      let result = '';
      res.setEncoding('utf8'); res.on('data', chunk => { result += chunk; });
      res.on('error', reject); res.on('end', () => resolve([res.statusCode, result]));
    });
    req.setTimeout(5000, () => req.destroy(new Error('benchmark request timed out')));
    req.on('error', reject); req.end(body);
  });
}
async function sample(endpoint, body, type, encoding, count, expected) {
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    const result = await request(endpoint, body, type, encoding);
    assert.deepEqual(result, expected); sink += result[1].length;
  }
  return (performance.now() - start) * 1000 / count;
}
async function main() {
  const results = [];
  for (const [name, method, options, body, type, encoding] of cases) {
    const endpoints = [];
    try {
      for (const implementation of [upstream, vpm]) endpoints.push(await endpoint(implementation[method](options)));
      const expected = await request(endpoints[0], body, type, encoding);
      assert.deepEqual(await request(endpoints[1], body, type, encoding), expected, name);
      for (const target of endpoints) await sample(target, body, type, encoding, warmup, expected);
      const samples = [[], []];
      for (let round = 0; round < rounds; round++) {
        for (const index of round % 2 ? [1, 0] : [0, 1]) {
          samples[index].push(await sample(endpoints[index], body, type, encoding, count, expected));
        }
      }
      const medians = samples.map(values => [...values].sort((a, b) => a - b)[Math.floor(rounds / 2)]);
      const result = { name, upstreamUs: +medians[0].toFixed(2), vpmUs: +medians[1].toFixed(2),
        changePercent: +(100 * (medians[1] / medians[0] - 1)).toFixed(1), samplesUs: samples };
      results.push(result);
      console.error(`${name}: ${result.upstreamUs} → ${result.vpmUs} µs (${result.changePercent}%)`);
    } finally {
      for (const { server, agent } of endpoints) {
        agent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
      }
    }
  }
  assert.ok(sink > 0);
  const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const source = Object.fromEntries(['index.js', 'lib/read.js', 'lib/utils.js', ...['json', 'raw', 'text', 'urlencoded'].map(name => `lib/types/${name}.js`)]
    .map(file => [file, sha256(path.join(__dirname, '..', file))]));
  console.log(JSON.stringify({ date: new Date().toISOString(), runtime: process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version,
    upstream: 'body-parser 2.4.0 and its complete stock dependency tree in scripts/consumers',
    consumerLockSha256: sha256(path.join(root, 'scripts/consumers/package-lock.json')), sourceSha256: source,
    methodology: `Local HTTP, one keep-alive connection per implementation. Median of ${rounds} alternating samples of ${count} sequential requests; ${warmup} warmup requests per implementation per case. Parsed results consumed and response parity checked on every request. Includes HTTP, parsing, small response serialization and assertion overhead; not isolated parser speed or application throughput.`, results }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
