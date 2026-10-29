'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { performance } = require('node:perf_hooks');
const { upstream, bridged, keys } = require('../test/helpers.cjs');
const implementation = require('..');
const calibration = process.env.CALIBRATION === '1';
const variants = { upstream, bridged: calibration ? upstream : bridged, vpm: calibration ? upstream : implementation };
const rounds = 12;
const orders = [['upstream', 'bridged', 'vpm'], ['upstream', 'vpm', 'bridged'],
  ['bridged', 'upstream', 'vpm'], ['bridged', 'vpm', 'upstream'],
  ['vpm', 'upstream', 'bridged'], ['vpm', 'bridged', 'upstream']];
const cases = [], retain = new Array(64);
let checksum = 0;
const payload = { sub: 'student', aud: 'ventimath', iat: 1700000000 };
function add(name, make, validate, async = false) {
  cases.push({ name, functions: Object.fromEntries(Object.entries(variants).map(([name, fn]) => [name, make(fn)])), validate, async });
}
for (const algorithm of ['HS256', 'RS256', 'PS256', 'ES256']) {
  const pair = keys[algorithm === 'ES256' ? algorithm : 'RSA'];
  const privateKey = algorithm === 'HS256' ? 'benchmark-secret' : pair.privateKey;
  const publicKey = algorithm === 'HS256' ? privateKey : pair.publicKey;
  const options = { header: { alg: algorithm, typ: 'JWT', kid: 'benchmark' }, payload, privateKey };
  const token = upstream.sign(options);
  add(algorithm + ' sign', fn => () => fn.sign(options), result => assert.equal(upstream.verify(result, algorithm, publicKey), true));
  add(algorithm + ' verify', fn => () => fn.verify(token, algorithm, publicKey), result => assert.equal(result, true));
  if (algorithm !== 'HS256') {
    add(algorithm + ' verify warm PEM', fn => () => fn.verify(token, algorithm, pair.publicPem), result => assert.equal(result, true));
    const buffer = Buffer.from(pair.publicPem);
    add(algorithm + ' verify uncached PEM Buffer', fn => () => fn.verify(token, algorithm, buffer), result => assert.equal(result, true));
  }
}
const token = upstream.sign({ header: { alg: 'HS256', typ: 'JWT' }, payload, secret: 'key' });
add('decode JWT', fn => () => fn.decode(token), result => assert.deepEqual(result.payload, payload));
add('isValid JWT', fn => () => fn.isValid(token), result => assert.equal(result, true));
const large = 'a'.repeat(65536);
const largeOptions = { header: { alg: 'HS256' }, payload: large, secret: 'key' };
const largeToken = upstream.sign(largeOptions);
add('HS256 sign 64 KiB', fn => () => fn.sign(largeOptions), result => assert.equal(result, largeToken));
add('HS256 verify 64 KiB', fn => () => fn.verify(largeToken, 'HS256', 'key'), result => assert.equal(result, true));
add('decode 64 KiB', fn => () => fn.decode(largeToken), result => assert.equal(result.payload, large));
const changingOptions = { header: { alg: 'HS256', kid: '' }, payload, secret: 'key' };
add('HS256 sign varying header', fn => { let n = 0; const options = { ...changingOptions, header: { ...changingOptions.header } };
  return () => { options.header.kid = String(n++); return fn.sign(options); };
}, result => assert.equal(upstream.verify(result, 'HS256', 'key'), true));
const varying = Array.from({ length: 257 }, (_, n) => upstream.sign({ ...changingOptions, header: { alg: 'HS256', kid: String(n) } }));
add('HS256 verify varying header', fn => { let n = 0; return () => fn.verify(varying[n++ % varying.length], 'HS256', 'key'); }, result => assert.equal(result, true));
function streamed(fn, chunks) {
  return new Promise((resolve, reject) => {
    const operation = fn.createSign({ header: { alg: 'HS256' }, payload: Readable.from(chunks), secret: 'key' });
    operation.once('error', reject);
    operation.once('done', resolve);
    operation.on('data', () => {});
  });
}
for (const [label, chunks] of [['one chunk', [Buffer.from('short payload')]],
  ['256 KiB / 16 chunks', Array.from({ length: 16 }, () => Buffer.alloc(16384, 97))],
  ['256 KiB / 1024 chunks', Array.from({ length: 1024 }, () => Buffer.alloc(256, 97))]]) {
  const expected = upstream.sign({ header: { alg: 'HS256' }, payload: Buffer.concat(chunks), secret: 'key' });
  add('stream sign ' + label, fn => () => streamed(fn, chunks), result => assert.equal(result, expected), true);
}
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
  const files = ['index.js', 'lib/core.js', 'lib/streams.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', 'test/helpers.cjs',
    ...Object.keys(require('../PROVENANCE.json').sha256),
    '../vjwa/index.js', '../vjwa/PROVENANCE.json', '../vjwa/test/helpers.cjs', '../vjwa/test/fixtures/keys.json',
    ...Object.keys(require('../../vjwa/PROVENANCE.json').sha256).map(file => '../vjwa/' + file)];
  const report = { recordedAt: new Date().toISOString(), runtime: process.versions, platform: process.platform, arch: process.arch,
    cpu: os.cpus()[0].model, calibration, rounds, checksum,
    methodology: 'Three variants: upstream jws+jwa, upstream jws+vjwa (bridged), and vjws+vjwa. Twelve rounds use all six variant orders twice. Pilot targets 10 ms blocks; sync 16–100000 iterations and async 1–100000. Warmup: 128 sync/2 async calls plus five full blocks for every variant, cycling variant order. Each result validated before timing. Outputs retained/consumed. Stream calls include source creation, collection and signing. Key import excluded for KeyObject cases, included for PEM cases; string PEM cache warm, PEM Buffer uncached. Three fresh-process reports per runtime and one identical-upstream calibration. No trimming. Units: nanoseconds per operation.',
    hashes: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])), rows };
  if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
  console.table(rows.map(row => ({ case: row.case, upstream: Math.round(median(row.samples.upstream)), bridged: Math.round(median(row.samples.bridged)), vpm: Math.round(median(row.samples.vpm)),
    change: (100 * (median(row.samples.vpm.map((v, i) => v / row.samples.upstream[i])) - 1)).toFixed(1) + '%' })));
})().catch(error => { console.error(error); process.exitCode = 1; });
