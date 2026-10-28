'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const v = require('..');
const old = require('./fixtures/content-disposition-2.0.1.cjs');
const latest = import('./fixtures/content-disposition-3.0.0.mjs');
const plain = result => ({ type: result.type, parameters: { ...result.parameters } });

test('fixtures are exact published sources with recorded hashes', () => {
  const provenance = require('../PROVENANCE.json');
  for (const source of [...provenance.sources, provenance.previousImplementation, provenance.multipartBaseline]) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
  }
});
test('create matches both baselines for filenames and fallbacks', async () => {
  const current = await latest;
  const filenames = [undefined, '', 'report.pdf', 'report (1).pdf', 'café.pdf', '📚 中文.txt', 'a"b\\c.txt', 'a\r\nb.txt', 'a\0b.txt', '%20.txt', '100%.txt', '/path/name.txt'];
  for (const filename of filenames) {
    for (const options of [undefined, null, {}, { type: 'inline' }, { type: 'X-Custom', fallback: false }, { fallback: true }, { fallback: 'custom.pdf' }, { fallback: '' }]) {
      assert.equal(v.create(filename, options), old.create(filename, options));
      assert.equal(v.create(filename, options), current.create(filename, options));
    }
  }
  assert.equal(v.create('café.pdf'), 'attachment; filename="caf?.pdf"; filename*=UTF-8\'\'caf%C3%A9.pdf');
  assert.equal(v.create('%20.txt', { fallback: '%20.txt' }), old.create('%20.txt', { fallback: '%20.txt' }));
  assert.equal(v.create('a/b.txt'), 'attachment; filename="a/b.txt"');
  assert.equal(v.create('plain.txt', { fallback: false }), 'attachment; filename=plain.txt');
});
test('parse preserves lenient recovery and first-value behavior', async () => {
  const current = await latest;
  const headers = ['', ' ATTACHMENT \t', 'invalid type; name=value', 'attachment; filename=', 'attachment; filename=""',
    'attachment; filename=first; FILENAME=second', 'attachment;;;broken; file="a; b"junk; next=value',
    'attachment; x="a\\"b\\\\c\\q"; y=ok', 'attachment; x="unfinished\\',
    'attachment; =empty-name; __proto__=own; constructor=own',
    "attachment; filename=plain; filename*=UTF-8'en'%E2%82%AC.txt",
    "attachment; filename*=UTF-8''%E2%82%AC.txt; filename=plain",
    "attachment; filename*=bad; filename=plain",
    'attachment; filename*="UTF-8\'\'x"', 'form-data; name="a%22b%0D%0ac\\d"'];
  for (const header of headers) for (const options of [undefined, { multipart: true }, { extended: false }, { multipart: true, extended: false }]) {
    assert.deepEqual(plain(v.parse(header, options)), plain(old.parse(header, options)));
    assert.deepEqual(plain(v.parse(header, options)), plain(current.parse(header, options)));
  }
});
test('parameter results cannot contaminate later parses through a shared prototype', () => {
  const prototype = Object.getPrototypeOf(old.parse('').parameters);
  prototype.filename = 'poisoned';
  try {
    assert.equal(old.parse('attachment; filename=real').parameters.filename, 'poisoned');
    const first = v.parse('attachment; filename=real');
    assert.equal(Object.getPrototypeOf(first.parameters), null);
    first.parameters.filename = 'changed'; first.parameters.__proto__ = 'own';
    const next = v.parse('attachment; filename=real; __proto__=literal; constructor=x');
    assert.equal(next.parameters.filename, 'real');
    assert.equal(next.parameters.__proto__, 'literal');
    assert.equal(next.parameters.constructor, 'x');
    assert.equal(Object.getPrototypeOf(next.parameters), null);
  } finally { delete prototype.filename; }
});
test('extended encoding covers every byte, Unicode, and all URI punctuation', () => {
  for (let code = 0; code < 256; code++) {
    const input = String.fromCharCode(code);
    assert.equal(v.encodeExtended(input), old.encodeExtended(input));
    assert.equal(v.decodeExtended(v.encodeExtended(input)), input);
  }
  for (const input of ['中文 📚 café', "!#$&+-.^_`|~'()*%", '', '\u0000\r\n']) {
    assert.equal(v.encodeExtended(input), old.encodeExtended(input));
    assert.equal(v.decodeExtended(v.encodeExtended(input)), input);
  }
  assert.equal(v.encodeExtended("a'()*"), "UTF-8''a%27%28%29%2A");
});
test('lone surrogates retain URIError without silently changing filenames', () => {
  for (const input of ['\ud800', '\udfff', 'a\ud800b']) {
    assert.throws(() => v.encodeExtended(input), URIError);
    assert.throws(() => v.create(input), URIError);
    assert.throws(() => v.format({ type: 'attachment', parameters: { filename: input } }), URIError);
  }
});
test('Latin-1 percent decoding rejects malformed escapes like upstream 3', async () => {
  const current = await latest;
  for (const suffix of ['%', '%0', '%GG', '%0G', '%G0', '%00%', '%ff%a', '%FF%XX']) {
    const encoded = "ISO-8859-1''" + suffix;
    assert.equal(v.decodeExtended(encoded), undefined);
    assert.equal(current.decodeExtended(encoded), undefined);
    assert.notEqual(old.decodeExtended(encoded), undefined);
    assert.equal(v.parse('attachment; filename=plain; filename*=' + encoded).parameters.filename, 'plain');
  }
  for (let code = 0; code < 256; code++) {
    assert.equal(v.decodeExtended("ISO-8859-1''a%" + code.toString(16).padStart(2, '0') + 'z'), 'a' + String.fromCharCode(code) + 'z');
  }
  for (const input of ["UTF-8''%FF", "UTF-8''%ED%A0%80", "UTF-8''%C0%AF", "unknown''abc", "UTF-8'abc", "''abc", 'abc']) assert.equal(v.decodeExtended(input), undefined);
  assert.equal(v.decodeExtended("utf8'en'%E2%82%AC"), '€');
  assert.equal(v.decodeExtended("UTF-8''"), '');
});
test('general parsing remains lenient rather than a strict RFC validator', () => {
  assert.equal(v.decodeExtended("UTF-8''raw space"), 'raw space');
  assert.equal(v.decodeExtended("ISO-8859-1''☃"), '☃');
  assert.equal(v.parse('not a token; not a token=ok').parameters['not a token'], 'ok');
});
test('format matches both baselines for normal and multipart data', async () => {
  const current = await latest;
  for (const parameters of [undefined, null, {}, { filename: 'file.txt' }, { filename: '' }, { filename: 'a "quoted" \\ value' }, { filename: 'café' }, { filename: '雪' }, { name: 'field', filename: 'a\r\n"b' }]) {
    for (const options of [undefined, { multipart: true }, { extended: false }, { multipart: true, extended: false }]) {
      const input = { type: 'Attachment', parameters };
      let expected;
      try { expected = old.format(input, options); } catch {
        assert.throws(() => v.format(input, options), TypeError); continue;
      }
      assert.equal(v.format(input, options), expected);
      assert.equal(v.format(input, options), current.format(input, options));
    }
  }
});
test('explicit extended values win over automatic encoding, including mixed case', async () => {
  const input = { type: 'attachment', parameters: { filename: '雪', 'filename*': "UTF-8''other" } };
  assert.equal(v.format(input), (await latest).format(input));
  assert.equal(v.format(input), "attachment; filename*=UTF-8''other");
  assert.equal(v.format({ type: 'attachment', parameters: { Filename: '雪', 'FILENAME*': "UTF-8''other" } }), "attachment; FILENAME*=UTF-8''other");
  assert.equal(v.format({ type: 'attachment', parameters: { 'FILENAME*': "UTF-8''other", Filename: '雪' } }), "attachment; FILENAME*=UTF-8''other");
  assert.throws(() => v.format({ type: 'attachment', parameters: { 'filename*': '雪' } }), TypeError);
  assert.throws(() => v.format({ type: 'attachment', parameters: { Name: 'a', name: 'b' } }), /duplicate/);
  const inherited = Object.assign(Object.create({ 'filename*': "UTF-8''inherited" }), { filename: '雪' });
  assert.equal(v.format({ type: 'attachment', parameters: inherited }), "attachment; filename*=UTF-8''%E9%9B%AA");
});
test('no implicit coercion of headers, filenames, types, or parameter values', () => {
  let coerced = 0;
  const hook = { toString() { coerced++; return 'unsafe'; } };
  for (const invalid of [null, 0, true, [], hook, Symbol('secret')]) {
    assert.throws(() => v.create(invalid), TypeError);
    assert.throws(() => v.parse(invalid), TypeError);
    assert.throws(() => v.encodeExtended(invalid), TypeError);
    assert.throws(() => v.decodeExtended(invalid), TypeError);
    assert.throws(() => v.format({ type: invalid }), TypeError);
    assert.throws(() => v.format({ type: 'attachment', parameters: { x: invalid } }), TypeError);
  }
  for (const type of ['', 'a b', 'a\n', 'a\r\n', '雪']) assert.throws(() => v.create('file', { type }), TypeError);
  for (const params of ['a', [], 1, true]) assert.throws(() => v.format({ type: 'attachment', parameters: params }), TypeError);
  assert.equal(coerced, 0);
});
test('options validate all specified fields even without a filename', () => {
  for (const options of [true, 'x', 1, []]) {
    assert.throws(() => v.create('x', options), TypeError);
    assert.throws(() => v.parse('attachment', options), TypeError);
    assert.throws(() => v.format({ type: 'attachment' }, options), TypeError);
  }
  for (const value of [null, 'true', 0, {}]) for (const key of ['extended', 'multipart']) {
    assert.throws(() => v.parse('', { [key]: value }), TypeError);
    assert.throws(() => v.format({ type: 'attachment' }, { [key]: value }), TypeError);
  }
  for (const fallback of [null, 1, [], {}, '雪', 'a\n', 'a\0']) assert.throws(() => v.create(undefined, { fallback }), TypeError);
});
test('getters are read once and inputs are not mutated', () => {
  const reads = {};
  const getter = (key, value) => ({ get() { reads[key] = (reads[key] || 0) + 1; return value; }, enumerable: true });
  const options = Object.freeze(Object.defineProperties({}, { type: getter('type', 'inline'), fallback: getter('fallback', false) }));
  v.create('雪', options);
  v.parse('inline', Object.freeze(Object.defineProperties({}, { multipart: getter('multipart', false), extended: getter('extended', true) })));
  const parameters = Object.freeze(Object.defineProperties({}, { filename: getter('filename', '雪'), 'filename*': getter('filename*', "UTF-8''other") }));
  assert.equal(v.format(Object.freeze({ type: 'attachment', parameters })), "attachment; filename*=UTF-8''other");
  for (const count of Object.values(reads)) assert.equal(count, 1);
});
test('errors do not echo header or filename contents', () => {
  for (const call of [() => v.create('secret', { type: 'private secret' }), () => v.create('secret', { fallback: 'secret\n' }),
    () => v.format({ type: 'attachment', parameters: { 'secret key': 'secret' } }),
    () => v.format({ type: 'attachment', parameters: { x: 'private 雪' } }, { extended: false })]) {
    assert.throws(call, error => error instanceof TypeError && !/private|secret/.test(error.message));
  }
});
test('generated parsers match upstream 3 across quotes, duplicates, and malformed recovery', async () => {
  const current = await latest;
  let seed = 0x73652;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const chunks = ['a', 'Z', ' ', '\t', ';', '=', '"', '\\', '%', '%22', '%0D', '%GG', "UTF-8''", "ISO-8859-1''", 'é', '雪', '*', '__proto__'];
  for (let sample = 0; sample < 15000; sample++) {
    let header = ['attachment;', 'form-data; x=', 'inline; filename*='][random(3)];
    const count = random(40);
    for (let j = 0; j < count; j++) header += chunks[random(chunks.length)];
    const options = { multipart: random(2) === 1, extended: random(2) === 1 };
    assert.deepEqual(plain(v.parse(header, options)), plain(current.parse(header, options)), header);
  }
});
test('long quoted spans, escaped quotes, duplicate and unfinished values', async () => {
  const current = await latest;
  for (const value of ['word '.repeat(20000), 'a\\"b\\\\c '.repeat(10000), '%22x%0Dy%0A'.repeat(10000)]) {
    for (const header of ['attachment; x="' + value + '"; y=end', 'attachment; x=first; x="' + value + '"', 'attachment; x="' + value]) {
      for (const multipart of [false, true]) assert.deepEqual(plain(v.parse(header, { multipart })), plain(current.parse(header, { multipart })));
    }
  }
});
test('CJS and native ESM expose the same five functions', async () => {
  const esm = await import('../index.js');
  for (const name of ['create', 'parse', 'format', 'encodeExtended', 'decodeExtended']) assert.equal(esm[name], v[name]);
  assert.equal(esm.default, v);
  assert.equal(Object.isFrozen(v), true);
});

test('multipart short and span scans agree at boundaries, escapes and incomplete fields', async () => {
  const current = await latest;
  const values = ['', 'report.pdf', 'a%22b%0D%0Ac.txt', '%0d%0a%22', '%', '%0', '%2',
    '%GG%20%2522', '%22%0D%', '\\"ignored', 'é雪\ud800', 'a;b=c', '%22'.repeat(60)];
  for (const value of values) {
    for (const size of [0, 1, 28, 29, 30, 31, 32, 33, 120, 125, 126, 127, 128, 129, 256, 4096]) {
      const padded = value + 'x'.repeat(Math.max(0, size - value.length));
      for (const suffix of ['"', '"junk; next=ok', '', '"; FILENAME=duplicate']) {
        for (const options of [{ multipart: true }, { multipart: true, extended: false }, { multipart: false }]) {
          const header = 'form-data; name="file"; filename="' + padded + suffix;
          const result = v.parse(header, options);
          assert.deepEqual(plain(result), plain(current.parse(header, options)), header);
          assert.equal(Object.getPrototypeOf(result.parameters), null);
        }
      }
    }
  }
  for (const multipart of [false, true]) {
    const options = { multipart };
    const first = v.parse('form-data; name=""; NAME="ignored"; filename="a%22b"', options);
    assert.equal(first.parameters.name, '');
    first.parameters.filename = 'changed';
    const second = v.parse('form-data; name=""; NAME="ignored"; filename="a%22b"', options);
    assert.equal(second.parameters.filename, multipart ? 'a"b' : 'a%22b');
  }
});

test('short-path names, malformed prefixes and empty duplicates preserve extraction', async () => {
  const current = await latest;
  for (const type of ['attachment', 'inline', 'form-data', 'Attachment', 'X-Custom', ' bad type ', '']) {
    for (const key of ['filename', 'filename*', 'name', 'Filename', 'filename-extra', 'name*', '__proto__', 'constructor', '']) {
      for (const value of ['', 'report.pdf', '"report (1).pdf"', '"a%22b%0D%0A"', "UTF-8''%E9%9B%AA", '"unfinished']) {
        for (const options of [undefined, { multipart: true }, { extended: false }]) {
          const header = type + '; ' + key + '=' + value + '; ' + key.toUpperCase() + '=second';
          assert.deepEqual(plain(v.parse(header, options)), plain(current.parse(header, options)), header);
        }
      }
    }
  }
});
test('one, two and many parameters retain single-read snapshots and duplicate rejection', () => {
  for (const count of [1, 2, 3, 8, 128]) {
    const reads = new Map();
    const parameters = Object.create({ inherited: 'ignored' });
    for (let i = 0; i < count; i++) {
      const key = i === 0 ? 'filename' : 'custom-' + i;
      Object.defineProperty(parameters, key, { enumerable: true, get() {
        reads.set(key, (reads.get(key) || 0) + 1);
        return 'v' + i;
      } });
    }
    Object.freeze(parameters);
    const header = v.format(Object.freeze({ type: 'attachment', parameters }));
    assert.equal(Object.keys(v.parse(header).parameters).length, count);
    assert.equal(reads.size, count);
    assert.ok([...reads.values()].every(value => value === 1));
  }
  for (const parameters of [
    { filename: 'a', FILENAME: 'b' },
    { filename: 'a', name: 'x', FILENAME: 'b' },
    { a: 'first', b: 'x', c: 'x', A: 'second' },
  ]) assert.throws(() => v.format({ type: 'attachment', parameters }), /duplicate/);
  for (const key of ['filename ', 'name\n', 'filename*\r', 'name=bad']) {
    assert.throws(() => v.format({ type: 'attachment', parameters: { [key]: 'a' } }), TypeError);
  }
});
test('optimized formatting preserves the prior implementation across generated inputs', () => {
  const previous = require('./fixtures/vcontent-disposition-bf6666b.cjs');
  let seed = 0x92bca;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const names = ['filename', 'filename*', 'Filename', 'name', 'Name', 'x-custom', 'X-Custom', '__proto__', 'constructor'];
  const values = ['', 'token', 'with space', 'café', '雪', '\r\n"\\', "UTF-8''%E9%9B%AA", '()*', '\ud800'];
  const outcome = fn => { try { return { value: fn() }; } catch (error) { return { error: error.name }; } };
  for (let sample = 0; sample < 5000; sample++) {
    const parameters = Object.create(null);
    const count = random(9);
    for (let i = 0; i < count; i++) parameters[names[random(names.length)]] = values[random(values.length)];
    const disposition = { type: ['attachment', 'inline', 'form-data', 'X-Custom'][random(4)], parameters };
    const options = { multipart: random(2) === 1, extended: random(2) === 1 };
    assert.deepEqual(outcome(() => v.format(disposition, options)), outcome(() => previous.format(disposition, options)));
  }
});
