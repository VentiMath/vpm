'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const signature = require('..');
const upstream = require('./fixtures/cookie-signature-1.2.2.cjs');
const secret = 'test-only-secret';

test('fixture matches the verified upstream source hash', () => {
  const source = require('../PROVENANCE.json').sources[0];
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
});

test('RFC 4231 HMAC-SHA256 known-answer vector retains the cookie wire format', () => {
  const expected = 'Hi There.' + Buffer.from('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7', 'hex').toString('base64').slice(0, -1);
  assert.equal(signature.sign('Hi There', Buffer.alloc(20, 0x0b)), expected);
  assert.equal(signature.unsign(expected, Buffer.alloc(20, 0x0b)), 'Hi There');
});

test('sign and unsign interoperate with upstream for empty, dotted, Unicode and binary text', () => {
  for (const value of ['', 'a', 'a.b.c', '.', '雪📚', 'café', '\ud800', '\udfff', '\0\r\n', 'x'.repeat(65536), String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i))]) {
    const signed = signature.sign(value, secret);
    assert.equal(signed, upstream.sign(value, secret));
    assert.equal(signature.unsign(signed, secret), value);
    assert.equal(upstream.unsign(signed, secret), value);
    assert.equal(signature.unsign(signed, 'wrong-key'), false);
  }
});

test('string and native binary key forms preserve offsets and are not mutated', () => {
  const buffer = Buffer.from('prefix-secret-suffix');
  const view = buffer.subarray(7, 13);
  const typed = new Uint8Array(buffer.buffer, buffer.byteOffset + 7, 6);
  const dataView = new DataView(buffer.buffer, buffer.byteOffset + 7, 6);
  const ab = new Uint8Array([1, 2, 3]).buffer;
  const sab = new SharedArrayBuffer(3); new Uint8Array(sab).set([1, 2, 3]);
  const keyObject = crypto.createSecretKey(view);
  const before = Buffer.from(buffer);
  for (const key of ['', 'secret', '雪', view, typed, dataView, ab, sab, keyObject, new Int16Array([1, 2]), new BigInt64Array([1n, 2n])]) {
    assert.equal(signature.sign('value', key), upstream.sign('value', key));
    assert.equal(signature.unsign(signature.sign('value', key), key), 'value');
  }
  assert.equal(signature.sign('value', 'secret'), signature.sign('value', typed));
  assert.deepEqual(buffer, before);
});

test('native CryptoKey and cross-realm byte arrays are accepted', async () => {
  for (const extractable of [true, false]) {
    const key = await crypto.webcrypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, extractable, ['sign', 'verify']);
    const signed = signature.sign('value', key);
    assert.equal(signed, upstream.sign('value', key));
    assert.equal(signature.unsign(signed, key), 'value');
  }
  const foreign = vm.runInNewContext('new Uint8Array([1, 2, 3])');
  assert.equal(signature.sign('value', foreign), upstream.sign('value', foreign));
});

test('malformed layouts, alphabet variants and added padding are rejected', () => {
  const signed = signature.sign('value', secret);
  const tail = signed.slice(-43);
  for (const input of ['', 'value', '.', 'value.', signed + '=', signed + '\n', signed + 'x', signed.slice(1),
    'value.' + tail.slice(1), 'value.' + tail + tail, 'value.' + tail.slice(0, 10) + '.' + tail.slice(11),
    'value.' + tail.slice(0, 10) + ' ' + tail.slice(11), 'value.' + tail.slice(0, 10) + '雪' + tail.slice(11)]) {
    assert.equal(signature.unsign(input, secret), false, JSON.stringify(input));
    assert.equal(upstream.unsign(input, secret), false);
  }
  const unicodeAlias = String.fromCharCode(tail.charCodeAt(0) + 256) + tail.slice(1);
  assert.deepEqual(Buffer.from(unicodeAlias, 'latin1'), Buffer.from(tail));
  assert.equal(signature.unsign('value.' + unicodeAlias, secret), false);
  assert.equal(upstream.unsign('value.' + unicodeAlias, secret), false);
  // Find a standard-base64 signature that has both non-URL-safe characters.
  let withSymbols;
  for (let i = 0; i < 1000; i++) {
    const candidate = signature.sign(String(i), secret);
    if (candidate.includes('+') && candidate.includes('/')) { withSymbols = candidate; break; }
  }
  assert.ok(withSymbols);
  assert.equal(signature.unsign(withSymbols.replaceAll('+', '-').replaceAll('/', '_'), secret), false);
});

test('nonzero base64 padding bits are rejected even when permissive decoding gives identical bytes', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const signed = signature.sign('value', secret);
  const last = alphabet.indexOf(signed.at(-1));
  assert.equal(last % 4, 0);
  for (let bits = 1; bits <= 3; bits++) {
    const alias = signed.slice(0, -1) + alphabet[last + bits];
    assert.deepEqual(Buffer.from(alias.slice(-43), 'base64'), Buffer.from(signed.slice(-43), 'base64'));
    assert.equal(signature.unsign(alias, secret), false);
    assert.equal(upstream.unsign(alias, secret), false);
  }
});

test('every signature position and payload tampering fails verification', () => {
  const signed = signature.sign('value', secret);
  for (let i = signed.length - 43; i < signed.length; i++) {
    const tampered = signed.slice(0, i) + (signed[i] === 'A' ? 'B' : 'A') + signed.slice(i + 1);
    assert.equal(signature.unsign(tampered, secret), false);
  }
  assert.equal(signature.unsign('VALUE' + signed.slice(5), secret), false);
});

test('invalid input types and missing/invalid keys throw even for malformed signed input', () => {
  for (const fn of [signature.sign, signature.unsign]) {
    for (const value of [null, undefined, 1, {}, [], new String('value')]) assert.throws(() => fn(value, secret), TypeError);
    for (const key of [null, undefined, 1, true, {}, [], { type: 'secret', equals() { return true; } }]) assert.throws(() => fn('malformed', key), TypeError);
  }
  const { publicKey } = crypto.generateKeyPairSync('ed25519');
  assert.throws(() => signature.sign('value', publicKey), TypeError);
  assert.throws(() => signature.unsign('malformed', publicKey), TypeError);
});

test('all canonical signatures compare fixed-size signatures through native timingSafeEqual', () => {
  const calls = [];
  const exports = {};
  const context = { exports, require(name) {
    if (name === 'node:crypto') return { createHmac: crypto.createHmac, timingSafeEqual(a, b) {
      calls.push([a.length, b.length]); return crypto.timingSafeEqual(a, b);
    } };
    return require(name);
  } };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8'), context);
  const value = 'x'.repeat(100000);
  const signed = exports.sign(value, secret);
  assert.equal(exports.unsign(signed, secret), value);
  assert.equal(exports.unsign(signed, 'wrong'), false);
  assert.equal(exports.unsign('invalid', secret), false);
  assert.deepEqual(calls, [[43, 43], [43, 43]]);
});

test('deterministic generated values retain upstream signatures and verification results', () => {
  let seed = 92468;
  const next = n => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n);
  const chars = ['a', '.', '%', '+', '/', '\0', '雪', '📚', '\ud800'];
  for (let i = 0; i < 1000; i++) {
    const value = Array.from({ length: next(100) }, () => chars[next(chars.length)]).join('');
    const key = Buffer.from([next(256), next(256), next(256)]);
    const signed = upstream.sign(value, key);
    assert.equal(signature.sign(value, key), signed);
    assert.equal(signature.unsign(signed, key), upstream.unsign(signed, key));
    const bad = signed.slice(0, -1) + (signed.at(-1) === 'A' ? 'E' : 'A');
    assert.equal(signature.unsign(bad, key), upstream.unsign(bad, key));
  }
});

test('CJS and ESM expose the same immutable functions', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.sign, signature.sign); assert.equal(esm.unsign, signature.unsign);
  assert.equal(esm.default, signature); assert.equal(Object.isFrozen(signature), true);
});
