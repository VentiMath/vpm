'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { upstream, keys } = require('../test/helpers.cjs');
const implementation = require('..');
const calibration = process.env.CALIBRATION === '1';
const vpm = calibration ? upstream : implementation;
const rounds = 10;
const message = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJzdHVkZW50IiwiYXVkIjoidmVudGltYXRoIiwiaWF0IjoxNzAwMDAwMDAwfQ';
const cases = [];
const retain = new Array(64);
let checksum = 0;
function add(name, make, validate) {
  const a = make(upstream), b = make(vpm);
  validate(a()); validate(b());
  cases.push({ name, functions: { upstream: a, vpm: b } });
}
add('factory HS256', fn => () => fn('HS256'), value => assert.equal(typeof value.sign, 'function'));
for (const family of ['HS', 'RS', 'PS', 'ES']) for (const bits of [256, 384, 512]) {
  const algorithm = family + bits;
  const key = keys[family === 'ES' ? algorithm : 'RSA'];
  const privateKey = family === 'HS' ? crypto.createSecretKey(Buffer.from('benchmark-secret')) : key.privateKey;
  const publicKey = family === 'HS' ? privateKey : key.publicKey;
  const signature = upstream(algorithm).sign(message, privateKey);
  add(algorithm + ' sign KeyObject', fn => { const algo = fn(algorithm); return () => algo.sign(message, privateKey); },
    result => assert.equal(upstream(algorithm).verify(message, result, publicKey), true));
  add(algorithm + ' verify KeyObject', fn => { const algo = fn(algorithm); return () => algo.verify(message, signature, publicKey); },
    result => assert.equal(result, true));
}
for (const algorithm of ['HS256', 'RS256', 'PS256', 'ES256']) {
  const key = keys[algorithm === 'ES256' ? algorithm : 'RSA'];
  const privateKey = algorithm === 'HS256' ? 'benchmark-secret' : key.privatePem;
  const publicKey = algorithm === 'HS256' ? privateKey : key.publicPem;
  const label = algorithm === 'HS256' ? 'string secret' : 'PEM';
  const signature = upstream(algorithm).sign(message, privateKey);
  add(algorithm + ' sign ' + label, fn => { const algo = fn(algorithm); return () => algo.sign(message, privateKey); },
    result => assert.equal(upstream(algorithm).verify(message, result, publicKey), true));
  add(algorithm + ' verify ' + label, fn => { const algo = fn(algorithm); return () => algo.verify(message, signature, publicKey); },
    result => assert.equal(result, true));
}
const large = Buffer.alloc(65536, 97);
for (const algorithm of ['RS256', 'ES256']) {
  const key = keys[algorithm === 'ES256' ? algorithm : 'RSA'];
  const signature = upstream(algorithm).sign(message, key.privateKey);
  const buffer = Buffer.from(key.publicPem);
  add(algorithm + ' verify PEM Buffer (uncached)', fn => { const algo = fn(algorithm); return () => algo.verify(message, signature, buffer); }, result => assert.equal(result, true));
  const encoded = key.publicPem.split('\n').slice(1, -2).join('');
  const rotating = Array.from({ length: 20 }, (_, i) => '-----BEGIN PUBLIC KEY-----\n' +
    encoded.match(new RegExp('.{1,' + (48 + i) + '}', 'g')).join('\n') + '\n-----END PUBLIC KEY-----\n');
  add(algorithm + ' verify rotating PEM (cache miss)', fn => {
    const algo = fn(algorithm); let i = 0;
    return () => algo.verify(message, signature, rotating[i++ % rotating.length]);
  }, result => assert.equal(result, true));
}
const largeSignature = upstream('HS256').sign(large, 'key');
add('HS256 sign 64 KiB', fn => { const algo = fn('HS256'); return () => algo.sign(large, 'key'); }, result => assert.equal(result, largeSignature));
add('HS256 verify 64 KiB', fn => { const algo = fn('HS256'); return () => algo.verify(large, largeSignature, 'key'); }, result => assert.equal(result, true));
for (const algorithm of ['HS256', 'RS256', 'ES256']) {
  const key = algorithm === 'HS256' ? 'key' : keys[algorithm === 'ES256' ? algorithm : 'RSA'].publicKey;
  const signature = Buffer.alloc(algorithm === 'HS256' ? 32 : algorithm === 'ES256' ? 64 : 256, 1).toString('base64url');
  add(algorithm + ' mismatched signature', fn => { const algo = fn(algorithm); return () => algo.verify(message, signature, key); }, result => assert.equal(result, false));
}
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
  // Aim at 15 ms blocks using an untimed-for-report upstream pilot. Key parsing
  // is included in PEM cases; fixed test keys are loaded before all measurements.
  const pilot = measure(functions.upstream, 64);
  const iterations = Math.max(32, Math.min(200000, Math.ceil(15e6 / pilot)));
  const samples = { upstream: [], vpm: [] };
  for (const fn of Object.values(functions)) measure(fn, iterations);
  for (let round = 0; round < rounds; round++) for (const variant of round % 2 ? ['vpm', 'upstream'] : ['upstream', 'vpm']) {
    samples[variant].push(measure(functions[variant], iterations));
  }
  rows.push({ case: name, iterations, samples,
    upstreamNs: median(samples.upstream), vpmNs: median(samples.vpm),
    pairedChangePercent: 100 * (median(samples.vpm.map((value, i) => value / samples.upstream[i])) - 1) });
}
const directory = path.resolve(__dirname, '..');
const files = ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', 'test/helpers.cjs',
  'test/fixtures/keys.json', ...Object.keys(require('../PROVENANCE.json').sha256)];
const result = { recordedAt: new Date().toISOString(), runtime: process.versions, platform: process.platform, arch: process.arch,
  cpu: os.cpus()[0].model, calibration, rounds,
  methodology: 'Within-process alternating pairs; ten rounds per workload, five of each order. 128 initial warmups and one full block per variant. Pilot selects 32–200000 iterations targeting 15ms blocks. Output retained and consumed outside timing. KeyObject cases exclude import. PEM string verification uses warm public caches; PEM Buffer verification bypasses them. Rotating PEM cycles 20 encodings of one public key, exceeding the 16-entry cache. Private PEM import is included in signing. Three fresh-process reports per runtime; calibration uses upstream for both variants. No trimming. Units: nanoseconds per operation.',
  hashes: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, file))).digest('hex')])),
  checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstreamNs: Math.round(row.upstreamNs), vpmNs: Math.round(row.vpmNs), change: row.pairedChangePercent.toFixed(1) + '%' })));
