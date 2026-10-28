'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const load = require('../test/fixtures/load.cjs');
const implementations = [load(), load(true), require('..')];
const count = Number(process.env.COUNT || 10000);
const rounds = 12;
const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const cases = [];
const candidates = ['127.0.0.1', '10.0.0.1', '::ffff:10.0.0.1', '2001:db8::1', 'fc00::1', '198.51.100.1', undefined, 'opaque'];
const request = (peer, header) => ({ socket: { remoteAddress: peer }, headers: header === undefined ? {} : { 'x-forwarded-for': header } });
function normalized(value) { return typeof value === 'function' ? candidates.map(address => value(address)) : value; }
function add(name, inputs, setup, iterations = count, available = [0, 1, 2]) {
  const functions = implementations.map((impl, i) => available.includes(i) ? setup(impl) : null);
  for (const input of inputs) {
    const expected = normalized(functions[available[0]](input));
    for (const fn of functions) if (fn) assert.deepEqual(normalized(fn(input)), expected, name);
  }
  cases.push({ name, inputs, functions, iterations });
}
add('compile literal IPv4', ['127.0.0.1', '10.0.0.1'], p => p.compile, Math.min(count, 5000));
add('compile IPv4 CIDR', ['10.0.0.0/8'], p => p.compile, Math.min(count, 5000));
add('compile IPv6 CIDR', ['2001:db8::/32'], p => p.compile, Math.min(count, 5000));
add('compile mapped CIDR', ['::ffff:10.0.0.0/104'], p => p.compile, Math.min(count, 5000));
add('compile named ranges', [['loopback', 'linklocal', 'uniquelocal']], p => p.compile, Math.min(count, 2000));
const large = Array.from({ length: 100 }, (_, i) => '10.' + i + '.0.0/16');
add('compile 100 IPv4 rules', [large], p => p.compile, Math.min(count, 200));
add('trust empty policy', candidates, p => p.compile([]));
add('trust single IPv4', ['10.0.0.1', '192.0.2.1'], p => p.compile('10.0.0.0/8'));
add('trust single IPv6', ['2001:db8::1', 'fe80::1'], p => p.compile('2001:db8::/32'));
add('trust mapped candidates', ['::ffff:10.0.0.1', '::ffff:192.0.2.1'], p => p.compile('10.0.0.0/8'));
add('trust mapped policy', ['10.0.0.1', '::ffff:10.0.0.1', '192.0.2.1'], p => p.compile('::ffff:10.0.0.0/104'));
add('trust native IPv6 vs IPv4 policy', ['2001:db8::1', '::1'], p => p.compile('10.0.0.0/8'));
add('trust IPv4 vs IPv6 policy', ['10.0.0.1', '127.0.0.1'], p => p.compile('2001:db8::/32'));
add('trust named ranges', candidates.slice(0, -2), p => p.compile(['loopback', 'uniquelocal', 'linklocal']));
add('trust 100 rules last match', ['10.99.1.2', '10.100.0.1'], p => p.compile(large));
add('reject invalid candidates', ['invalid', '10.0.0.999', '1::2::3', undefined], p => p.compile(['loopback', 'uniquelocal']));
const ordinary = ['loopback', '10.0.0.0/8', '2001:db8::/32'];
const select = p => { const trust = p.compile(ordinary); return req => p(req, trust); };
add('select socket only', [request('127.0.0.1')], select);
add('select one header address', [request('127.0.0.1', '198.51.100.1')], select);
add('select three trusted proxies', [request('127.0.0.1', '198.51.100.1, 10.0.0.2, 10.0.0.1')], select);
add('stop at untrusted socket', [request('203.0.113.1', '198.51.100.1, 10.0.0.1')], select);
add('stop at untrusted middle hop', [request('127.0.0.1', 'spoofed, 203.0.113.1, 10.0.0.1')], select);
add('stop at malformed hop', [request('127.0.0.1', '198.51.100.1, unknown, 10.0.0.1')], select);
add('select mixed IPv6 chain', [request('::1', '198.51.100.1, 2001:db8::2, 2001:db8::1')], select);
add('select mapped IPv6 chain', [request('::ffff:127.0.0.1', '198.51.100.1, ::ffff:10.0.0.1')], select);
add('select 100 trusted hops', [request('127.0.0.1', '198.51.100.1, ' + Array.from({ length: 100 }, (_, i) => '10.0.0.' + i).join(', '))], select, Math.min(count, 1000));
add('select with inline configuration', [request('127.0.0.1', '198.51.100.1, 10.0.0.1')], p => req => p(req, ordinary), Math.min(count, 5000));
add('all addresses without trust', [request('127.0.0.1', '198.51.100.1, 10.0.0.2, 10.0.0.1')], p => p.all);
add('all addresses with trust', [request('127.0.0.1', 'spoofed, 203.0.113.1, 10.0.0.1')], p => { const trust = p.compile(ordinary); return req => p.all(req, trust); });
add('custom callback trust', [request('127.0.0.1', '198.51.100.1, 10.0.0.1')], p => { const trust = (_addr, hop) => hop < 2; return req => p(req, trust); });
add('unavailable socket address', [request(undefined, '198.51.100.1')], select);
// Corrected or newly supported outputs have no upstream-equivalent comparison.
add('HTTP tabs (corrected output)', [request('127.0.0.1', '198.51.100.1,\t10.0.0.1')], select, count, [1, 2]);
add('zero-prefix IPv4 policy', ['192.0.2.1', '::ffff:192.0.2.1', '2001:db8::1'], p => p.compile('0.0.0.0/0'), count, [2]);

let checksum = 0;
function consume(value) {
  if (value === undefined) return 0;
  if (typeof value === 'boolean') return Number(value);
  if (typeof value === 'string') return value.length;
  if (typeof value === 'function') return candidates.reduce((sum, candidate) => sum + Number(value(candidate)), 0);
  return value.reduce((sum, address) => sum + consume(address), 0);
}
function measure(fn, inputs, iterations) {
  const retained = new Array(256);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) retained[i & 255] = fn(inputs[i % inputs.length]);
  const elapsed = performance.now() - start;
  for (const value of retained) checksum += consume(value);
  return elapsed * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) if (fn) measure(fn, entry.inputs, Math.min(entry.iterations, 2000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) if (fn) measure(fn, entry.inputs, Math.min(entry.iterations, 5000));
  const samples = [[], [], []];
  for (let round = 0; round < rounds; round++) for (const index of orders[round % 6]) if (entry.functions[index]) samples[index].push(measure(entry.functions[index], entry.inputs, entry.iterations));
  const medians = samples.map(values => {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    return (sorted[5] + sorted[6]) / 2;
  });
  rows.push({ case: entry.name, iterations: entry.iterations, upstreamNs: medians[0], vpmDependenciesNs: medians[1], vpmNs: medians[2],
    upstreamRatio: medians[0] === null ? null : medians[2] / medians[0], callerRatio: medians[1] === null ? null : medians[2] / medians[1], samples });
}
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
const recordedAt = new Date().toISOString();
const result = { recordedAt, runtime: process.versions, platform: process.platform, arch: process.arch, rounds, count,
  implementations: ['proxy-addr 2.0.8 + forwarded 0.2.0 + ipaddr.js 1.9.1', 'proxy-addr 2.0.8 + vforwarded + vipaddr', 'vproxy-addr + vforwarded + vipaddr'],
  sampleOrder: 'all six permutations, twice', corpusWarmup: 'min(iterations, 2000)', caseWarmup: 'min(iterations, 5000)',
  units: 'nanoseconds/call including retention writes, excluding final result consumption',
  hashes: Object.fromEntries(['../index.js', '../test/fixtures/proxy-addr-2.0.8.cjs', '../test/fixtures/load.cjs', '../../vforwarded/index.js', '../../vforwarded/test/fixtures/forwarded-0.2.0.cjs', '../../vipaddr/index.js', '../../vipaddr/lib/parse.js', '../../vipaddr/lib/ranges.json', '../../vipaddr/test/fixtures/ipaddr-1.9.1.cjs', 'compare.cjs'].map(file => [file, hash(file)])), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, upstream: row.upstreamNs === null ? 'n/a' : Math.round(row.upstreamNs), leaves: row.vpmDependenciesNs === null ? 'n/a' : Math.round(row.vpmDependenciesNs), VPM: Math.round(row.vpmNs), callerRatio: row.callerRatio === null ? 'n/a' : row.callerRatio.toFixed(2) })));
console.log('Consumed checksum:', checksum);
