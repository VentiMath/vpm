'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { upstream, keys } = require('../test/helpers.cjs');
const previous = require('./fixtures/before-rsa.cjs');
const current = require('..');
const calibration = process.env.CALIBRATION === '1';
const implementations = { upstream, before: calibration ? upstream : previous, after: calibration ? upstream : current };
const message = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJzdHVkZW50IiwiYXVkIjoidmVudGltYXRoIiwiaWF0IjoxNzAwMDAwMDAwfQ';
const cases = [];
function add(name, make, expected) {
  const functions = Object.fromEntries(Object.entries(implementations).map(([name, implementation]) => [name, make(implementation)]));
  for (const fn of Object.values(functions)) assert.equal(fn(), expected, name);
  cases.push({ name, functions });
}
for (const algorithm of ['RS256', 'RS384', 'RS512', 'PS256', 'ES256']) {
  const key = keys[algorithm === 'ES256' ? algorithm : 'RSA'];
  const signature = upstream(algorithm).sign(message, key.privateKey);
  const buffer = Buffer.from(key.publicPem);
  const encoded = key.publicPem.split('\n').slice(1, -2).join('');
  const rotating = Array.from({ length: 20 }, (_, i) => '-----BEGIN PUBLIC KEY-----\n' +
    encoded.match(new RegExp('.{1,' + (48 + i) + '}', 'g')).join('\n') + '\n-----END PUBLIC KEY-----\n');
  add(algorithm + ' verify PEM Buffer (uncached)', fn => { const algo = fn(algorithm); return () => algo.verify(message, signature, buffer); }, true);
  add(algorithm + ' verify rotating PEM (cache miss)', fn => {
    const algo = fn(algorithm); let i = 0;
    return () => algo.verify(message, signature, rotating[i++ % rotating.length]);
  }, true);
  add(algorithm + ' verify KeyObject', fn => { const algo = fn(algorithm); return () => algo.verify(message, signature, key.publicKey); }, true);
  add(algorithm + ' verify warm PEM', fn => { const algo = fn(algorithm); return () => algo.verify(message, signature, key.publicPem); }, true);
}
const rsaSignature = upstream('RS256').sign(message, keys.RSA.privateKey);
add('RS256 sign private PEM', fn => { const algo = fn('RS256'); return () => algo.sign(message, keys.RSA.privatePem); }, rsaSignature);
const secret = crypto.createSecretKey(Buffer.from('benchmark-secret'));
const hmacSignature = upstream('HS256').sign(message, secret);
add('HS256 sign KeyObject', fn => { const algo = fn('HS256'); return () => algo.sign(message, secret); }, hmacSignature);
add('HS256 verify KeyObject', fn => { const algo = fn('HS256'); return () => algo.verify(message, hmacSignature, secret); }, true);
const oversized = 'A'.repeat(20000);
add('RS256 oversized signature', fn => { const algo = fn('RS256'); return () => algo.verify(message, oversized, keys.RSA.publicKey); }, false);
// Native primitives isolate the metadata cost from the package wrappers. A/A/A
// runs replace these too, so all labels execute the same import-only operation.
const pem = Buffer.from(keys.RSA.publicPem);
const imported = () => crypto.createPublicKey(pem);
cases.push({ name: 'profile import / import+type / import+details', functions: {
  upstream: imported,
  before: calibration ? imported : () => imported().asymmetricKeyType,
  after: calibration ? imported : () => imported().asymmetricKeyDetails,
} });
const orders = [['upstream', 'before', 'after'], ['upstream', 'after', 'before'],
  ['before', 'upstream', 'after'], ['before', 'after', 'upstream'],
  ['after', 'upstream', 'before'], ['after', 'before', 'upstream']];
const retain = new Array(64);
let checksum = 0;
function measure(fn, iterations) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) retain[i & 63] = fn();
  const elapsed = (performance.now() - start) * 1e6 / iterations;
  for (const result of retain) checksum = (checksum + (typeof result === 'string' ? result.length : result ? 1 : 0)) >>> 0;
  return elapsed;
}
const median = values => { const a = values.slice().sort((a, b) => a - b); return (a[(a.length - 1) >> 1] + a[a.length >> 1]) / 2; };
const rows = [];
for (const { name, functions } of cases) {
  for (const fn of Object.values(functions)) measure(fn, 128);
  const iterations = Math.max(32, Math.min(200000, Math.ceil(15e6 / measure(functions.upstream, 64))));
  for (const fn of Object.values(functions)) measure(fn, iterations);
  const samples = { upstream: [], before: [], after: [] };
  for (let round = 0; round < 12; round++) for (const variant of orders[round % 6]) {
    samples[variant].push(measure(functions[variant], iterations));
  }
  rows.push({ case: name, iterations, samples });
}
const directory = path.resolve(__dirname, '..');
const files = ['index.js', 'package.json', 'PROVENANCE.json', 'bench/rsa.cjs', 'bench/fixtures/before-rsa.cjs',
  'test/helpers.cjs', ...Object.keys(require('../PROVENANCE.json').sha256)];
const result = { recordedAt: new Date().toISOString(), runtime: process.versions, platform: process.platform, arch: process.arch,
  cpu: os.cpus()[0].model, calibration, rounds: 12, previousCommit: 'c3bc17fbf3d8237e2bcba84fc5cf8e09b9bfa083',
  methodology: 'Three variants: unmodified jwa 2.0.1, frozen VPM c3bc17f, current VPM. Twelve rounds use all six execution orders twice. 128 warmups plus one full block per variant. Upstream pilot targets 15ms, bounded to 32–200000 iterations. Outputs validated before timing, retained and consumed outside timing. Three fresh processes per runtime. A/A/A controls execute upstream under all labels. PEM Buffers always import; rotating PEM cycles 20 encodings of one public key beyond the 16-entry cache. Key generation/loading excluded. The final diagnostic row separately measures native import, import+type and import+details; it is not a before/after package comparison. No samples discarded. Nanoseconds/operation.',
  hashes: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, file))).digest('hex')])), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, ...Object.fromEntries(Object.entries(row.samples).map(([name, values]) => [name, Math.round(median(values))])),
  afterVsUpstream: (100 * (median(row.samples.after.map((v, i) => v / row.samples.upstream[i])) - 1)).toFixed(1) + '%' })));
