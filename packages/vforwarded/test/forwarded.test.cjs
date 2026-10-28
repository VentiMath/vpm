'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
const forwarded = require('..');
const upstream = require('./fixtures/forwarded-0.2.0.cjs');
const request = header => ({ headers: header === undefined ? {} : { 'x-forwarded-for': header }, socket: { remoteAddress: '127.0.0.1' } });
const reference = header => ['127.0.0.1', ...header.split(',').map(value => value.replace(/^[ \t]+|[ \t]+$/g, '')).filter(Boolean).reverse()];

test('upstream fixture matches the verified registry source', () => {
  for (const source of require('../PROVENANCE.json').sources) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
  }
});

test('socket address comes first, with header addresses in reverse order', () => {
  for (const header of [undefined, '', '198.51.100.1', '198.51.100.1, 10.0.0.1', '2001:db8::1, ::ffff:192.0.2.1, 10.0.0.1']) {
    assert.deepEqual(forwarded(request(header)), upstream(request(header)));
  }
  assert.deepEqual(forwarded(request('198.51.100.1, 10.0.0.1')), ['127.0.0.1', '10.0.0.1', '198.51.100.1']);
});

test('empty entries and ASCII space padding retain upstream behavior', () => {
  for (const header of [' ', ',,,', ' , , ', ',10.0.0.1,,', ' 198.51.100.1 ,  , 10.0.0.1 ', 'a b, c d']) {
    assert.deepEqual(forwarded(request(header)), upstream(request(header)));
  }
});

test('HTTP tab whitespace is trimmed and whitespace-only entries are skipped', () => {
  for (const header of ['\t', '\t, \t ,\t', '\t198.51.100.1\t,\t10.0.0.1\t', ' \t a \t,\t, \t b \t ']) {
    assert.deepEqual(forwarded(request(header)), reference(header));
    assert.notDeepEqual(forwarded(request(header)), upstream(request(header)));
  }
});

test('tokens stay opaque: no IP validation, decoding, Unicode trimming, or deduplication', () => {
  const tokens = ['unknown', 'UNKNOWN', '_hidden', 'host:80', '[::1]:80', '::ffff:127.0.0.1', '999.999.1.1', 'a\tb', '\u00a0x\u00a0', '\rx\n', 'a%2Cb', 'repeat', 'repeat', '"value"'];
  assert.deepEqual(forwarded(request(tokens.join(', '))), ['127.0.0.1', ...tokens.reverse()]);
});

test('socket takes precedence and legacy connection is read only when needed', () => {
  const req = request('198.51.100.1');
  Object.defineProperty(req, 'connection', { get() { throw new Error('must not read legacy connection'); } });
  assert.deepEqual(forwarded(req), ['127.0.0.1', '198.51.100.1']);
  for (const socket of [undefined, null]) {
    assert.deepEqual(forwarded({ headers: {}, socket, connection: { remoteAddress: '::1' } }), ['::1']);
  }
});

test('an unavailable socket address remains undefined without losing header entries', () => {
  const req = { headers: { 'x-forwarded-for': '198.51.100.1' }, socket: {}, connection: { remoteAddress: 'ignored' } };
  assert.deepEqual(forwarded(req), [undefined, '198.51.100.1']);
});

test('request fields are snapshotted once, including a changing socket getter', () => {
  const reads = [];
  const req = {
    get headers() { reads.push('headers'); return { get 'x-forwarded-for'() { reads.push('header'); return '198.51.100.1'; } }; },
    get socket() { reads.push('socket'); return reads.filter(key => key === 'socket').length === 1 ? { get remoteAddress() { reads.push('address'); return '::1'; } } : null; },
  };
  assert.deepEqual(forwarded(req), ['::1', '198.51.100.1']);
  assert.deepEqual(reads, ['headers', 'header', 'socket', 'address']);
  let connectionReads = 0;
  assert.deepEqual(forwarded({ headers: {}, get connection() { connectionReads++; return { remoteAddress: '::1' }; } }), ['::1']);
  assert.equal(connectionReads, 1);
});

test('inherited header values and getters cannot supply a forwarded chain', () => {
  const headers = Object.create({ get 'x-forwarded-for'() { throw new Error('inherited header'); } });
  assert.deepEqual(forwarded({ headers, socket: { remoteAddress: '::1' } }), ['::1']);
  Object.defineProperty(headers, 'x-forwarded-for', { value: '198.51.100.1' });
  assert.deepEqual(forwarded({ headers, socket: { remoteAddress: '::1' } }), ['::1', '198.51.100.1']);
});

test('lowercase incoming headers are used; Forwarded and mixed-case keys are separate fields', () => {
  assert.deepEqual(forwarded({ headers: { Forwarded: 'for=198.51.100.1', 'X-Forwarded-For': '198.51.100.2' }, socket: {} }), [undefined]);
});

test('invalid request shapes and header types fail without value coercion', () => {
  for (const req of [undefined, null, 1, '', true, Symbol(), {}, { headers: null }, { headers: 'x' }, { headers: {}, socket: null }, { headers: {}, socket: false }]) assert.throws(() => forwarded(req), TypeError);
  let coercions = 0;
  for (const header of [null, false, 0, NaN, [], ['::1'], {}, new String('::1'), { toString() { coercions++; return '::1'; } }]) {
    assert.throws(() => forwarded(request(header)), { name: 'TypeError', message: 'x-forwarded-for must be a string' });
  }
  assert.equal(coercions, 0);
  for (const remoteAddress of [null, false, 123, {}, []]) assert.throws(() => forwarded({ headers: {}, socket: { remoteAddress } }), TypeError);
});

test('getters and proxy traps propagate their original errors', () => {
  const error = new Error('original');
  for (const req of [
    { get headers() { throw error; } },
    { headers: { get 'x-forwarded-for'() { throw error; } } },
    { headers: {}, get socket() { throw error; } },
    { headers: {}, socket: { get remoteAddress() { throw error; } } },
    { headers: new Proxy({}, { getOwnPropertyDescriptor() { throw error; } }) },
  ]) assert.throws(() => forwarded(req), e => e === error);
});

test('frozen requests work and each call returns an independent mutable array', () => {
  const req = Object.freeze({ headers: Object.freeze({ 'x-forwarded-for': '198.51.100.1' }), socket: Object.freeze({ remoteAddress: '::1' }) });
  const first = forwarded(req); first.reverse(); first.push('extra');
  assert.deepEqual(forwarded(req), ['::1', '198.51.100.1']);
});

test('long fields and long chains agree with an independent reference parser', () => {
  for (const header of ['x'.repeat(65536), ' \t'.repeat(32768), Array.from({ length: 4096 }, (_, i) => ' \t192.0.2.' + (i % 256) + '\t ').join(',')]) {
    assert.deepEqual(forwarded(request(header)), reference(header));
  }
});

test('10,000 generated headers agree with upstream or the whitespace reference', () => {
  let seed = 0x12345678;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const tokens = ['', '198.51.100.1', '::1', 'a b', 'unknown', '_hidden', '\u00a0', 'a%2Cb'];
  for (let i = 0; i < 10000; i++) {
    const tabbed = i % 2 === 0;
    const pad = tabbed ? [' ', '\t', ' \t', ''] : ['', ' ', '  '];
    const header = Array.from({ length: random(12) }, () => pad[random(pad.length)] + tokens[random(tokens.length)] + pad[random(pad.length)]).join(',');
    assert.deepEqual(forwarded(request(header)), reference(header));
    if (!tabbed) assert.deepEqual(forwarded(request(header)), upstream(request(header)));
  }
});

test('CJS and ESM expose the same frozen callable export', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.default, forwarded);
  assert.equal(Object.isFrozen(forwarded), true);
});
