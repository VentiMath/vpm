'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const media = require('..');
const upstream = require('./fixtures/media-typer-1.1.1.cjs');

test('ordinary parsed fields and formatting agree with the pinned consumer baseline', () => {
  for (const value of ['text/html', 'APPLICATION/JSON', ' application/vnd.example+json ', 'image/svg+xml',
    'x-test/0!#$&^_.-', 'a'.repeat(127) + '/' + 'b'.repeat(127)]) {
    assert.equal(media.test(value), upstream.test(value));
    assert.deepEqual(media.parse(value), { ...upstream.parse(value) });
    assert.equal(media.format(media.parse(value)), value.trim().toLowerCase());
  }
  assert.equal(media.format({ type: 'Text', subtype: 'HTML', suffix: null }), 'Text/HTML');
});

test('parse and format round-trip multiple plus signs, empty and punctuation suffixes', () => {
  for (const value of ['application/foo+bar+json', 'text/x+', 'text/x++', 'text/x+!foo']) {
    assert.equal(media.format(media.parse(value)), value);
  }
  assert.throws(() => upstream.format(upstream.parse('application/foo+bar+json')));
  assert.equal(upstream.format(upstream.parse('text/x+')), 'text/x');
});

test('the combined subtype including suffix stays within 127 characters', () => {
  const valid = { type: 'application', subtype: 'x'.repeat(122), suffix: 'json' };
  assert.equal(media.test(media.format(valid)), true);
  assert.throws(() => media.format({ ...valid, subtype: 'x'.repeat(123) }), TypeError);
  const overflow = { type: 'application', subtype: 'x'.repeat(127), suffix: 'json' };
  assert.equal(upstream.test(upstream.format(overflow)), false);
  assert.throws(() => media.format(overflow), TypeError);
  for (const value of ['a'.repeat(128) + '/b', 'a/' + 'b'.repeat(128)]) {
    assert.equal(media.test(value), false);
    assert.throws(() => media.parse(value), TypeError);
  }
});

test('ASCII validation precedes Unicode lowercasing', () => {
  assert.equal(upstream.test('text/K'), true);
  for (const value of ['text/K', 'K/text', 'text/é', 'text/\ud800', 'text/😀']) {
    assert.equal(media.test(value), false);
    assert.throws(() => media.parse(value), TypeError);
  }
});

test('rejects trailing line terminators in parse, test and every format field', () => {
  for (const ending of ['\n', '\r', '\r\n', '\u2028', '\u2029']) {
    assert.equal(media.test('text/html' + ending), false);
    assert.throws(() => media.parse('text/html' + ending), TypeError);
    for (const field of ['type', 'subtype', 'suffix']) {
      assert.throws(() => media.format({ type: 'text', subtype: 'x', suffix: 'json', [field]: 'x' + ending }), TypeError);
    }
  }
});

test('every byte follows the established type, subtype and first-character alphabets', () => {
  const alnum = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (let code = 0; code < 256; code++) {
    const char = String.fromCharCode(code);
    assert.equal(media.test('a' + char + '/b'), (alnum + '!#$&^_-').includes(char), 'type byte ' + code);
    assert.equal(media.test('a/b' + char + 'c'), (alnum + '!#$&^_.+-').includes(char), 'subtype byte ' + code);
    assert.equal(media.test('a/' + char + 'b'), alnum.includes(char), 'first byte ' + code);
  }
});

test('rejects parameters, wildcards and whitespace outside the bare-media contract', () => {
  for (const value of ['', 'text', 'text/', '/html', 'text /html', 'text/ html', 'text/html; charset=utf-8',
    '*/*', 'text/*', '\ttext/html', 'text/html\t', 'text/html/extra', 'text/h@tml']) {
    assert.equal(media.test(value), false, JSON.stringify(value));
    assert.throws(() => media.parse(value), TypeError);
  }
  assert.equal(media.test('   text/html   '), true);
  assert.equal(media.test(' '.repeat(10000) + 'text/html' + ' '.repeat(10000)), true);
});

test('invalid API values do not invoke coercion hooks or expose input text', () => {
  const hostile = { toString() { throw new Error('coercion'); }, toJSON() { throw new Error('serialization'); } };
  for (const value of [undefined, null, 1, false, [], hostile, Symbol('secret')]) {
    assert.throws(() => media.test(value), TypeError);
    assert.throws(() => media.parse(value), TypeError);
  }
  for (const value of [undefined, null, [], 'text/html', {}, { type: hostile, subtype: 'html' },
    { type: 'text', subtype: 'html', suffix: 0 }, { type: 'text', subtype: 'html', suffix: 'json+xml' }]) {
    assert.throws(() => media.format(value), TypeError);
  }
  assert.throws(() => media.parse('secret/value@'), error => error instanceof TypeError && !error.message.includes('secret'));
});

test('deterministic generated accepted names round-trip without altering their input', () => {
  let seed = 42917;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const chars = 'Abc09!#$&^_.+-';
  for (let count = 0; count < 10000; count++) {
    let subtype = 'A';
    const length = next() % 127 + 1;
    while (subtype.length < length) subtype += chars[next() % chars.length];
    const value = 'Application/' + subtype;
    const parsed = media.parse(value);
    assert.equal(media.format(parsed), value.toLowerCase());
    assert.equal(media.test(value), true);
    assert.deepEqual(parsed, { ...upstream.parse(value) });
  }
});

test('results are independent mutable records; exports are frozen', async () => {
  const parsed = media.parse('text/html');
  parsed.type = 'changed';
  assert.equal(media.parse('text/html').type, 'text');
  assert.equal(Object.getPrototypeOf(parsed), Object.prototype);
  assert.ok(Object.hasOwn(parsed, 'suffix'));
  assert.equal(Object.isFrozen(media), true);
  const esm = await import('../index.js');
  assert.equal(esm.default, media);
  for (const name of ['parse', 'format', 'test']) assert.equal(esm[name], media[name]);
});
