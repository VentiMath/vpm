'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isIP } = require('node:net');
const { runInNewContext } = require('node:vm');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const ip = require('..');
const { IPv4, IPv6 } = ip;
const current = require('./fixtures/ipaddr-2.5.0.cjs');
const legacy = require('./fixtures/ipaddr-1.9.1.cjs');
let state = 0x39a7bd52;
function random() { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; }
function integer(bytes) { return bytes.reduce((n, byte) => (n << 8n) | BigInt(byte), 0n); }
function bitsToBytes(n, length) {
  return Array.from({ length }, (_, i) => Number((n >> BigInt(8 * (length - i - 1))) & 255n));
}
function bytesEqual(actual, expected) { assert.deepEqual(actual.toByteArray(), expected.toByteArray()); }

test('comparison fixtures retain the verified release hashes', () => {
  const provenance = require('../PROVENANCE.json');
  for (const source of [...provenance.sources, provenance.caller]) {
    const bytes = readFileSync(path.join(__dirname, '..', source.fixture));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
  }
});

test('inet_aton syntax agrees with 2.5.0 and valid ordinary 1.9.1 addresses', () => {
  for (const value of ['0', '1', '4294967295', '0xffffffff', '0Xc0a80101', '030052000401', '00', '0x0',
    '127.1', '127.65535', '127.16777215', '127.0.65535', '0.0xffffff', '0.0.0xffff',
    '192.0250.0x01.1', '255.255.255.255', '0000001.2.3.4']) {
    bytesEqual(ip.parse(value), current.parse(value));
    if ([1, 4].includes(value.split('.').length) && !value.startsWith('0X')) bytesEqual(ip.parse(value), legacy.parse(value));
    if (value.startsWith('0X')) assert.equal(ip.parse(value).toString(), '192.168.1.1');
  }
  for (const value of ['', '0x', '0xg', '08', '09.0.0.1', '0109.0.0.1', '10.048.1.1', '4294967296',
    '0x100000000', '256.0.0.0', '1.16777216', '1.2.65536', '1.2.3.256', '1.2.3.4.5', '.1.2.3', '1..2.3',
    '1.2.3.', '-1', '+1', '1e2', '1_000', '1 2', '1.2.3.4\n', '\t1', '１', '@.0.0.1', '`.0.0.1']) {
    assert.equal(IPv4.isValid(value), false, value);
    assert.equal(IPv4.isIPv4(value), false, value);
    assert.equal(IPv4.parser(value), null, value);
    assert.throws(() => IPv4.parse(value), RangeError, value);
  }
});

test('strict IPv4 predicates require four unpadded decimal parts', () => {
  for (const value of ['0.0.0.0', '255.255.255.255', '127.0.0.1']) {
    assert.equal(IPv4.isValidFourPartDecimal(value), true);
    assert.equal(IPv4.isValidCIDRFourPartDecimal(value + '/0'), true);
    assert.equal(IPv4.isValidCIDRFourPartDecimal(value + '/32'), true);
  }
  for (const value of ['127.1', '0x7f.0.0.1', '0177.0.0.1', '127.00.0.1', '1.2.3.04', '1.2.3.4\n']) {
    assert.equal(IPv4.isValidFourPartDecimal(value), false);
    assert.equal(IPv4.isValidCIDRFourPartDecimal(value + '/24'), false);
  }
});

test('IPv6 consumes the entire input and validates group count, compression and dotted tails', () => {
  for (const value of ['::', '::1', 'ffff:FFFF:0:1:2:3:4:5', '1:2:3:4:5:6:7::', '::1:2:3:4:5:6:7',
    '1:2:3:4:5:6:192.0.2.1', '::ffff:192.0.2.1', '2001:db8::192.0.2.1']) {
    assert.equal(isIP(value), 6, value);
    bytesEqual(ip.parse(value), current.parse(value));
  }
  for (const value of [':', ':::', ':1', '1:', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', '1:2:3:4:5:6:7:8::',
    '::1:2:3:4:5:6:7:8', '1::2::3', '1:::2', '00000::1', '0x1::', '::@', '::`', '::ffff:256.0.0.1',
    '::ffff:01.2.3.4', '::ffff:0x1.2.3.4', '::ffff:1.2.3', '::ffff:1.2.3.4:5',
    '1:2:3:4:5:6:7:1.2.3.4', '1:2:3:4:5:6::1.2.3.4', '[::1]', '::1\n', ' ::1', '::1\0']) {
    assert.equal(IPv6.parser(value), null, value);
    assert.equal(IPv6.isIPv6(value), false, value);
    assert.equal(ip.isValid(value), false, value);
    assert.throws(() => IPv6.parse(value), RangeError, value);
  }
  for (let start = 0; start < 8; start++) for (let length = 1; start + length <= 8; length++) {
    const values = Array.from({ length: 8 }, (_, i) => start <= i && i < start + length ? 0 : i + 1);
    const compressed = values.slice(0, start).map(x => x.toString(16)).join(':') + '::' + values.slice(start + length).map(x => x.toString(16)).join(':');
    assert.deepEqual(IPv6.parse(compressed).parts, values, compressed);
  }
});

test('ASCII substitutions agree with Node on strict address syntax', () => {
  for (const base of ['192.168.22.4', '2001:db8:1:2:3:4:abcd:ef01', '::ffff:192.0.2.1']) {
    for (let index = 0; index < base.length; index++) for (let code = 0; code < 128; code++) {
      if (code === 37) continue; // Scoped addresses have an explicit VPM zone grammar.
      const value = base.slice(0, index) + String.fromCharCode(code) + base.slice(index + 1);
      const actual = base.includes(':') ? IPv6.isValid(value) : IPv4.isValidFourPartDecimal(value);
      assert.equal(actual, isIP(value) !== 0, JSON.stringify(value));
    }
  }
});

test('zones preserve case and permit ASCII unreserved characters only', () => {
  for (const zone of ['1', 'en0', 'en-0.1_A~b', 'Z']) {
    const address = IPv6.parse('fe80::1%' + zone);
    assert.equal(address.zoneId, zone);
    assert.equal(address.toString(), 'fe80::1%' + zone);
    assert.equal(address.toNormalizedString(), 'fe80:0:0:0:0:0:0:1%' + zone);
    assert.equal(address.match(IPv6.parse('fe80::1%other'), 128), true);
    assert.equal(IPv6.parseCIDR('fe80::1%' + zone + '/64')[0].zoneId, zone);
  }
  for (const zone of ['', 'a/b', 'a:b', '%20', 'x y', 'é', '\n', 'x\n', '\0', null, 0]) {
    assert.throws(() => new IPv6(new Array(8).fill(0), zone), TypeError);
    if (typeof zone === 'string') assert.equal(IPv6.isValid('::1%' + zone), false);
  }
  assert.equal(IPv6.parse('::1%25en0').zoneId, '25en0'); // No URI percent decoding.
});

test('IPv4-compatible IPv6 retains its bits; only actual mapped /96 addresses convert', () => {
  for (const value of ['::192.0.2.1', '0:0:0:0:0:0:192.0.2.1', '::c000:201']) {
    const address = IPv6.parse(value);
    assert.deepEqual(address.parts, [0, 0, 0, 0, 0, 0, 0xc000, 0x201]);
    assert.equal(address.isIPv4MappedAddress(), false);
    assert.equal(ip.process(value).kind(), 'ipv6');
    assert.throws(() => address.toIPv4Address(), RangeError);
  }
  for (const value of ['::ffff:192.0.2.1', '0:0:0:0:0:ffff:c000:201', '::ffff:192.0.2.1%en0']) {
    const address = IPv6.parse(value);
    assert.equal(address.isIPv4MappedAddress(), true);
    assert.equal(address.toIPv4Address().toString(), '192.0.2.1');
    assert.equal(ip.process(value).toString(), '192.0.2.1');
    bytesEqual(address.toIPv4Address().toIPv4MappedAddress(), address);
  }
  assert.equal(IPv6.parse('::ffff:0:192.0.2.1').isIPv4MappedAddress(), false);
  assert.equal(IPv6.parse('64:ff9b::192.0.2.1').isIPv4MappedAddress(), false);
});

test('formatting uses RFC 5952 longest then leftmost zero run and no single-zero compression', () => {
  for (const [input, output] of [
    ['0:0:0:0:0:0:0:0', '::'], ['0:0:1:0:0:2:3:4', '::1:0:0:2:3:4'],
    ['1:0:0:2:0:0:0:3', '1:0:0:2::3'], ['1:2:3:4:5:6:0:0', '1:2:3:4:5:6::'],
    ['2001:DB8:0:1:2:3:4:5', '2001:db8:0:1:2:3:4:5'], ['1:2:3:4:5:6:7:8', '1:2:3:4:5:6:7:8'],
  ]) {
    const address = IPv6.parse(input);
    assert.equal(address.toString(), output);
    assert.equal(address.toRFC5952String(), output);
    assert.equal(address.toFixedLengthString(), address.parts.map(p => p.toString(16).padStart(4, '0')).join(':'));
  }
});

test('20,000 generated byte round trips agree with Node syntax and both upstream byte representations', () => {
  for (let index = 0; index < 20000; index++) {
    const length = index % 2 === 0 ? 4 : 16;
    const bytes = Array.from({ length }, () => random() & 255);
    const address = ip.fromByteArray(bytes);
    const text = address.toString();
    assert.equal(isIP(text), length === 4 ? 4 : 6, text);
    assert.deepEqual(ip.parse(text).toByteArray(), bytes);
    assert.deepEqual(current.parse(text).toByteArray(), bytes);
    assert.deepEqual(legacy.parse(text).toByteArray(), bytes);
    assert.equal(address.toString(), current.fromByteArray(bytes).toString());
  }
});

test('constructors reject coercion, fractional numbers, unsafe bytes and wrong lengths', () => {
  for (const bad of [NaN, Infinity, -Infinity, -1, 1.5, '1', undefined, null, {}, 1n]) {
    assert.throws(() => new IPv4([127, 0, 0, bad]), RangeError);
    assert.throws(() => new IPv6([0, 0, 0, 0, 0, 0, 0, bad]), RangeError);
    const bytes = new Array(16).fill(0); bytes[3] = bad;
    assert.throws(() => new IPv6(bytes), RangeError);
    assert.throws(() => ip.fromByteArray(bytes), RangeError);
  }
  assert.throws(() => new IPv4([1, 2, 3, 256]), RangeError);
  assert.throws(() => new IPv6([0, 0, 0, 0, 0, 0, 0, 65536]), RangeError);
  const bytes = new Array(16).fill(0); bytes[0] = 256;
  assert.throws(() => new IPv6(bytes), RangeError);
  assert.throws(() => ip.fromByteArray(bytes), RangeError);
  for (const input of [null, undefined, 4, '1234', () => {}]) {
    assert.throws(() => new IPv4(input), TypeError);
    assert.throws(() => new IPv6(input), TypeError);
    assert.throws(() => ip.fromByteArray(input), TypeError);
  }
  for (const length of [0, 3, 5, 7, 9, 15, 17]) {
    assert.throws(() => new IPv4(new Array(length).fill(0)), RangeError);
    assert.throws(() => new IPv6(new Array(length).fill(0)), RangeError);
    assert.throws(() => ip.fromByteArray(new Array(length).fill(0)), RangeError);
  }
});

test('constructors snapshot values and read length and elements once', () => {
  for (const [length, construct] of [[4, x => new IPv4(x)], [8, x => new IPv6(x)], [16, x => new IPv6(x)], [4, ip.fromByteArray], [16, ip.fromByteArray]]) {
    const reads = new Array(length + 1).fill(0);
    const input = { get length() { reads[length]++; return length; } };
    for (let i = 0; i < length; i++) Object.defineProperty(input, i, { get() { reads[i]++; return i; } });
    construct(input);
    assert.deepEqual(reads, new Array(length + 1).fill(1));
  }
  for (const construct of [x => new IPv6(x), ip.fromByteArray]) {
    let reads = 0;
    assert.throws(() => construct({ get length() { reads++; return undefined; } }), RangeError);
    assert.equal(reads, 1);
  }
  for (const [Class, property, values] of [[IPv4, 'octets', [1, 2, 3, 4]], [IPv6, 'parts', [0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]]]) {
    const address = new Class(values);
    const original = address.toByteArray();
    values.fill(255);
    address[property].fill(65535);
    address.toByteArray().fill(255);
    address.toJSON()[property].fill(123);
    assert.throws(() => { address[property] = []; }, TypeError);
    assert.deepEqual(address.toByteArray(), original);
    Object.freeze(address);
    assert.deepEqual(address.toByteArray(), original);
    bytesEqual(address, new Class(new (Class === IPv4 ? Uint8Array : Uint16Array)(address[property])));
  }
});

test('accessor errors propagate and validation never coerces objects', () => {
  const error = new Error('access failed');
  const input = { get length() { throw error; } };
  for (const create of [x => new IPv4(x), x => new IPv6(x), ip.fromByteArray]) assert.throws(() => create(input), e => e === error);
  const hostile = { toString() { throw error; }, valueOf() { throw error; } };
  for (const value of [undefined, null, 42, true, [], hostile, Symbol(), 1n]) {
    for (const predicate of [ip.isValid, ip.isValidCIDR, IPv4.isValid, IPv6.isValid, IPv4.isIPv4, IPv6.isIPv6, IPv4.isValidFourPartDecimal, IPv4.isValidCIDRFourPartDecimal]) assert.equal(predicate(value), false);
    for (const parse of [ip.parse, ip.parseCIDR, IPv4.parse, IPv6.parse, IPv4.parseCIDR, IPv6.parseCIDR]) assert.throws(() => parse(value), TypeError);
  }
});

test('invalid prefix numbers fail before matching or mask generation', () => {
  for (const [Class, text, max] of [[IPv4, '192.0.2.1', 32], [IPv6, '2001:db8::1', 128]]) {
    const address = Class.parse(text);
    for (const bits of [undefined, null, NaN, Infinity, -Infinity, -1, max + 1, 0.5, '0', '8', {}, [], 0n]) {
      assert.throws(() => address.match(address, bits), RangeError);
      assert.throws(() => address.match([address, bits]), RangeError);
      assert.throws(() => Class.subnetMaskFromPrefixLength(bits), RangeError);
      assert.throws(() => ip.subnetMatch(address, { bad: [address, bits] }), RangeError);
    }
    assert.equal(address.match(address, max), true);
    assert.equal(address.match(address, 0), true);
  }
  assert.throws(() => IPv4.parse('1.2.3.4').match(IPv6.parse('::'), 0), TypeError);
  assert.throws(() => IPv6.parse('::').match(IPv4.parse('1.2.3.4'), 0), TypeError);
});

test('CIDR text requires complete decimal prefix syntax and correct family bounds', () => {
  for (const [Class, value, max] of [[IPv4, '192.0.2.1', 32], [IPv6, 'fe80::1%en-0', 128]]) {
    for (const tail of ['', '-1', '+1', '1.1', '1e1', '0x10', '1x', '1\n', ' 1', '1/2', String(max + 1)]) {
      const text = value + '/' + tail;
      assert.equal(ip.isValidCIDR(text), false, text);
      assert.equal(Class.isValidCIDR(text), false, text);
      assert.throws(() => Class.parseCIDR(text), RangeError);
    }
    for (let bits = 0; bits <= max; bits++) {
      const text = value + '/' + bits;
      assert.equal(ip.isValidCIDR(text), true, text);
      const tuple = Class.parseCIDR(text);
      assert.equal(tuple[1], bits);
      assert.equal(tuple.toString(), Class.parse(value).toString() + '/' + bits);
      assert.equal(Object.keys(tuple).join(','), '0,1');
      assert.equal(tuple[0] instanceof Class, true);
    }
  }
});

test('all 162 subnet masks round trip and noncontiguous masks are rejected', () => {
  for (const [Class, max, length] of [[IPv4, 32, 4], [IPv6, 128, 16]]) {
    for (let prefix = 0; prefix <= max; prefix++) {
      const mask = Class.subnetMaskFromPrefixLength(prefix);
      const n = ((1n << BigInt(prefix)) - 1n) << BigInt(max - prefix);
      assert.deepEqual(mask.toByteArray(), bitsToBytes(n, length));
      assert.equal(mask.prefixLengthFromSubnetMask(), prefix);
      if (prefix < max - 1) {
        const invalid = ip.fromByteArray(bitsToBytes(n | 1n, length));
        assert.equal(invalid.prefixLengthFromSubnetMask(), null);
      }
    }
  }
});

test('5,000 generated subnet boundaries and matches agree with independent BigInt arithmetic', () => {
  for (let i = 0; i < 5000; i++) {
    const length = i % 2 === 0 ? 4 : 16;
    const max = length * 8;
    const Class = length === 4 ? IPv4 : IPv6;
    const a = Array.from({ length }, () => random() & 255);
    const b = Array.from({ length }, () => random() & 255);
    const bits = random() % (max + 1);
    const prefix = BigInt(max - bits);
    const first = ip.fromByteArray(a), second = ip.fromByteArray(b);
    const matches = (integer(a) >> prefix) === (integer(b) >> prefix);
    assert.equal(first.match(second, bits), matches);
    assert.equal(first.match([second, bits]), matches);
    const subnet = first.toString() + '/' + bits;
    const network = (integer(a) >> prefix) << prefix;
    assert.deepEqual(Class.networkAddressFromCIDR(subnet).toByteArray(), bitsToBytes(network, length));
    assert.deepEqual(Class.broadcastAddressFromCIDR(subnet).toByteArray(), bitsToBytes(network | ((1n << prefix) - 1n), length));
  }
});

test('range data matches 2.5.0 and cannot be changed through public snapshots', () => {
  for (const name of ['IPv4', 'IPv6']) {
    const table = ip[name].prototype.SpecialRanges;
    const before = current[name].prototype.SpecialRanges;
    assert.deepEqual(Object.keys(table), Object.keys(before));
    assert.equal(Object.isFrozen(table), true);
    assert.equal(Object.getPrototypeOf(table), null);
    for (const key of Object.keys(before)) {
      const ours = typeof table[key][1] === 'number' ? [table[key]] : table[key];
      const theirs = typeof before[key][1] === 'number' ? [before[key]] : before[key];
      assert.equal(ours.length, theirs.length);
      for (let i = 0; i < ours.length; i++) {
        const [address, bits] = ours[i];
        assert.equal(bits, theirs[i][1]);
        bytesEqual(address, theirs[i][0]);
        assert.equal(address.range(), theirs[i][0].range());
        const original = address.toString();
        (name === 'IPv4' ? address.octets : address.parts).fill(123);
        assert.equal(address.toString(), original);
        assert.equal(Object.isFrozen(address), true);
        assert.equal(Object.isFrozen(ours[i]), true);
      }
      assert.equal(Object.isFrozen(table[key]), true);
    }
  }
  for (let i = 0; i < 3000; i++) {
    const bytes = Array.from({ length: i % 2 ? 4 : 16 }, () => random() & 255);
    assert.equal(ip.fromByteArray(bytes).range(), current.fromByteArray(bytes).range());
  }
});

test('subnetMatch uses own keys, supports both families and preserves fallback sentinels', () => {
  const v4 = IPv4.parse('192.0.2.1'), v6 = IPv6.parse('2001:db8::1');
  const ranges = Object.create({ inherited: [v4, 0] });
  ranges.mixed = Object.freeze([Object.freeze(IPv4.parseCIDR('192.0.2.0/24')), Object.freeze(IPv6.parseCIDR('2001:db8::/32'))]);
  assert.equal(ip.subnetMatch(v4, ranges), 'mixed');
  assert.equal(v6.subnetMatch(ranges), 'mixed');
  for (const fallback of [false, 0, '', {}, Symbol('none')]) assert.equal(v4.subnetMatch({}, fallback), fallback);
  assert.equal(v4.subnetMatch({}, null), 'unicast');
  assert.equal(v6.subnetMatch({ v4: [v4, 0] }), 'unicast');
  assert.equal(v4.subnetMatch({ v6: [v6, 0] }), 'unicast');
  assert.equal(v4.subnetMatch(Object.create({ ignored: [v4, 0] })), 'unicast');
  const tuple = runInNewContext('[address, 32]', { address: v4 });
  assert.equal(v4.match(tuple), true);
  assert.equal(v4.subnetMatch({ foreign: tuple }), 'foreign');
  assert.throws(() => v4.subnetMatch({ bad: [v6, NaN] }), RangeError);
  for (const value of [null, 'x', { bad: 1 }, { bad: [v4] }, { bad: [[{}, 32]] }]) assert.throws(() => v4.subnetMatch(value), TypeError);
});

test('static functions work detached; subclasses cannot intercept trusted construction', () => {
  for (const [Class, value] of [[IPv4, '1.2.3.4'], [IPv6, '2001:db8::1']]) {
    const { parse, parseCIDR, networkAddressFromCIDR, broadcastAddressFromCIDR, subnetMaskFromPrefixLength } = Class;
    assert.equal(parse(value).toString(), value);
    assert.equal(parseCIDR(value + '/0')[1], 0);
    assert.equal(networkAddressFromCIDR(value + '/0').prefixLengthFromSubnetMask(), 0);
    assert.equal(broadcastAddressFromCIDR(value + '/0').prefixLengthFromSubnetMask(), Class === IPv4 ? 32 : 128);
    assert.equal(subnetMaskFromPrefixLength(0).prefixLengthFromSubnetMask(), 0);
    class Child extends Class { constructor(...args) { throw new Error('must not be called by static parser'); } }
    assert.equal(Child.parse(value) instanceof Class, true);
    assert.equal(Child.parse(value) instanceof Child, false);
  }
});

test('JSON preserves address shape, exported bindings have CJS/ESM identity', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(IPv4.parse('1.2.3.4'))), { octets: [1, 2, 3, 4] });
  assert.deepEqual(JSON.parse(JSON.stringify(IPv6.parse('::1%en0'))), { parts: [0, 0, 0, 0, 0, 0, 0, 1], zoneId: 'en0' });
  assert.equal(Object.isFrozen(ip), true);
  const esm = await import('../index.js');
  assert.equal(esm.default, ip);
  for (const key of Object.keys(ip)) assert.equal(esm[key], ip[key]);
});
