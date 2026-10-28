'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { runInNewContext } = require('node:vm');
const proxy = require('..');
const ip = require('vipaddr');
const upstream = require('./fixtures/load.cjs')();
const withLeaves = require('./fixtures/load.cjs')(true);
const request = (peer, header) => ({ socket: { remoteAddress: peer }, headers: header === undefined ? {} : { 'x-forwarded-for': header } });
let seed = 0x17ac9b31;
function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function integer(address) { return address.toByteArray().reduce((n, b) => (n << 8n) | BigInt(b), 0n); }

test('verified proxy and dependency fixtures retain their source hashes', () => {
  const provenance = require('../PROVENANCE.json');
  const sources = [
    [path.join(__dirname, '..', provenance.source.fixture), provenance.source.sha256],
    ...require('../../vipaddr/PROVENANCE.json').sources.filter(x => x.version === '1.9.1').map(x => [path.join(__dirname, '../../vipaddr', x.fixture), x.sha256]),
    ...require('../../vforwarded/PROVENANCE.json').sources.map(x => [path.join(__dirname, '../../vforwarded', x.fixture), x.sha256]),
  ];
  for (const [file, hash] of sources) assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash);
});

test('zero prefixes cover exactly their family; mapped /96 covers IPv4', () => {
  const v4 = proxy.compile('0.0.0.0/0'), v6 = proxy.compile('::/0'), mapped = proxy.compile('::ffff:0.0.0.0/96');
  for (const value of ['0.0.0.0', '255.255.255.255', '192.0.2.1', '::ffff:192.0.2.1']) {
    assert.equal(v4(value), true); assert.equal(mapped(value), true); assert.equal(v6(value), false);
  }
  for (const value of ['::', '::1', 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', '::192.0.2.1']) {
    assert.equal(v4(value), false); assert.equal(mapped(value), false); assert.equal(v6(value), true);
  }
  for (const value of ['', 'hostname', '1.2.3.999', '::ffff:300.0.0.1', undefined, null]) {
    assert.equal(v4(value), false); assert.equal(mapped(value), false); assert.equal(v6(value), false);
  }
});

test('every IPv4 prefix agrees with BigInt and its mapped prefix', () => {
  for (let bits = 0; bits <= 32; bits++) {
    const address = ip.fromByteArray(Array.from({ length: 4 }, () => random() & 255));
    const trusts = [proxy.compile(address + '/' + bits), proxy.compile(address.toIPv4MappedAddress() + '/' + (bits + 96)), proxy.compile(address + '/' + ip.IPv4.subnetMaskFromPrefixLength(bits))];
    for (let i = 0; i < 60; i++) {
      const candidate = i % 3 === 0 ? address : ip.fromByteArray(Array.from({ length: 4 }, () => random() & 255));
      const expected = (integer(candidate) >> BigInt(32 - bits)) === (integer(address) >> BigInt(32 - bits));
      for (const trust of trusts) {
        assert.equal(trust(candidate.toString()), expected);
        assert.equal(trust(candidate.toIPv4MappedAddress().toString()), expected);
        assert.equal(trust('::' + candidate), false);
      }
    }
  }
});

test('every IPv6 prefix agrees with BigInt, including non-word boundaries', () => {
  for (let bits = 0; bits <= 128; bits++) {
    const bytes = Array.from({ length: 16 }, () => random() & 255); bytes[0] = 0x20;
    const address = ip.fromByteArray(bytes);
    const trust = proxy.compile(address + '/' + bits);
    for (let i = 0; i < 40; i++) {
      const other = i % 3 === 0 ? bytes : bytes.map(() => random() & 255);
      const candidate = ip.fromByteArray(other);
      const expected = (integer(candidate) >> BigInt(128 - bits)) === (integer(address) >> BigInt(128 - bits));
      assert.equal(trust(candidate.toString()), expected);
      assert.equal(trust(candidate + '%en-0'), expected);
      assert.equal(trust('192.0.2.1'), false);
      assert.equal(trust('::ffff:192.0.2.1'), false);
    }
  }
});

test('short mapped prefixes cannot grant trust through either family', () => {
  for (let bits = 0; bits < 96; bits++) {
    for (const rules of [['::ffff:192.0.2.1/' + bits], ['::ffff:192.0.2.1/' + bits, '198.51.100.1/32']]) {
      const trust = proxy.compile(rules);
      for (const value of ['192.0.2.1', '::ffff:192.0.2.1', '::1', '::fffe:0:1', '::192.0.2.1', '2001:db8::1']) assert.equal(trust(value), false);
      assert.equal(trust('198.51.100.1'), rules.length === 2);
    }
  }
});

test('every prefix includes both boundaries and excludes their nearest outside neighbors', () => {
  for (const length of [4, 16]) {
    const max = length * 8;
    const limit = (1n << BigInt(max)) - 1n;
    const original = ip.fromByteArray(Array.from({ length }, (_, i) => (i * 37 + 83) & 255));
    const fromInteger = value => ip.fromByteArray(Array.from({ length }, (_, i) => Number((value >> BigInt((length - i - 1) * 8)) & 255n)));
    for (let bits = 0; bits <= max; bits++) {
      const shift = BigInt(max - bits);
      const network = (integer(original) >> shift) << shift;
      const end = network | ((1n << shift) - 1n);
      const trust = proxy.compile(original + '/' + bits);
      for (const [value, expected] of [[network, true], [end, true], [network - 1n, false], [end + 1n, false]]) {
        if (value < 0n || value > limit) continue;
        const address = fromInteger(value);
        assert.equal(trust(address.toString()), expected, `${original}/${bits}: ${address}`);
        if (length === 4) assert.equal(trust(address.toIPv4MappedAddress().toString()), expected);
      }
    }
  }
});

test('native compatible IPv6 rules remain distinct from mapped and IPv4 rules', () => {
  for (const rule of ['::192.0.2.0/120', '::c000:200/120']) {
    const trust = proxy.compile(rule);
    assert.equal(trust('::192.0.2.255'), true);
    assert.equal(trust('::192.0.3.1'), false);
    assert.equal(trust('192.0.2.1'), false);
    assert.equal(trust('::ffff:192.0.2.1'), false);
  }
});

test('netmasks are contiguous, full-input validated, and include the zero mask', () => {
  for (const rule of ['192.0.2.1/0.0.0.0', '192.0.2.1/0x0']) assert.equal(proxy.compile(rule)('203.0.113.1'), true);
  assert.equal(proxy.compile('192.0.2.1/0xffffffff')('192.0.2.1'), true);
  assert.equal(proxy.compile('192.0.2.1/255.255.255.255')('192.0.2.2'), false);
  for (const rule of ['1.2.3.4/255.0.255.0', '1.2.3.4/0.255.255.255', '1.2.3.4/255.255.255.255\n', '::1/255.255.255.0',
    '1.2.3.4/4294967295', '1.2.3.4/33', '::1/129', '1.2.3.4/-1', '1.2.3.4/8\n', '1.2.3.4/8x', '1.2.3.4/', '::1/1/2', '::1/NaN', '::1/Infinity', '::1/1.5']) {
    assert.throws(() => proxy.compile(rule), TypeError, rule);
  }
});

test('configuration accepts validated vipaddr syntax and rejects malformed or coerced entries', () => {
  for (const rule of ['127.1', '0X7f000001', '0177.0.0.1', '127.0.1']) assert.equal(proxy.compile(rule)('127.0.0.1'), true);
  for (const rule of ['08.0.0.1', '127.0.0.1\n', '::1\n', '::ffff:01.2.3.4', '::1%', '::1%a/b', '', 'toString', '__proto__', 'LOOPBACK', '[::1]', '127.0.0.1:80']) assert.throws(() => proxy.compile(rule), TypeError, rule);
  const hostile = { toString() { throw new Error('must not coerce'); } };
  for (const value of [undefined, null, false, true, 0, 1, NaN, {}, hostile, () => true, Symbol()]) assert.throws(() => proxy.compile(value), TypeError);
  for (const value of [undefined, null, 1, hostile, ['loopback'], Symbol()]) assert.throws(() => proxy.compile([value]), TypeError);
  const sparse = new Array(1);
  Object.setPrototypeOf(sparse, { 0: '0.0.0.0/0' });
  assert.throws(() => proxy.compile(sparse), TypeError);
  assert.throws(() => proxy.compile(new Array(2)), TypeError);
});

test('trust arrays are read once and compiled policy survives subsequent mutations', () => {
  const values = ['loopback', '10.0.0.0/8'];
  const counts = { length: 0, 0: 0, 1: 0 };
  const wrapped = new Proxy(values, { get(target, key, receiver) {
    if (Object.hasOwn(counts, key)) counts[key]++;
    if (key === 'slice' || key === Symbol.iterator) throw new Error('must not call user methods');
    return Reflect.get(target, key, receiver);
  } });
  const trust = proxy.compile(wrapped);
  assert.deepEqual(counts, { length: 1, 0: 1, 1: 1 });
  values.fill('0.0.0.0/0'); values.length = 0;
  assert.equal(trust('10.0.0.1'), true);
  assert.equal(trust('203.0.113.1'), false);
  assert.equal(proxy.compile(Object.freeze(['loopback']))('::1'), true);
  assert.equal(proxy.compile(runInNewContext('["loopback"]'))('127.0.0.1'), true);
  const error = new Error('getter');
  assert.throws(() => proxy.compile(new Proxy([], { get() { throw error; } })), e => e === error);
});

test('invalid candidates return false without coercion for every policy shape', () => {
  const hostile = { toString() { throw new Error('must not coerce'); } };
  for (const rules of [[], ['0.0.0.0/0'], ['::/0'], ['loopback', 'uniquelocal']]) {
    const trust = proxy.compile(rules);
    for (const value of [undefined, null, {}, hostile, [], 123, true, 1n, Symbol(), 'hostname', '1.2.3.4\n', '::1\n', '::ffff:999.1.1.1', '::1%']) assert.equal(trust(value), false);
  }
});

test('callbacks see the original ordered chain once, with no furthest-address call', () => {
  const req = request('127.0.0.1', 'client, 10.0.0.2, 10.0.0.1');
  const seen = [];
  assert.equal(proxy(req, function (address, index) {
    assert.equal(this, undefined);
    seen.push([address, index]);
    req.headers['x-forwarded-for'] = 'changed'; req.socket.remoteAddress = 'changed';
    return index < 1;
  }), '10.0.0.1');
  assert.deepEqual(seen, [['127.0.0.1', 0], ['10.0.0.1', 1]]);
  let calls = 0;
  assert.equal(proxy(request('127.0.0.1'), () => { calls++; }), '127.0.0.1');
  assert.equal(calls, 0);
  assert.equal(proxy(request('127.0.0.1', 'opaque'), () => 'truthy'), 'opaque');
  const error = new Error('policy');
  assert.throws(() => proxy(request('127.0.0.1', 'opaque'), () => { throw error; }), e => e === error);
});

test('all keeps extraction semantics and rejects accidental falsy policy values', () => {
  const req = request('127.0.0.1', 'client,\t10.0.0.1\t, \t ');
  assert.deepEqual(proxy.all(req), ['127.0.0.1', '10.0.0.1', 'client']);
  assert.deepEqual(proxy.all(req, null), proxy.all(req));
  assert.deepEqual(proxy.all(req, []), ['127.0.0.1']);
  assert.equal(proxy(req, 'loopback'), '10.0.0.1');
  for (const value of [false, 0, '', NaN, true]) assert.throws(() => proxy.all(req, value), TypeError);
  assert.throws(() => proxy(req, undefined), TypeError);
  assert.throws(() => proxy(req, null), TypeError);
  const chain = proxy.all(req); chain.length = 0;
  assert.equal(proxy.all(req).length, 3);
});

test('request snapshots preserve vforwarded validation, own headers and socket precedence', () => {
  const counts = [0, 0, 0, 0];
  const headers = { get 'x-forwarded-for'() { counts[1]++; return '198.51.100.1,\t10.0.0.1'; } };
  const socket = { get remoteAddress() { counts[3]++; return '127.0.0.1'; } };
  const req = { get headers() { counts[0]++; return headers; }, get socket() { counts[2]++; return socket; }, get connection() { throw new Error('unused'); } };
  assert.equal(proxy(req, ['loopback', '10.0.0.0/8']), '198.51.100.1');
  assert.deepEqual(counts, [1, 1, 1, 1]);
  assert.equal(proxy({ headers: Object.create({ 'x-forwarded-for': 'evil' }), socket: { remoteAddress: '127.0.0.1' } }, 'loopback'), '127.0.0.1');
  assert.equal(proxy(Object.freeze({ headers: Object.freeze({}), connection: Object.freeze({ remoteAddress: '127.0.0.1' }) }), []), '127.0.0.1');
  assert.equal(proxy(request(undefined, '10.0.0.1'), '0.0.0.0/0'), undefined);
  assert.throws(() => proxy(request('127.0.0.1', []), 'loopback'), TypeError);
});

test('3,000 generated policies and requests agree with the original and VPM-dependency callers', () => {
  const presets = [['loopback'], ['uniquelocal'], ['linklocal'], ['127.0.0.1', '10.0.0.0/8'], ['2001:db8::/32', '10.0.0.0/8'], ['::ffff:10.0.0.0/104'], ['::ffff:0:0/80'], ['::/1'], []];
  const addresses = ['127.0.0.1', '::1', '10.1.2.3', '::ffff:10.1.2.3', '198.51.100.1', '2001:db8::1', 'fc00::1', 'fe80::1', '169.254.1.2', 'opaque'];
  for (let i = 0; i < 3000; i++) {
    const policy = presets[random() % presets.length];
    const candidate = addresses[random() % addresses.length];
    const chain = Array.from({ length: random() % 8 }, () => addresses[random() % addresses.length]);
    const req = request(candidate, chain.join(', '));
    for (const baseline of [upstream, withLeaves]) {
      assert.equal(proxy.compile(policy)(candidate), baseline.compile(policy)(candidate));
      assert.equal(proxy(req, policy), baseline(req, policy));
      assert.deepEqual(proxy.all(req, policy), baseline.all(req, policy));
    }
  }
});

test('named ranges and overlapping lists do not depend on rule order', () => {
  const rules = ['loopback', 'linklocal', 'uniquelocal', '192.0.2.0/24', '2001:db8::/32'];
  const a = proxy.compile(rules), b = proxy.compile(rules.toReversed());
  for (let i = 0; i < 2000; i++) {
    const candidate = ip.fromByteArray(Array.from({ length: i % 2 ? 4 : 16 }, () => random() & 255)).toString();
    assert.equal(a(candidate), b(candidate));
    assert.equal(a(candidate), upstream.compile(rules)(candidate));
  }
});

test('frozen CommonJS export has matching default and named ESM imports', async () => {
  assert.equal(Object.isFrozen(proxy), true);
  const esm = await import('../index.js');
  assert.equal(esm.default, proxy);
  assert.equal(esm.compile, proxy.compile);
  assert.equal(esm.all, proxy.all);
});
