'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
const vm = require('node:vm');
const cookie = require('..');
const legacy = require('./fixtures/cookie-0.7.2.cjs');
const v1 = require('./fixtures/cookie-1.1.1.cjs');
const modern = () => import('./fixtures/cookie-2.0.1.mjs');
const plain = value => ({ ...value });
const identity = value => value;

test('pinned upstream fixtures retain their provenance hashes', () => {
  for (const source of require('../PROVENANCE.json').sources) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
  }
});

test('legacy Cookie parser matches the Express baseline on ordinary and malformed headers', () => {
  for (const header of ['', 'x', 'a=', '=b', 'a=b=c', 'foo=bar; baz=qux', '  a \t=\t b \t; a=c; A=d',
    'bad; a=b; bad; c=d', '; ; bad; a=b', 'a="b c"; q=""', 'a="', 'a="b', 'a=b"',
    'a=%E9%9B%AA; b=%FF; c=%; d=%zz; e=one+two', 'a=b; a=c; constructor=x; toString=y',
    'a=b\r\n; c=d', 'a=b; no=value; trailing', 'a=b;;', 'a=b;=; a=c']) {
    assert.deepEqual(plain(cookie.parse(header)), legacy.parse(header), header);
  }
});

test('modern Cookie parser matches both modern releases', async () => {
  const upstream = await modern();
  for (const header of ['', 'x', 'a=', '=b', 'a=b=c', 'a=b; a=c; A=d', 'a="b c"', 'a="',
    'a=%E9%9B%AA; b=%FF; c=%; d=%zz', 'bad; a=b; bare; c=d', '; a=b; trailing',
    '__proto__=a; constructor=b; toString=c', 'a=b\r\n']) {
    assert.deepEqual(plain(cookie.parseCookie(header)), plain(upstream.parseCookie(header)), header);
    assert.deepEqual(plain(cookie.parseCookie(header)), plain(v1.parseCookie(header)), header);
  }
});

test('every parsed map is isolated and prototype names are ordinary cookies', () => {
  for (const parse of [cookie.parse, cookie.parseCookie]) {
    const a = parse('__proto__=first; __proto__=second; constructor=x; toString=y; hasOwnProperty=z');
    const b = parse('');
    assert.equal(Object.getPrototypeOf(a), null);
    assert.equal(Object.getPrototypeOf(b), null);
    assert.equal(a.__proto__, 'first');
    assert.equal(a.constructor, 'x');
    assert.equal(a.toString, 'y');
    assert.equal(a.hasOwnProperty, 'z');
    a.extra = 'private';
    assert.equal(b.extra, undefined);
  }
  assert.equal(Object.hasOwn(legacy.parse('__proto__=x'), '__proto__'), false);
});

test('modern result maps cannot contaminate subsequent parses through a shared prototype', async () => {
  const upstream = await modern();
  const shared = Object.getPrototypeOf(upstream.parseCookie(''));
  try {
    shared.vpmIsolationProbe = 'inherited';
    assert.equal(upstream.parseCookie('vpmIsolationProbe=actual').vpmIsolationProbe, 'inherited');
    assert.equal(cookie.parseCookie('vpmIsolationProbe=actual').vpmIsolationProbe, 'actual');
  } finally {
    delete shared.vpmIsolationProbe;
  }
});

test('custom decoder contracts distinguish modern from legacy behavior', async () => {
  const upstream = await modern();
  const options = { decode: value => value === 'skip' ? undefined : value.toUpperCase() };
  const header = 'a=skip; a=ok; b="x"';
  assert.deepEqual(plain(cookie.parse(header, options)), legacy.parse(header, options));
  assert.deepEqual(plain(cookie.parseCookie(header, options)), plain(upstream.parseCookie(header, options)));
  const error = new Error('decoder failed');
  const throwing = { decode() { throw error; } };
  assert.equal(cookie.parse('a=%20', throwing).a, '%20');
  for (const parse of [cookie.parseCookie, cookie.parseSetCookie]) assert.throws(() => parse('a=%20', throwing), err => err === error);
  for (const parse of [cookie.parse, cookie.parseCookie, cookie.parseSetCookie]) {
    assert.throws(() => parse('a=x', { decode: () => ({}) }), TypeError);
  }
});

test('parsers validate types and options even on empty inputs', () => {
  for (const parse of [cookie.parse, cookie.parseCookie, cookie.parseSetCookie]) {
    for (const value of [null, undefined, 1, {}, [], new String('a=b')]) assert.throws(() => parse(value), TypeError);
    for (const options of [false, '', 1, [], { decode: null }, { decode: false }, { decode: 1 }]) assert.throws(() => parse('', options), TypeError);
    assert.doesNotThrow(() => parse('', null));
  }
});

test('legacy serialization preserves bytes and option order used by Express', () => {
  const options = [undefined, null, {}, { path: '/', domain: '.example.com', maxAge: 12.9 },
    { maxAge: -1.2, expires: new Date('2026-01-01T00:00:00Z'), httpOnly: true, secure: true, partitioned: true, priority: 'HIGH', sameSite: 'lAx' },
    { sameSite: true }, { sameSite: false, secure: false }, { encode: identity }];
  for (const opt of options) for (const value of ['', 'abc', 'hello world', '雪', 'a/b:c=1', 'a%20b', 'a"b']) {
    let expected;
    try { expected = legacy.serialize('name', value, opt); }
    catch { assert.throws(() => cookie.serialize('name', value, opt), TypeError); continue; }
    assert.equal(cookie.serialize('name', value, opt), expected);
  }
});

test('modern serialization preserves current upstream bytes and supports request Cookie fields', async () => {
  const upstream = await modern();
  const attrs = { maxAge: 60, domain: 'example.com', path: '/', expires: new Date('2026-01-01T00:00:00Z'), httpOnly: true, secure: true, partitioned: true, priority: 'high', sameSite: 'none' };
  for (const value of ['', 'abc', 'hello world', '雪', 'a/b:c=1', 'a%20b', 'a"b', undefined, null]) {
    for (const options of [undefined, { encode: encodeURIComponent }]) {
      const input = { name: 'sid', value, ...attrs };
      assert.equal(cookie.stringifySetCookie(input, options), upstream.stringifySetCookie(input, options));
    }
  }
  const map = Object.assign(Object.create({ inherited: 'ignored' }), { a: 'a/b', b: '雪', skip: undefined });
  Object.defineProperty(map, '__proto__', { value: 'ok', enumerable: true });
  assert.equal(cookie.stringifyCookie(map), upstream.stringifyCookie(map));
  assert.equal(cookie.stringifyCookie({}), '');
  assert.equal(cookie.stringifySetCookie({ name: 'x' }), 'x=');
});

test('all ASCII octets and Unicode samples preserve baseline encoding and validation', async () => {
  const upstream = await modern();
  for (let i = 0; i < 256; i++) {
    const value = String.fromCharCode(i);
    for (const options of [undefined, { encode: identity }]) {
      for (const [ours, theirs] of [
        [() => cookie.serialize('a', value, options), () => legacy.serialize('a', value, options)],
        [() => cookie.stringifySetCookie({ name: 'a', value }, options), () => upstream.stringifySetCookie({ name: 'a', value }, options)],
        [() => cookie.stringifyCookie({ a: value }, options), () => upstream.stringifyCookie({ a: value }, options)]
      ]) {
        let expected;
        try { expected = theirs(); } catch { assert.throws(ours); continue; }
        assert.equal(ours(), expected, `octet ${i}`);
      }
    }
  }
  for (const value of ['雪', '📚', 'café', '\ud800', '\udfff']) {
    if (/^[\ud800-\udfff]$/.test(value)) assert.throws(() => cookie.serialize('x', value), URIError);
    else assert.equal(cookie.parseCookie(cookie.stringifyCookie({ x: value })).x, value);
  }
});

test('invalid names, paths, domains and encoded values cannot emit header delimiters', () => {
  for (const bad of ['x;y', 'x\r\ny', 'x\n', 'x\r', 'x\0', 'x\u007f']) {
    assert.throws(() => cookie.serialize(bad, 'x'), TypeError);
    assert.throws(() => cookie.stringifySetCookie({ name: bad, value: 'x' }), TypeError);
    assert.throws(() => cookie.serialize('x', 'y', { encode: () => bad }), TypeError);
    assert.throws(() => cookie.stringifySetCookie({ name: 'x', value: 'y' }, { encode: () => bad }), TypeError);
    assert.throws(() => cookie.serialize('x', 'y', { path: bad }), TypeError);
    assert.throws(() => cookie.serialize('x', 'y', { domain: bad }), TypeError);
  }
  for (const domain of ['-example.com', 'example-.com', 'example..com', 'example.com.', 'a'.repeat(64) + '.com', '..example.com']) {
    assert.throws(() => cookie.serialize('x', 'y', { domain }), TypeError);
  }
});

test('domain and name character boundaries match upstream for every ASCII byte', async () => {
  const upstream = await modern();
  for (let i = 0; i < 128; i++) for (const field of ['name', 'domain', 'path']) {
    const value = 'a' + String.fromCharCode(i) + 'b';
    const input = { name: 'x', value: 'y', [field]: value };
    let expected;
    try { expected = upstream.stringifySetCookie(input); } catch { assert.throws(() => cookie.stringifySetCookie(input)); continue; }
    assert.equal(cookie.stringifySetCookie(input), expected);
  }
});

test('serialization rejects coercion, invalid callbacks and nonstring encoded output', () => {
  let coercions = 0;
  const bad = { toString() { coercions++; return 'x'; } };
  for (const value of [1, false, bad, [], new String('x')]) {
    assert.throws(() => cookie.serialize(value, 'x'), TypeError);
    assert.throws(() => cookie.serialize('x', value), TypeError);
    assert.throws(() => cookie.stringifyCookie({ x: value }), TypeError);
    assert.throws(() => cookie.stringifySetCookie({ name: 'x', value }), TypeError);
    assert.throws(() => cookie.serialize('x', 'y', { encode: () => value }), TypeError);
  }
  for (const value of [null, 1, 'x', [], undefined]) {
    assert.throws(() => cookie.stringifyCookie(value), TypeError);
    assert.throws(() => cookie.stringifySetCookie(value), TypeError);
  }
  for (const options of [1, false, [], { encode: null }, { encode: false }]) assert.throws(() => cookie.serialize('x', 'y', options), TypeError);
  assert.equal(coercions, 0);
});

test('each getter is read once and emitted values are the validated snapshot', async () => {
  const upstream = await modern();
  const values = { name: 'sid', value: 'value', maxAge: 1, domain: 'example.com', path: '/', expires: new Date(0), httpOnly: true, secure: true, partitioned: true, priority: 'high', sameSite: 'lax' };
  const reads = {};
  const input = {};
  for (const [key, value] of Object.entries(values)) Object.defineProperty(input, key, { get() { reads[key] = (reads[key] || 0) + 1; return reads[key] === 1 ? value : '\r\nInjected: yes'; } });
  assert.equal(cookie.stringifySetCookie(input), upstream.stringifySetCookie(values));
  assert.deepEqual(Object.values(reads), Array(Object.keys(values).length).fill(1));
  let count = 0;
  const changing = { name: 'x', value: 'y', get path() { return ++count < 3 ? '/' : '; injected=1'; } };
  assert.match(upstream.stringifySetCookie(changing), /injected=1/);
  count = 0;
  assert.equal(cookie.stringifySetCookie(changing), 'x=y; Path=/');
  assert.equal(count, 1);
  let encodes = 0;
  assert.equal(cookie.serialize('x', 'y', { get encode() { encodes++; return identity; } }), 'x=y');
  assert.equal(encodes, 1);
});

test('expiration uses genuine Date internals, accepts other realms and rejects spoofed dates', async () => {
  const upstream = await modern();
  const fake = { valueOf: () => 0, toUTCString: () => 'bad; injected=1' };
  assert.match(upstream.stringifySetCookie({ name: 'x', value: 'y', expires: fake }), /injected=1/);
  for (const expires of [fake, null, 0, 'today', new Date(NaN)]) assert.throws(() => cookie.serialize('x', 'y', { expires }), TypeError);
  const date = new Date(0);
  date.valueOf = date.toUTCString = () => { throw new Error('must not call override'); };
  assert.equal(cookie.serialize('x', 'y', { expires: date }), 'x=y; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  const foreign = vm.runInNewContext('new Date(0)');
  assert.equal(cookie.serialize('x', 'y', { expires: foreign }), 'x=y; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
});

test('typed attributes and safe integer ages reject ambiguous values', () => {
  for (const maxAge of ['1', NaN, Infinity, -Infinity, 2 ** 53, 1n]) {
    assert.throws(() => cookie.serialize('x', 'y', { maxAge }), TypeError);
    assert.throws(() => cookie.stringifySetCookie({ name: 'x', value: 'y', maxAge }), TypeError);
  }
  assert.equal(cookie.serialize('x', 'y', { maxAge: 1.9 }), 'x=y; Max-Age=1');
  assert.throws(() => cookie.stringifySetCookie({ name: 'x', value: 'y', maxAge: 1.9 }), TypeError);
  for (const key of ['domain', 'path', 'priority', 'sameSite', 'httpOnly', 'secure', 'partitioned']) {
    assert.throws(() => cookie.serialize('x', 'y', { [key]: 1 }), TypeError);
  }
  for (const key of ['secure', 'httpOnly', 'partitioned']) assert.throws(() => cookie.serialize('x', 'y', { [key]: 'false' }), TypeError);
});

test('errors do not include cookie secrets or untrusted option values', () => {
  const secret = 'private-session-token;secret';
  for (const run of [() => cookie.stringifyCookie({ token: secret }, { encode: identity }),
    () => cookie.stringifySetCookie({ name: 'token', value: secret }, { encode: identity }),
    () => cookie.serialize('token', 'value', { path: secret })]) {
    assert.throws(run, error => error instanceof TypeError && !error.message.includes(secret));
  }
});

test('Set-Cookie parsing matches current upstream on ordinary and malformed attributes', async () => {
  const upstream = await modern();
  for (const header of ['', 'x', 'x=y', 'x=y=z; Path=/a=b', ' x = %E9%9B%AA ; Secure; HttpOnly; Partitioned',
    'x=y; SameSite=LAX; priority=HIGH; Domain=.example.com; Path=/', 'x="y"; Unknown=yes; Secure=false',
    'x=y; Max-Age=10; Max-Age=bad; Max-Age=-2', 'x=y; Max-Age=1junk; Max-Age=+2',
    'x=y; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Expires=bad', 'x=y; Path; Domain; SameSite; Priority',
    'x=y; ; secure; ;; HttpOnly; Path=/; bare; SameSite=none', 'bare; Path=/; Secure', 'a=b; a=b; Priority=HIGH; SameSite=None',
    'a=%FF; __proto__=bad; constructor=x; SameSite=invalid; Priority=invalid']) {
    assert.deepEqual(cookie.parseSetCookie(header), upstream.parseSetCookie(header), header);
  }
});

test('Set-Cookie rejects imprecise or infinite ages without discarding preceding valid attributes', async () => {
  const upstream = await modern();
  const huge = '9'.repeat(400);
  assert.equal(upstream.parseSetCookie('a=b; Max-Age=' + huge).maxAge, Infinity);
  for (const value of [huge, '9007199254740993', '1.5', '+10', '10x', '10\n']) {
    assert.equal(cookie.parseSetCookie('a=b; Max-Age=' + value).maxAge, undefined);
    assert.equal(cookie.parseSetCookie('a=b; Max-Age=5; Max-Age=' + value).maxAge, 5);
  }
  assert.equal(cookie.parseSetCookie('a=b; Max-Age=9007199254740991').maxAge, Number.MAX_SAFE_INTEGER);
});

test('generated header corpus agrees with current parsing semantics', async () => {
  const upstream = await modern();
  let seed = 123456;
  const next = n => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n);
  const fragments = ['a=b', 'foo=%20', ' x = "y" ', 'bare', 'a=c', '', 'a=b=c', '__proto__=x', 'bad=%GG', 'Secure', 'HttpOnly', 'Path=/', 'Max-Age=10', 'Domain=example.com', 'SameSite=Lax', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT'];
  for (let i = 0; i < 1500; i++) {
    const pieces = Array.from({ length: next(15) }, () => fragments[next(fragments.length)]);
    const header = pieces.join(next(2) ? ';' : '; ');
    assert.deepEqual(plain(cookie.parseCookie(header)), plain(upstream.parseCookie(header)), header);
    assert.deepEqual(cookie.parseSetCookie(header), upstream.parseSetCookie(header), header);
  }
});

test('long headers, duplicate runs and percent-encoded Unicode round-trip', () => {
  const input = Object.create(null);
  for (let i = 0; i < 1000; i++) input['cookie' + i] = '雪' + i;
  assert.deepEqual(cookie.parseCookie(cookie.stringifyCookie(input)), input);
  const duplicates = 'a=first;' + 'a=other;'.repeat(10000) + 'z=last';
  assert.deepEqual(plain(cookie.parseCookie(duplicates)), { a: 'first', z: 'last' });
  assert.equal(cookie.parseCookie('bare;'.repeat(10000) + 'a=b').a, 'b');
});

test('CommonJS and native ESM expose all six functions', async () => {
  const esm = await import('../index.js');
  for (const name of ['parse', 'serialize', 'parseCookie', 'stringifyCookie', 'parseSetCookie', 'stringifySetCookie']) assert.equal(esm[name], cookie[name]);
  assert.equal(esm.default, cookie);
  assert.equal(Object.isFrozen(cookie), true);
});
