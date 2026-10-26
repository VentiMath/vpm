'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fresh = require('..');
const upstream = require('./fixtures/fresh-2.0.0.cjs');
const early = 'Wed, 21 Oct 2015 07:28:00 GMT';
const late = 'Thu, 22 Oct 2015 07:28:00 GMT';

test('matches upstream ordinary ETag, date, and cache-control combinations', () => {
  for (const noneMatch of [undefined, '', '*', '"a"', 'W/"a"', '"b", "a"', '"b"']) {
    for (const etag of [undefined, '"a"', 'W/"a"', '"c"']) {
      for (const modified of [undefined, early, late, 'bad date']) {
        for (const cache of [undefined, 'no-cache', 'max-age=0', 'public, no-cache']) {
          const req = { 'if-none-match': noneMatch, 'if-modified-since': modified, 'cache-control': cache };
          const res = { etag, 'last-modified': late };
          assert.equal(fresh(req, res), upstream(req, res));
        }
      }
    }
  }
});

test('If-None-Match takes precedence over dates, including a nonmatch', () => {
  assert.equal(fresh({ 'if-none-match': '"a"', 'if-modified-since': early }, { etag: '"a"', 'last-modified': late }), true);
  assert.equal(fresh({ 'if-none-match': '"b"', 'if-modified-since': late }, { etag: '"a"', 'last-modified': early }), false);
});

test('parses quoted commas, backslashes, tabs, empty tags, and weak validators', () => {
  for (const tag of ['"a,b"', '"a\\b"', '""', '"\u00ff"']) {
    assert.equal(fresh({ 'if-none-match': '\t "other",\tW/' + tag + '\t' }, { etag: tag }), true);
    assert.equal(fresh({ 'if-none-match': tag }, { etag: 'W/' + tag }), true);
  }
  assert.equal(fresh({ 'if-none-match': ' , , "a",, ' }, { etag: '"a"' }), true);
  assert.equal(fresh({ 'if-none-match': '\t* ' }, {}), true);
});

test('does not accept malformed entity tags or ignore a malformed trailing member', () => {
  for (const value of ['a', 'w/"a"', '"a', '"a"junk', '"a" "b"', '"a",bad', '*,"a"', '"a b"', '"a\nb"', '"\u0100"', '*\n']) {
    assert.equal(fresh({ 'if-none-match': value }, { etag: '"a"' }), false, value);
    assert.equal(fresh({ 'if-none-match': value }, { etag: value }), false, value);
  }
});

test('honors case-insensitive no-cache directives outside quoted extension values', () => {
  for (const cache of ['NO-CACHE', 'public, No-Cache', 'no-cache="ETag"', 'private="a,b",\tNO-CACHE', 'NO-CACHE = "x"']) {
    assert.equal(fresh({ 'if-none-match': '*', 'cache-control': cache }, {}), false, cache);
  }
  for (const cache of ['x="a,no-cache"', 'x="a,\\\"no-cache,b"', 'x-no-cache', 'no-cachex', 'max-age=0']) {
    assert.equal(fresh({ 'if-none-match': '*', 'cache-control': cache }, {}), true, cache);
  }
});

test('accepts repeated tag/cache-control fields supplied as string arrays', () => {
  assert.equal(fresh({ 'if-none-match': ['"a"', 'W/"b,c"'] }, { etag: '"b,c"' }), true);
  assert.equal(fresh({ 'if-none-match': ['"a"'], 'cache-control': ['max-age=0', 'NO-CACHE'] }, { etag: '"a"' }), false);
});

test('invalid types and dates are stale and do not override tag precedence', () => {
  for (const value of [0, 123, null, {}, ['"a"', 1]]) {
    assert.equal(fresh({ 'if-none-match': value, 'if-modified-since': late }, { etag: '"a"', 'last-modified': early }), false);
  }
  for (const date of ['invalid', '', undefined, 1, [early]]) {
    assert.equal(fresh({ 'if-modified-since': date }, { 'last-modified': early }), false);
    assert.equal(fresh({ 'if-modified-since': late }, { 'last-modified': date }), false);
  }
  assert.equal(fresh({}, {}), false);
});

test('matches an independent model for 2000 generated valid tag lists', () => {
  let seed = 123456;
  function next(n) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; }
  const chars = ['a', 'b', ',', '\\', '!', '\u00ff'];
  for (let round = 0; round < 2000; round++) {
    const tokens = [];
    for (let count = next(5) + 1; count > 0; count--) {
      let text = ''; for (let i = next(8); i > 0; i--) text += chars[next(chars.length)];
      tokens.push((next(2) ? 'W/' : '') + '"' + text + '"');
    }
    const target = next(2) ? tokens[next(tokens.length)] : '"absent"';
    const opaque = value => value.startsWith('W/') ? value.slice(2) : value;
    assert.equal(fresh({ 'if-none-match': tokens.join(',\t') }, { etag: target }), tokens.some(tag => opaque(tag) === opaque(target)));
  }
});
