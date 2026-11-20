'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const own = require('..');
const control = require('../../../scripts/base64-js-conformance/node_modules/base64-js');

test('padded, URL-safe and mixed alphabets, byte slices and chunk boundaries', () => {
  const lengths = [...Array.from({length: 300}, (_, i) => i), 6143, 6144, 6145, 16500, 100001];
  for (const length of lengths) {
    const backing = Uint8Array.from({length: length + 6}, (_, i) => (i * 47 + length) % 256);
    const bytes = backing.subarray(3, 3 + length);
    const encoded = control.fromByteArray(bytes);
    assert.equal(own.fromByteArray(bytes), encoded);
    for (const text of [encoded, encoded.replaceAll('+', '-').replaceAll('/', '_')]) {
      assert.equal(own.byteLength(text), length);
      assert.deepEqual(own.toByteArray(text), bytes);
    }
  }
});
test('direct callers see the same results and exceptions on malformed input', () => {
  const alphabet = '=AZaz09+/-_ ?中';
  let state = 19517;
  const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
  for (let i = 0; i < 5000; i++) {
    const text = Array.from({length: next() % 31}, () => alphabet[next() % alphabet.length]).join('');
    for (const method of ['byteLength', 'toByteArray']) {
      let expected;
      try { expected = control[method](text); }
      catch (e) { assert.throws(() => own[method](text), e.constructor); continue; }
      assert.deepEqual(own[method](text), expected, text);
    }
  }
});
