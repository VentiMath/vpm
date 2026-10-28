'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const implementations = [require('../test/fixtures/ipaddr-1.9.1.cjs'), require('../test/fixtures/ipaddr-2.5.0.cjs'), require('..')];
const count = Number(process.env.COUNT || 100000);
const parseCount = Math.min(count, 10000);
const rounds = 12;
const order = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const cases = [];
const v4 = ['192.0.2.1', '127.0.0.1', '10.123.45.67', '255.255.255.255'];
const v6 = ['2001:db8:1234:5678:abcd:ef01:2345:6789', 'fe80::1234:abcd', '::1', '2001:db8::1'];
const mapped = ['::ffff:192.0.2.1', '::ffff:10.0.0.1'];
function normalized(result) {
  if (result && typeof result.toByteArray === 'function') return { bytes: result.toByteArray(), zone: result.zoneId };
  if (Array.isArray(result)) return result.map(normalized);
  return result;
}
function add(name, values, setup, available = [0, 1, 2], iterations = count) {
  const functions = implementations.map((ip, index) => available.includes(index) ? setup(ip) : null);
  const expected = functions[available[0]];
  for (const input of values) for (const fn of functions) if (fn) assert.deepEqual(normalized(fn(input)), normalized(expected(input)), name);
  cases.push({ name, values, functions, iterations });
}
add('parse IPv4', v4, ip => ip.parse, [0, 1, 2], parseCount);
add('validate IPv4', v4, ip => ip.isValid, [0, 1, 2], parseCount);
add('parse IPv6', v6, ip => ip.parse, [0, 1, 2], parseCount);
add('validate IPv6', v6, ip => ip.isValid, [0, 1, 2], parseCount);
add('reject invalid address', ['not-an-ip', '1.2.3.999', '1::2::3', '12345::1'], ip => ip.isValid, [0, 1, 2], parseCount);
add('parse mapped IPv6', mapped, ip => ip.parse, [0, 1, 2], parseCount);
add('process mapped IPv6', mapped, ip => value => ip.process(value), [0, 1, 2], parseCount);
add('parse IPv4 CIDR', v4.map(value => value + '/24'), ip => ip.parseCIDR, [0, 1, 2], parseCount);
add('parse IPv6 CIDR', v6.map(value => value + '/64'), ip => ip.parseCIDR, [0, 1, 2], parseCount);
add('construct IPv4', [[192, 0, 2, 1], [10, 0, 0, 1]], ip => values => new ip.IPv4(values));
add('construct IPv6', [[0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]], ip => values => new ip.IPv6(values));
add('match parsed IPv4', [0, 1, 2, 3], ip => {
  const values = v4.map(value => ip.parse(value));
  const subnet = ip.parse('192.0.2.0');
  return index => values[index].match(subnet, [24, 0, 8, 31][index]);
});
add('match parsed IPv6', [0, 1, 2, 3], ip => {
  const values = v6.map(value => ip.parse(value));
  const subnet = ip.parse('2001:db8::');
  return index => values[index].match(subnet, [32, 64, 0, 127][index]);
});
add('mapped predicate', [0, 1, 2, 3], ip => {
  const values = [...mapped, '2001:db8::1', '::1'].map(value => ip.parse(value));
  return index => values[index].isIPv4MappedAddress();
});
add('mapped to IPv4', [0, 1], ip => {
  const values = mapped.map(value => ip.parse(value));
  return index => values[index].toIPv4Address();
});
add('IPv4 to mapped', [0, 1, 2, 3], ip => {
  const values = v4.map(value => ip.parse(value));
  return index => values[index].toIPv4MappedAddress();
});
add('format IPv4', [0, 1, 2, 3], ip => {
  const values = v4.map(value => ip.parse(value));
  return index => values[index].toString();
});
add('format IPv6 RFC5952', [0, 1, 2, 3], ip => {
  const values = v6.map(value => ip.parse(value));
  return index => values[index].toRFC5952String();
});
add('IPv6 to bytes', [0, 1, 2, 3], ip => {
  const values = v6.map(value => ip.parse(value));
  return index => values[index].toByteArray();
});
add('IPv6 from bytes', [[32, 1, 13, 184, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]], ip => ip.fromByteArray);
add('IPv4 mask prefix', [0, 1, 2, 3], ip => {
  const values = ['255.255.255.0', '255.128.0.0', '255.255.255.255', '0.0.0.0'].map(value => ip.parse(value));
  return index => values[index].prefixLengthFromSubnetMask();
});
add('IPv6 mask prefix', [0, 1, 2, 3], ip => {
  const values = ['ffff:ffff:ffff:ffff::', 'ffff:ff80::', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', '::'].map(value => ip.parse(value));
  return index => values[index].prefixLengthFromSubnetMask();
});
add('classify IPv4', [0, 1, 2, 3], ip => {
  const values = v4.map(value => ip.parse(value));
  return index => values[index].range();
});
// This corpus has equal range names in both releases; new 2.5 classifications
// are verified by tests, not conflated with different legacy outputs here.
add('classify IPv6', [0, 1, 2, 3], ip => {
  const values = ['fe80::1', '::1', 'fc00::1', 'ff01::1'].map(value => ip.parse(value));
  return index => values[index].range();
});
add('IPv4 network address', ['192.0.2.1/24', '10.5.6.7/8'], ip => value => ip.IPv4.networkAddressFromCIDR(value), [0, 1, 2], parseCount);
add('IPv6 network address', ['2001:db8:1234::1/48', 'fe80::1/64'], ip => value => ip.IPv6.networkAddressFromCIDR(value), [1, 2], parseCount);

const callerFile = path.resolve(__dirname, '../test/fixtures/proxy-addr-2.0.8.cjs');
const callerSource = fs.readFileSync(callerFile, 'utf8');
function proxyAddr(ip) {
  const mod = { exports: {} };
  const dependency = name => {
    if (name === 'ipaddr.js') return ip;
    if (name === 'forwarded') return require('../../vforwarded');
    throw new Error('Unexpected proxy-addr dependency: ' + name);
  };
  // Use the ordinary CommonJS wrapper explicitly: Bun's Module._compile does
  // not honor an overridden module.require when resolving fixture imports.
  const factory = new Function('exports', 'require', 'module', '__filename', '__dirname', callerSource);
  factory.call(mod.exports, mod.exports, dependency, mod, callerFile, path.dirname(callerFile));
  return mod.exports;
}
add('proxy-addr trust IPv4', v4, ip => proxyAddr(ip).compile(['loopback', '10.0.0.0/8', '192.0.2.0/24']), [0, 1, 2], parseCount);
add('proxy-addr trust IPv6', v6, ip => proxyAddr(ip).compile(['loopback', '2001:db8::/32']), [0, 1, 2], parseCount);
add('proxy-addr trust mapped', mapped, ip => proxyAddr(ip).compile(['loopback', '10.0.0.0/8', '192.0.2.0/24']), [0, 1, 2], parseCount);
// The releases reject or change these bits; VPM-only, no comparative ratio.
add('compatible IPv6 (preserved bits)', ['::192.0.2.1'], ip => value => ip.process(value), [2], parseCount);

let checksum = 0;
function consume(result) {
  if (result === null || result === undefined) return 0;
  if (typeof result === 'string') return result.length;
  if (typeof result === 'boolean') return Number(result);
  if (typeof result === 'number') return result;
  if (Array.isArray(result)) return result.reduce((sum, item) => sum + consume(item), 0);
  return consume(result.toByteArray());
}
function measure(fn, inputs, iterations) {
  // Retain objects outside the timed loop so allocation cannot disappear.
  // All implementations pay identical ring-buffer writes; consume after timing.
  const retained = new Array(256);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) retained[i & 255] = fn(inputs[i % inputs.length]);
  const elapsed = performance.now() - start;
  for (const result of retained) checksum += consume(result);
  return elapsed * 1e6 / iterations;
}
for (const entry of cases) for (const fn of entry.functions) if (fn) measure(fn, entry.values, Math.min(entry.iterations, 10000));
const rows = [];
for (const entry of cases) {
  for (const fn of entry.functions) if (fn) measure(fn, entry.values, Math.min(entry.iterations, 20000));
  const samples = [[], [], []];
  for (let round = 0; round < rounds; round++) for (const index of order[round % order.length]) {
    if (entry.functions[index]) samples[index].push(measure(entry.functions[index], entry.values, entry.iterations));
  }
  const medians = samples.map(values => {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    return (sorted[5] + sorted[6]) / 2;
  });
  rows.push({ case: entry.name, iterations: entry.iterations, legacyNs: medians[0], currentNs: medians[1], vpmNs: medians[2],
    legacyRatio: medians[0] === null ? null : medians[2] / medians[0], currentRatio: medians[1] === null ? null : medians[2] / medians[1], samples });
}
const hash = file => createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, file))).digest('hex');
const recordedAt = new Date().toISOString();
const result = { date: recordedAt.slice(0, 10), recordedAt, runtime: process.versions, platform: process.platform, arch: process.arch,
  baselines: ['ipaddr.js 1.9.1', 'ipaddr.js 2.5.0'], caller: 'proxy-addr 2.0.8 (unchanged compile/trust functions)', count, rounds,
  sampleOrder: 'all six permutations, twice', corpusWarmup: 'min(iterations, 10000)', caseWarmup: 'min(iterations, 20000)',
  units: 'nanoseconds/call including retention writes, excluding final result consumption',
  hashes: Object.fromEntries(['../index.js', '../lib/parse.js', '../lib/ranges.json', '../test/fixtures/ipaddr-1.9.1.cjs', '../test/fixtures/ipaddr-2.5.0.cjs', '../test/fixtures/proxy-addr-2.0.8.cjs', '../../vforwarded/index.js', 'compare.cjs'].map(file => [file, hash(file)])), checksum, rows };
if (process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT, JSON.stringify(result, null, 2) + '\n');
console.table(rows.map(row => ({ case: row.case, legacy: row.legacyNs === null ? 'n/a' : Math.round(row.legacyNs), current: row.currentNs === null ? 'n/a' : Math.round(row.currentNs), VPM: Math.round(row.vpmNs), ratio: row.currentRatio === null ? 'n/a' : row.currentRatio.toFixed(2) })));
console.log('Consumed checksum:', checksum, 'Twelve order-balanced samples; isolated operations, not application throughput.');
