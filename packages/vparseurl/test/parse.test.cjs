'use strict';

const assert = require('node:assert/strict');
const { IncomingMessage } = require('node:http');
const { Socket } = require('node:net');
const { format, Url } = require('node:url');
const test = require('node:test');
const parseurl = require('..');
const upstream = require('./fixtures/parseurl-1.3.3.cjs');

test('parses paths into mutable legacy URL objects', () => {
  const parsed = parseurl({ url: '/foo/bar' });
  assert.ok(parsed instanceof Url);
  assert.equal(parsed.pathname, '/foo/bar');
  assert.equal(parsed.path, '/foo/bar');
  assert.equal(parsed.href, '/foo/bar');
  assert.equal(parsed._raw, '/foo/bar');
  for (const field of ['auth', 'hash', 'host', 'hostname', 'port', 'protocol', 'query', 'search', 'slashes']) {
    assert.equal(parsed[field], null, field);
  }
  assert.equal(format(parsed), '/foo/bar');
});

test('splits only the first question mark and keeps an undecoded query', () => {
  const parsed = parseurl({ url: '/a%2Fb?q=%2F+?&q=two' });
  assert.equal(parsed.pathname, '/a%2Fb');
  assert.equal(parsed.query, 'q=%2F+?&q=two');
  assert.equal(parsed.search, '?q=%2F+?&q=two');
});

test('distinguishes an empty query from an absent query', () => {
  assert.equal(parseurl({ url: '/' }).query, null);
  const parsed = parseurl({ url: '/?' });
  assert.equal(parsed.pathname, '/');
  assert.equal(parsed.query, '');
  assert.equal(parsed.search, '?');
});

test('preserves double slashes and auth-looking request paths', () => {
  const parsed = parseurl({ url: '//todo@txt/path?x=1' });
  assert.equal(parsed.pathname, '//todo@txt/path');
  assert.equal(parsed.host, null);
  assert.equal(parsed.auth, null);
});

test('preserves encoded slashes and dot segments used by routing', () => {
  const raw = '/a/../b/%2e%2e/%2f/%5c';
  assert.equal(parseurl({ url: raw }).pathname, raw);
});

test('uses the runtime legacy parser for absolute URLs and fragments', () => {
  for (const raw of ['http://localhost:8888/foo?x=1#part', '/foo#part', 'https://[::1]:8080/a', '?x=1', '*', '']) {
    assert.deepEqual(parseurl({ url: raw }), upstream({ url: raw }));
  }
});

test('returns undefined for a missing current URL', () => {
  assert.equal(parseurl({}), undefined);
  assert.equal(parseurl({ url: undefined }), undefined);
});

test('rejects non-string current URLs without coercing objects', () => {
  for (const url of [null, 0, false, {}, [], new Url(), new String('/path')]) {
    assert.throws(() => parseurl({ url }), TypeError);
  }
});

test('reuses a parsed object until the current URL changes', () => {
  const request = { url: '/first' };
  const first = parseurl(request);
  first.marker = 'retained';
  assert.equal(parseurl(request), first);
  request.url = '/second';
  const second = parseurl(request);
  assert.notEqual(second, first);
  assert.equal(second.pathname, '/second');
  assert.equal(second.marker, undefined);
  request.url = '/first';
  assert.notEqual(parseurl(request), first);
});

test('cache keys use the input even when the parser normalizes href', () => {
  const request = { url: '/path ' };
  const parsed = parseurl(request);
  assert.equal(parsed.href, '/path');
  assert.equal(parseurl(request), parsed);
});

test('caches belong to individual request objects', () => {
  assert.notEqual(parseurl({ url: '/same' }), parseurl({ url: '/same' }));
});

test('parses originalUrl and maintains separate current and original caches', () => {
  const request = { url: '/item', originalUrl: '/mount/item' };
  const current = parseurl(request);
  const original = parseurl.original(request);
  assert.equal(original.pathname, '/mount/item');
  assert.equal(parseurl.original(request), original);
  request.url = '/rewritten';
  assert.equal(parseurl.original(request), original);
  assert.notEqual(parseurl(request), current);
  request.originalUrl = '/another/item';
  assert.notEqual(parseurl.original(request), original);
});

test('keeps original and current results separate even for equal strings', () => {
  const request = { url: '/same', originalUrl: '/same' };
  assert.notEqual(parseurl(request), parseurl.original(request));
});

test('original falls back to the current cache for every non-string originalUrl', () => {
  for (const originalUrl of [undefined, null, false, 1, {}, []]) {
    const request = { url: '/fallback', originalUrl };
    assert.equal(parseurl.original(request), parseurl(request));
  }
  assert.equal(parseurl.original({}), undefined);
  assert.equal(parseurl.original({ originalUrl: '/original' }).pathname, '/original');
  assert.equal(parseurl.original({ url: '/fallback', originalUrl: '' }).href, '');
});

test('works on frozen and sealed requests without adding properties', () => {
  for (const freeze of [Object.freeze, Object.seal, Object.preventExtensions]) {
    const request = freeze({ url: '/current', originalUrl: '/original' });
    const before = Object.getOwnPropertyDescriptors(request);
    assert.equal(parseurl(request).pathname, '/current');
    assert.equal(parseurl.original(request).pathname, '/original');
    assert.deepEqual(Object.getOwnPropertyDescriptors(request), before);
  }
  assert.throws(() => upstream(Object.freeze({ url: '/current' })), TypeError);
});

test('ignores unrelated private caches including matching forged entries', () => {
  const forged = new Url();
  Object.assign(forged, { _raw: '/expected', pathname: '/wrong' });
  const request = { url: '/expected', originalUrl: '/expected', _parsedUrl: forged, _parsedOriginalUrl: forged };
  assert.equal(upstream(request).pathname, '/wrong');
  assert.equal(parseurl(request).pathname, '/expected');
  assert.equal(parseurl.original(request).pathname, '/expected');
  assert.equal(request._parsedUrl, forged);
  assert.equal(request._parsedOriginalUrl, forged);
});

test('does not touch private cache getters or setters owned by other middleware', () => {
  const request = { url: '/current', originalUrl: '/original' };
  for (const property of ['_parsedUrl', '_parsedOriginalUrl']) {
    Object.defineProperty(request, property, {
      get() { throw new Error('private property read'); },
      set() { throw new Error('private property written'); },
    });
  }
  assert.equal(parseurl(request).pathname, '/current');
  assert.equal(parseurl.original(request).pathname, '/original');
});

test('mutating _raw cannot trick the cache into accepting a different input', () => {
  const request = { url: '/first' };
  const parsed = parseurl(request);
  parsed._raw = '/second';
  request.url = '/second';
  assert.equal(parseurl(request).pathname, '/second');
  assert.notEqual(parseurl(request), parsed);
});

test('retains mutable results for serve-static-style redirect formatting', () => {
  const request = { originalUrl: '/directory?next=%2Fhome' };
  const parsed = parseurl.original(request);
  parsed.path = null;
  parsed.pathname += '/';
  assert.equal(format(parsed), '/directory/?next=%2Fhome');
  assert.equal(parseurl.original(request), parsed);
});

test('clear discards both caches without changing the request or earlier results', () => {
  const request = Object.freeze({ url: '/current', originalUrl: '/original' });
  const current = parseurl(request);
  const original = parseurl.original(request);
  original.pathname = '/modified';
  parseurl.clear(request);
  parseurl.clear(request);
  assert.notEqual(parseurl(request), current);
  assert.notEqual(parseurl.original(request), original);
  assert.equal(parseurl.original(request).pathname, '/original');
  assert.equal(original.pathname, '/modified');
});

test('missing inputs release their previous cached results', () => {
  const request = { url: '/current', originalUrl: '/original' };
  const current = parseurl(request);
  const original = parseurl.original(request);
  delete request.url;
  delete request.originalUrl;
  assert.equal(parseurl(request), undefined);
  assert.equal(parseurl.original(request), undefined);
  request.url = '/current';
  request.originalUrl = '/original';
  assert.notEqual(parseurl(request), current);
  assert.notEqual(parseurl.original(request), original);
});

test('recovers after an invalid URL without returning an older cached parse', () => {
  const request = { url: '/before' };
  parseurl(request);
  request.url = 'http://[invalid';
  assert.throws(() => parseurl(request));
  request.url = '/after';
  assert.equal(parseurl(request).pathname, '/after');
});

test('supports real IncomingMessage instances and middleware URL rewrites', () => {
  const request = new IncomingMessage(new Socket());
  request.url = '/mount/item?q=1';
  request.originalUrl = request.url;
  const original = parseurl.original(request);
  assert.equal(parseurl(request).pathname, '/mount/item');
  request.url = '/item?q=1';
  assert.equal(parseurl(request).pathname, '/item');
  assert.equal(parseurl(request).query, 'q=1');
  assert.equal(parseurl.original(request), original);
  request.socket.destroy();
});

function outcome(parser, raw, original) {
  try {
    const parsed = original ? parser.original({ originalUrl: raw }) : parser({ url: raw });
    return { parsed };
  } catch (error) {
    return { error: error.name };
  }
}

test('matches parseurl 1.3.3 across routing edge cases and character boundaries', () => {
  const inputs = [
    '/', '/?', '/??', '/a?x=?y', '//host/path', '//user:pass@host/path',
    '/a/../b', '/%2F/%5c/%00/%', '/a\\b?q=\\', '/é/你好/😀?q=é',
    '/a#fragment', '/a?b#fragment', '/a b', ' /a ', '?query', '#hash', '', '*',
    'http://example.com/a?x=1', 'https://user:pass@example.com:443/a',
    'http://[::1]:8080/a', 'http://[bad', 'http://%zz@example.com/',
    'mailto:name@example.com', 'relative/path', 'http://例え.テスト/path',
  ];
  for (let code = 0; code <= 255; code++) {
    inputs.push(`/a${String.fromCharCode(code)}b?x=1`, `/a?x=${String.fromCharCode(code)}b`);
  }
  for (const code of [0x1680, 0x2000, 0x200b, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xd800, 0xdc00, 0xfeff]) {
    inputs.push(`/a${String.fromCharCode(code)}b?x=1`);
  }
  for (const raw of inputs) {
    for (const original of [false, true]) {
      assert.deepEqual(outcome(parseurl, raw, original), outcome(upstream, raw, original), JSON.stringify(raw));
    }
  }
});

test('matches parseurl 1.3.3 for a deterministic generated input corpus', () => {
  let seed = 0x12345678;
  function random(max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  }
  const pieces = ['a', '/', '?', '#', '%2F', '%', '\\', ' ', '\t', '\r', '\n', '@', ':', '[', ']', '=', '&', '+', 'é', '😀', '\u00a0', '\ufeff'];
  const prefixes = ['/', '//', '', 'https://example.com/', 'http://'];
  for (let i = 0; i < 2000; i++) {
    let raw = prefixes[random(prefixes.length)];
    const length = random(24);
    for (let j = 0; j < length; j++) raw += pieces[random(pieces.length)];
    assert.deepEqual(outcome(parseurl, raw, false), outcome(upstream, raw, false), JSON.stringify(raw));
  }
});
