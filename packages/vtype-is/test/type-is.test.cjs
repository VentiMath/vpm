'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const typeis = require('..');
const upstream = require('./upstream.cjs');

test('ordinary header and pattern matrix preserves upstream results', () => {
  const headers = ['application/json', 'TEXT/HTML; charset=utf-8', 'application/problem+json',
    'multipart/form-data; boundary=x', 'application/x-www-form-urlencoded', 'text/plain', 'image/svg+xml',
    '', 'invalid', 'text/@bad', 'text/html, application/json'];
  const patterns = [undefined, [], ['json'], ['html', 'json'], ['text/*'], ['*/*'], ['*/json'],
    ['application/*+json'], ['+json'], ['urlencoded'], ['multipart'], ['no-such-extension']];
  for (const value of headers) for (const types of patterns) {
    assert.equal(typeis.is(value, types), upstream.is(value, types), JSON.stringify([value, types]));
    const request = { headers: { 'content-length': '1', 'content-type': value } };
    assert.equal(typeis(request, types), upstream(request, types));
    assert.equal(typeis.is(request, types), upstream.is(request, types));
    if (types) assert.equal(typeis.is(value, ...types), upstream.is(value, ...types));
  }
});

test('case-insensitive matching preserves the caller spelling for exact matches', () => {
  assert.equal(upstream.is('text/html', ['TEXT/HTML']), false);
  assert.equal(typeis.is('TeXt/HtMl', ['TEXT/HTML']), 'TEXT/HTML');
  assert.equal(typeis.match('TEXT/HTML', 'text/html'), true);
  assert.equal(typeis.match('text/html', 'TEXT/HTML'), true);
  assert.equal(typeis.is('application/problem+json', ['+JSON']), 'application/problem+json');
  assert.equal(typeis.is('multipart/form-data', ['MULTIPART']), 'MULTIPART');
  assert.equal(typeis.is('application/x-www-form-urlencoded', ['URLENCODED']), 'URLENCODED');
  assert.equal(typeis.is('text/html', ['HTML', 'TEXT/HTML']), 'HTML');
});

test('first-match, variadic, empty-list and suffix return contracts', () => {
  const req = { headers: { 'content-length': '0', 'content-type': 'text/html' } };
  assert.equal(typeis(req, 'json', 'html', 'text/*'), 'html');
  assert.equal(typeis(req, ['text/*', 'html']), 'text/html');
  assert.equal(typeis(req), 'text/html');
  assert.equal(typeis(req, []), 'text/html');
  assert.equal(typeis.is('application/vnd.foo+bar+json', '+json'), 'application/vnd.foo+bar+json');
  assert.equal(typeis.is('application/json', '+json'), false);
  assert.equal(typeis.match('application/*+json', 'application/x+json'), true);
  assert.equal(typeis.match('text/*+json', 'application/x+json'), false);
  assert.equal(typeis.match('*/json', 'application/json'), true);
});

test('body detection accepts only decimal string lengths, including zero', () => {
  for (const length of ['0', '00', '1', '001', '9007199254740993', '9'.repeat(1000)]) {
    assert.equal(typeis.hasBody({ headers: { 'content-length': length } }), true);
  }
  for (const length of ['', ' ', '-1', '+1', '0x10', '1e3', '1.0', 'Infinity', 'NaN', '1\n',
    '1\r', '１', null, undefined, 0, 1, [], ['1'], {}]) {
    assert.equal(typeis.hasBody({ headers: { 'content-length': length } }), false, String(length));
  }
  for (const length of ['', '-1', '0x10', '1e3', null, []]) {
    assert.equal(upstream.hasBody({ headers: { 'content-length': length } }), true);
  }
});

test('transfer-encoding remains a presence check, with no-body and missing-type distinguished', () => {
  assert.equal(typeis({ headers: {} }, ['json']), null);
  assert.equal(typeis({ headers: { 'content-length': '0' } }, ['json']), false);
  for (const encoding of ['chunked', '', null]) {
    assert.equal(typeis.hasBody({ headers: { 'transfer-encoding': encoding } }), true);
  }
  assert.equal(typeis.hasBody({ headers: { 'transfer-encoding': undefined } }), false);
});

test('only own lowercase Node-style headers affect body detection and matching', () => {
  const headers = Object.create({ 'content-length': '1', 'content-type': 'application/json', 'transfer-encoding': 'chunked' });
  assert.equal(typeis({ headers }, ['json']), null);
  headers['content-length'] = '1';
  assert.equal(typeis({ headers }, ['json']), false);
  headers['content-type'] = 'application/json';
  assert.equal(typeis({ headers }, ['json']), 'json');
  assert.equal(typeis({ headers: { 'Content-Length': '1', 'Content-Type': 'application/json' } }, ['json']), null);
  assert.equal(typeis.hasBody({ headers: Object.create(null) }), false);
});

test('malformed requests have explicit errors and malformed header values return false', () => {
  for (const request of [null, undefined, 1, {}, { headers: null }, { headers: [] }]) {
    assert.throws(() => typeis(request), TypeError);
    assert.throws(() => typeis.hasBody(request), TypeError);
  }
  const hostile = { toString() { throw new Error('coerced'); } };
  for (const value of [null, undefined, 1, true, [], ['text/html'], hostile, Symbol('type')]) {
    assert.equal(typeis.is(value, ['*/*']), false);
    assert.equal(typeis({ headers: { 'content-length': '1', 'content-type': value } }, ['*/*']), false);
    assert.equal(typeis.match(value, 'text/html'), false);
    assert.equal(typeis.match('*/*', value), false);
    assert.equal(typeis.normalize(value), false);
  }
  assert.equal(typeis.is('text/html', [null, 1, hostile, 'html']), 'html');
});

test('rejects non-ASCII media names before header normalization, but permits parameter text', () => {
  assert.equal(upstream.is('text/K', ['*/*']), 'text/k');
  for (const value of ['text/K', 'K/html', 'text/é', 'text/\ud800', 'text/html\n', 'text/html\u2028']) {
    assert.equal(typeis.is(value, ['*/*']), false);
    assert.equal(typeis.match('*/*', value), false);
  }
  assert.equal(typeis.is('\t TEXT/HTML \t; note="K"', ['html']), 'html');
});

test('match validates bare media names and wildcard syntax', () => {
  assert.equal(upstream.match('*/*', 'text/@bad'), true);
  for (const actual of ['', 'text', '/html', 'text/', 'text/@bad', 'text/*', ' text/html', 'text/html ',
    'text/html; charset=utf-8', 'text/' + 'x'.repeat(128)]) assert.equal(typeis.match('*/*', actual), false);
  for (const expected of ['', '/', '*', 'text/h*', 'text/html\n', 'text/**', 'text/*+', 'text/html; x=y',
    'text/' + 'x'.repeat(128), 'text/K']) assert.equal(typeis.match(expected, 'text/html'), false);
});

test('normalization preserves shortcuts, extensions and explicit pattern spelling', () => {
  for (const value of ['json', '.html', 'file.txt', 'svg', 'urlencoded', 'multipart', '+json', '*/*',
    'application/*+json', 'TEXT/HTML', 'unknown-extension', '']) {
    assert.equal(typeis.normalize(value), upstream.normalize(value));
  }
  assert.equal(typeis.normalize('MULTIPART'), 'multipart/*');
});

test('mutating caller headers or pattern arrays is observed on the next call', () => {
  const request = { headers: { 'content-length': '1', 'content-type': 'text/html' } };
  const types = ['json'];
  assert.equal(typeis(request, types), false);
  types[0] = 'html';
  assert.equal(typeis(request, types), 'html');
  request.headers['content-type'] = 'application/json';
  assert.equal(typeis(request, types), false);
  delete request.headers['content-length'];
  assert.equal(typeis(request, types), null);
});

test('generated ordinary matches agree with upstream, including uppercase caller patterns', () => {
  let seed = 67129;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const types = ['text', 'application', 'image', 'x-example'];
  const subs = ['plain', 'json', 'html', 'x+json', 'vnd.foo+bar+json', 'svg+xml'];
  for (let count = 0; count < 20000; count++) {
    const type = types[next() % types.length];
    const subtype = subs[next() % subs.length];
    const actual = type + '/' + subtype;
    const expected = [type + '/*', '*/*+json', actual, 'text/plain', '*/json'][next() % 5];
    assert.equal(typeis.match(expected, actual), upstream.match(expected, actual));
    assert.equal(typeis.match(expected.toUpperCase(), actual.toUpperCase()), upstream.match(expected, actual));
  }
});

test('CommonJS and ESM expose the same frozen function and named helpers', async () => {
  assert.equal(Object.isFrozen(typeis), true);
  const esm = await import('../index.js');
  assert.equal(esm.default, typeis);
  for (const name of ['is', 'hasBody', 'normalize', 'match']) assert.equal(esm[name], typeis[name]);
});
