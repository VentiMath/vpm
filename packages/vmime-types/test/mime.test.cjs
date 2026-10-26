'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mime = require('..');
const upstream = require('./upstream.cjs');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../../vmime-db/db.json'), 'utf8'));

test('every extension conflict resolves exactly like mime-types 3.0.2', () => {
  assert.equal(Object.keys(mime.types).length, 1239);
  assert.deepEqual(mime.types, upstream.types);
  assert.deepEqual(mime.extensions, upstream.extensions);
  for (const ext of Object.keys(upstream.types)) {
    for (const input of [ext, '.' + ext, ext.toUpperCase(), 'file.' + ext, '/a/b/file.' + ext, '.config.' + ext]) {
      assert.equal(mime.lookup(input), upstream.lookup(input), input);
    }
    assert.equal(mime.contentType(ext), upstream.contentType(ext), ext);
  }
});

test('all catalog types preserve default charsets, extensions and ordinary headers', () => {
  for (const type of Object.keys(db)) {
    for (const value of [type, type.toUpperCase(), ' \t' + type + '\t ', type + '; foo=bar', type + '; charset=ascii']) {
      for (const method of ['charset', 'extension', 'contentType']) {
        assert.equal(mime[method](value), upstream[method](value), method + ': ' + value);
      }
    }
  }
  assert.equal(mime.charsets.lookup, mime.charset);
});

test('lookup preserves native path, dotfile and trailing separator semantics', () => {
  for (const value of ['', '.', '..', 'json', '.json', 'json/', 'json//', '/json', '/.json', './.json', '/.config.json',
    'a.json/', 'a.json//', '/.config.json/', 'a.bogus', 'a.json?q=1', 'a.json#x', 'a.JSON', 'a.html.exe',
    'C:\\folder\\file.json', 'C:\\folder.json\\file', 'a\\.json', 'x\n.json', 'x\0.json', '__proto__', 'constructor']) {
    assert.equal(mime.lookup(value), upstream.lookup(value), JSON.stringify(value));
  }
  let seed = 291;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const alphabet = 'a.b/c\\HTML_ json?%#:\n';
  for (let i = 0; i < 4000; i++) {
    let value = '';
    for (let j = random(80); j > 0; j--) value += alphabet[random(alphabet.length)];
    if (i % 3 === 0) value += '.json';
    assert.equal(mime.lookup(value), upstream.lookup(value), JSON.stringify(value));
  }
});

test('unknown types, text defaults and non-string inputs retain their contracts', () => {
  assert.equal(mime.charset('text/x-unknown'), 'UTF-8');
  assert.equal(mime.charset('application/x-unknown'), false);
  assert.equal(mime.contentType('application/x-unknown'), 'application/x-unknown');
  assert.equal(mime.extension('application/x-unknown'), false);
  for (const value of [undefined, null, false, 42, 1n, Symbol(), [], {}, { toString() { throw Error('coerced'); } }]) {
    for (const method of ['lookup', 'charset', 'extension', 'contentType']) assert.equal(mime[method](value), false);
  }
});

test('charset parameter names are case-insensitive and preserve existing values', () => {
  for (const name of ['charset', 'CHARSET', 'Charset', 'cHaRsEt']) {
    for (const value of ['ascii', '"utf-8"', '""']) {
      const input = 'Text/HTML; ' + name + '=' + value;
      assert.equal(mime.contentType(input), input);
    }
  }
  assert.equal(upstream.contentType('text/html; CHARSET=ascii'), 'text/html; CHARSET=ascii; charset=utf-8');
  // charset() returns the catalog default, not the supplied parameter's value.
  assert.equal(mime.charset('text/html; CHARSET=ascii'), 'UTF-8');
});

test('parameter values and similar names cannot masquerade as a charset', () => {
  for (const params of ['note=charset', 'note="charset"', 'notcharset=ascii', 'charsetish=ascii',
    'note="a; charset=ascii"', 'note="escaped\\\"; charset=ascii"', 'note="\\\\"',
    'note="\t \x80\xff"', '; ; note=one;']) {
    const input = 'text/html; ' + params;
    assert.equal(mime.contentType(input), input + '; charset=utf-8', input);
    assert.equal(mime.extension(input), 'html');
  }
  assert.equal(upstream.contentType('text/html; note="charset"'), 'text/html; note="charset"');
  const explicit = 'text/html; note="a; charset=ascii"; CHARSET=utf-16';
  assert.equal(mime.contentType(explicit), explicit);
});

test('malformed types, parameter syntax, controls and duplicate charsets return false', () => {
  for (const input of ['text/', '/html', 'text/html junk', 'text/html/extra', 'text/html\n', 'text/html\r\nX: x',
    'text/html; note', 'text/html; a=', 'text/html; a =b', 'text/html; a= b', 'text/html; a="unterminated',
    'text/html; a="escape\\"', 'text/html; a="line\nbreak"', 'text/html; a="nul\0"', 'text/html; a="☃"',
    'text/html; a="ok"junk', 'text/html; a=b,other', 'text/html; charset=utf-8; CHARSET=ascii',
    'text/html; a="' + 'x'.repeat(20000)]) {
    for (const method of ['charset', 'extension', 'contentType']) assert.equal(mime[method](input), false, method + ': ' + input.slice(0, 100));
  }
});

test('generated quoted parameters preserve delimiters and only real charset parameters suppress defaults', () => {
  const values = ['charset', 'a;b', 'a"b', 'a\\b', '; CHARSET=x', '\t', '\xff', '', 'one two'];
  const quote = value => '"' + value.replace(/["\\]/g, '\\$&') + '"';
  for (const left of values) for (const right of values) {
    const input = 'text/plain; note=' + quote(left) + '; other=' + quote(right);
    assert.equal(mime.contentType(input), input + '; charset=utf-8');
    assert.equal(mime.contentType(input + '; ChArSeT="ascii"'), input + '; ChArSeT="ascii"');
    assert.equal(mime.contentType(input + '; ChArSeT="ascii"; broken'), false);
  }
});

test('shared mappings, extension lists, aliases and exported methods cannot be replaced', () => {
  for (const table of [mime, mime.charsets, mime.types, mime.extensions]) assert.ok(Object.isFrozen(table));
  assert.equal(Object.getPrototypeOf(mime.types), null);
  assert.equal(Object.getPrototypeOf(mime.extensions), null);
  for (const list of Object.values(mime.extensions)) assert.ok(Object.isFrozen(list));
  assert.throws(() => { mime.types.html = 'application/x-changed'; }, TypeError);
  assert.throws(() => { mime.extensions['text/html'][0] = 'changed'; }, TypeError);
  assert.throws(() => { mime.lookup = () => 'changed'; }, TypeError);
  assert.throws(() => { mime.charsets.lookup = () => 'changed'; }, TypeError);
  assert.equal(mime.types.__proto__, undefined);
  assert.equal(mime.extensions.constructor, undefined);
  assert.equal(mime.contentType('html'), 'text/html; charset=utf-8');
});
