'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { performance } = require('node:perf_hooks');
const { upstream, bridged, keys } = require('./helpers.cjs');
const implementation = require('..');
const calibration = process.env.CALIBRATION === '1';
const variants = { upstream, bridged: calibration ? upstream : bridged, vpm: calibration ? upstream : implementation };
const rounds = 12;
const orders = [['upstream', 'bridged', 'vpm'], ['upstream', 'vpm', 'bridged'],
  ['bridged', 'upstream', 'vpm'], ['bridged', 'vpm', 'upstream'],
  ['vpm', 'upstream', 'bridged'], ['vpm', 'bridged', 'upstream']];
const cases = [], retain = new Array(64);
let checksum = 0;
const payload = { sub: 'student', aud: 'ventimath', iss: 'benchmark', iat: 100 };
const verifyOptions = { clockTimestamp: 150, audience: 'ventimath', issuer: 'benchmark' };
function add(name, make, validate, async = false) {
  cases.push({ name, functions: Object.fromEntries(Object.entries(variants).map(([name, fn]) => [name, make(fn)])), validate, async });
}
for (const algorithm of ['HS256', 'RS256', 'PS256', 'ES256']) {
  const pair = keys[algorithm === 'ES256' ? algorithm : 'RSA'];
  const privateKey = algorithm === 'HS256' ? 'benchmark-secret' : pair.privateKey;
  const publicKey = algorithm === 'HS256' ? privateKey : pair.publicKey;
  const options = { algorithm };
  const token = upstream.sign(payload, privateKey, options);
  add(algorithm + ' sign', fn => () => fn.sign(payload, privateKey, options), result => assert.deepEqual(upstream.verify(result, publicKey, verifyOptions), payload));
  add(algorithm + ' verify', fn => () => fn.verify(token, publicKey, verifyOptions), result => assert.deepEqual(result, payload));
  if (algorithm !== 'HS256') {
    add(algorithm + ' verify warm PEM', fn => () => fn.verify(token, pair.publicPem, verifyOptions), result => assert.deepEqual(result, payload));
    const buffer = Buffer.from(pair.publicPem);
    add(algorithm + ' verify uncached PEM Buffer', fn => () => fn.verify(token, buffer, verifyOptions), result => assert.deepEqual(result, payload));
  }
}
const token = upstream.sign(payload, 'key');
add('HS256 sign with claims', fn => () => fn.sign({ iat: 100 }, 'key', { expiresIn: '2h', notBefore: '1s', audience: 'ventimath', issuer: 'benchmark', subject: 'student', jwtid: 'id' }),
  result => assert.deepEqual(upstream.verify(result, 'key', verifyOptions), { iat: 100, exp: 7300, nbf: 101, aud: 'ventimath', iss: 'benchmark', sub: 'student', jti: 'id' }));
const secretKey = crypto.createSecretKey(Buffer.from('key'));
add('HS256 verify KeyObject', fn => () => fn.verify(token, secretKey, verifyOptions), result => assert.deepEqual(result, payload));
add('decode complete', fn => () => fn.decode(token, { complete: true }), result => assert.deepEqual(result.payload, payload));
const large = { ...payload, text: 'a'.repeat(65536) };
const largeToken = upstream.sign(large, 'key');
add('HS256 sign 64 KiB', fn => () => fn.sign(large, 'key'), result => assert.equal(result, largeToken));
add('HS256 verify 64 KiB', fn => () => fn.verify(largeToken, 'key', verifyOptions), result => assert.deepEqual(result, large));
const varying = Array.from({ length: 257 }, (_, n) => upstream.sign(payload, 'key', { keyid: String(n) }));
add('HS256 verify varying header', fn => { let n = 0; return () => fn.verify(varying[n++ % varying.length], 'key', verifyOptions); }, result => assert.deepEqual(result, payload));
const expired = upstream.sign({ iat: 100, exp: 120 }, 'key');
const bad = token.slice(0, -2) + (token.at(-2) === 'A' ? 'B' : 'A') + token.at(-1);
for (const [label, input, name] of [['expired', expired, 'TokenExpiredError'], ['bad signature', bad, 'JsonWebTokenError']]) {
  add('reject ' + label, fn => () => { try { fn.verify(input, 'key', verifyOptions); return 'accepted'; } catch (error) { return error.name; } }, result => assert.equal(result, name));
}
add('HS256 callback sign', fn => () => new Promise((resolve, reject) => fn.sign(payload, 'key', (error, value) => error ? reject(error) : resolve(value))), result => assert.equal(result, token), true);
add('HS256 callback verify', fn => () => new Promise((resolve, reject) => fn.verify(token, 'key', verifyOptions, (error, value) => error ? reject(error) : resolve(value))), result => assert.deepEqual(result, payload), true);
add('HS256 resolver verify', fn => () => new Promise((resolve, reject) => fn.verify(token, (_header, done) => done(null, 'key'), verifyOptions, (error, value) => error ? reject(error) : resolve(value))), result => assert.deepEqual(result, payload), true);
function consume() {
  for (const result of retain) checksum = (checksum + (typeof result === 'string' ? result.length : result ? 1 : 0)) >>> 0;
}
function measure(fn, count) {
  const start = performance.now();
  for (let n = 0; n < count; n++) retain[n & 63] = fn();
  const ns = (performance.now() - start) * 1e6 / count; consume(); return ns;
}
async function measureAsync(fn, count) {
  const start = performance.now();
  for (let n = 0; n < count; n++) retain[n & 63] = await fn();
  const ns = (performance.now() - start) * 1e6 / count; consume(); return ns;
}
const median = xs => { const a = xs.slice().sort((a, b) => a - b); return (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2; };
(async () => {
  const rows = [];
  for (const item of cases) {
    const time = item.async ? measureAsync : measure;
    for (const fn of Object.values(item.functions)) { item.validate(await fn()); await time(fn, item.async ? 2 : 128); }
    const pilot = await time(item.functions.upstream, item.async ? 2 : 64);
    const iterations = Math.max(item.async ? 1 : 16, Math.min(100000, Math.ceil(10e6 / pilot)));
    const samples = { upstream: [], bridged: [], vpm: [] };
    for (let warmup = 0; warmup < 5; warmup++) for (const variant of orders[warmup]) await time(item.functions[variant], iterations);
    for (let round = 0; round < rounds; round++) for (const variant of orders[round % orders.length]) {
      samples[variant].push(await time(item.functions[variant], iterations));
    }
    rows.push({ case: item.name, iterations, samples });
  }
  const root = path.resolve(__dirname, '..');
  const upstreamFiles = new Set(), visited = new Set();
  function recordPackage(manifest) {
    if (visited.has(manifest)) return;
    visited.add(manifest);
    const directory = path.dirname(manifest), metadata = JSON.parse(fs.readFileSync(manifest));
    for (const file of fs.readdirSync(directory, { recursive: true })) {
      if (file.startsWith('node_modules/') || !/\.(?:js|json)$/.test(file)) continue;
      upstreamFiles.add(path.relative(root, path.join(directory, file)));
    }
    const from = createRequire(manifest);
    for (const dependency of Object.keys(metadata.dependencies || {})) recordPackage(from.resolve(dependency + '/package.json'));
  }
  recordPackage(path.resolve(root, '../../scripts/consumers/node_modules/jsonwebtoken/package.json'));
  const files = ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', 'bench/helpers.cjs',
    ...fs.readdirSync(path.join(root, 'lib')).map(file => 'lib/' + file),
    '../vjws/index.js', '../vjws/lib/core.js', '../vjws/lib/streams.js', '../vjws/PROVENANCE.json',
    '../vms/index.js', '../vjwa/index.js', '../vjwa/PROVENANCE.json', '../vjwa/test/fixtures/keys.json',
    ...[...upstreamFiles].sort(),
    '../../scripts/consumers/package-lock.json'];
  const report = { recordedAt: new Date().toISOString(), runtime: process.versions, platform: process.platform, arch: process.arch,
    cpu: os.cpus()[0].model, calibration, rounds, checksum,
    methodology: 'Three variants: jsonwebtoken 9.0.3 with pinned upstream dependencies; the same jsonwebtoken with vjws/vms (bridged); vjsonwebtoken. Twelve rounds use all six orders twice. Pilot targets 10 ms blocks, sync 16–100000 calls and async 1–100000. Warmup: 128 sync/2 async calls plus five full blocks per variant, cycling order. Validate each result before timing; retain and consume outputs. KeyObject import excluded, PEM import included; public string cache warm, mutable PEM Buffer uncached. Fixed iat and verification clock. Callbacks include Promise scheduling. Three fresh processes and one identical-upstream calibration per runtime; no trimming. Nanoseconds per operation.',
    hashes: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])), rows };
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
  console.table(rows.map(row => ({ case: row.case, upstream: Math.round(median(row.samples.upstream)), bridged: Math.round(median(row.samples.bridged)), vpm: Math.round(median(row.samples.vpm)),
    change: (100 * (median(row.samples.vpm.map((v, i) => v / row.samples.upstream[i])) - 1)).toFixed(1) + '%' })));
})().catch(error => { console.error(error); process.exitCode = 1; });
