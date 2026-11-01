'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = async () => (await import(path.join(__dirname, '../index.js'))).default;

test('MurmurHash2 in base 36, as Emotion computes it for ASCII', async () => {
  const hash = await load();
  assert.equal(hash('something'), 'crsxd7'); // Emotion's own test
  assert.equal(hash(''), '0');
  // Every tail length.
  assert.deepEqual(['a', 'ab', 'abc', 'abcd', 'abcde'].map(hash), ['acqbnw', '10sn731', '1pgwlfu', 'rsjkja', '1fj65kk']); // @emotion/hash 0.9.2's values
  assert.equal(require('../package.json').type, 'module');
});

test('characters beyond ASCII hash as UTF-8, so they do not collide', async () => {
  const hash = await load();
  // @emotion/hash keeps only each code unit's low byte: 中 (U+4E2D) and 伭
  // (U+4F2D) hash alike, and so do two styles differing by them.
  assert.notEqual(hash('content:"中";'), hash('content:"伭";'));
  assert.notEqual(hash('Ā'), hash('\0'));
  assert.deepEqual(['中', 'é', '😀a', '→'].map(hash), ['190d7mz', 'ilzlt2', '1mmsohe', 'pna1fv']);
  // Lone surrogates encode as their own code points.
  assert.notEqual(hash('a\ud800b'), hash('a\udc00b'));
});

test('does not need TextEncoder (jsdom test environments lack it)', async () => {
  const saved = globalThis.TextEncoder;
  globalThis.TextEncoder = undefined;
  try {
    const hash = (await import(path.join(__dirname, '../index.js') + '?no-encoder')).default;
    assert.equal(hash('中'), '190d7mz');
  } finally {
    globalThis.TextEncoder = saved;
  }
});
