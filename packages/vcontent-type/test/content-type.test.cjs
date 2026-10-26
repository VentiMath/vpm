'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const contentType = require('..');
const upstream = require('./fixtures/content-type-2.1.0.cjs');
const latest = require('./fixtures/content-type-3.1.1.cjs');
const { parse, format } = contentType;
const plain = result => ({ ...result, parameters: { ...result.parameters } });

const headers = [
  '', ' ', '\t ', 'text/html', ' IMAGE/SVG+XML \t', 'text / plain', 'text/@plain',
  'text/plain,wrong', '\ntext/plain\r', 'T\u0130PE/\u03a3\ud800', 'text/html; charset=utf-8; foo=bar',
  'text/html ; charset = utf-8 ; foo=bar ', 'text/html; charset=', 'text/html; charset=""',
  'text/html; Charset=UTF-8', 'text/html; charset="UTF-8"',
  'text/html; param="charset=\\"utf-8\\"; foo=bar"; bar=foo',
  'text/html;;;; charset=utf-8;; foo=bar;', 'text/plain; foo="bar', 'text/plain; foo="bar\\',
  'text/plain; foo="bar"baz; charset=utf-8', 'text/plain; foo=bar"baz', 'text/plain; foo=bar=baz',
  'text/html; Charset=utf-8; charset=iso-8859-1', 'text/html; Charset="utf-8"; charset="latin1"',
  'text/html; =value; odd name = ok', 'text/plain; a="x\\\\y\\"z\\q"; a=ignored',
  'text/html, application/json;q=0.9, */*;q=0.8', 'text/html; invalid, application/json',
  'text/html; profile="compact,print"; charset=utf-8, application/json',
  'text/html; \u0130=\u00c0; \ud800=\uffff', 'text/plain; __proto__=first; __proto__=second; constructor=ok',
];

test('matches 2.1.0 and 3.1.1 parsing, including lenient malformed headers and every starting offset', () => {
  for (const header of headers) {
    for (let start = 0; start <= header.length; start++) {
      for (const comma of [false, true]) for (const parameters of [false, true]) {
        const options = { start, comma, parameters };
        const actual = plain(parse(header, options));
        assert.deepEqual(actual, plain(upstream.parse(header, options)), JSON.stringify({ header, options }));
        assert.deepEqual(actual, plain(latest.parse(header, options)));
      }
    }
  }
});

test('preserves first parameters, case normalization, escaped quotes, and mutable results', () => {
  const result = parse(' Text/HTML ; Charset="UTF-8"; charset=ignored; note="a,b; c\\"d\\\\e" ');
  assert.equal(result.type, 'text/html');
  assert.deepEqual({ ...result.parameters }, { charset: 'UTF-8', note: 'a,b; c"d\\e' });
  result.parameters.charset = 'utf-16le';
  assert.equal(format(result), 'text/html; charset=utf-16le; note="a,b; c\\"d\\\\e"');
});

test('iterates Accept values with absolute indices and ignores commas inside quotes', () => {
  const header = 'text/html; profile="a,b";q=0.5, application/json;q=0.9, */*;q=0';
  const results = [];
  for (let start = 0; start < header.length;) {
    const result = parse(header, { comma: true, start });
    assert.ok(result.index >= start && result.index <= header.length);
    if (result.index !== header.length) assert.equal(header[result.index], ',');
    results.push(plain(result));
    start = result.index + 1;
  }
  assert.deepEqual(results.map(r => r.type), ['text/html', 'application/json', '*/*']);
  assert.equal(results[0].parameters.profile, 'a,b');
  assert.deepEqual(results.map(r => r.parameters.q), ['0.5', '0.9', '0']);
  const typeOnly = parse(header, { parameters: false, comma: true });
  assert.equal(header[typeOnly.index], ';');
  assert.equal(Object.keys(typeOnly.parameters).length, 0);
});

test('uses a direct null prototype without the upstream shared-prototype interference', () => {
  for (const before of [upstream, latest]) {
    const prototype = Object.getPrototypeOf(before.parse('').parameters);
    prototype.charset = 'inherited';
    try {
      assert.equal(before.parse('text/plain; charset=utf-8').parameters.charset, 'inherited');
      const first = parse('text/plain; charset=utf-8');
      assert.equal(Object.getPrototypeOf(first.parameters), null);
      assert.equal(first.parameters.charset, 'utf-8');
      first.parameters.charset = 'changed';
      first.parameters.__proto__ = 'ordinary value';
      assert.deepEqual({ ...parse('text/plain; charset=utf-8').parameters }, { charset: 'utf-8' });
    } finally { delete prototype.charset; }
  }
  const result = parse('text/plain; __proto__=value; constructor=ok; tostring=own; __proto__=ignored');
  assert.equal(result.parameters.__proto__, 'value');
  assert.equal(result.parameters.constructor, 'ok');
  assert.equal(Object.getPrototypeOf(result.parameters), null);
});

test('does not inherit names from Object.prototype or expose mutable shared exports', () => {
  Object.prototype.vpmParameterTest = 'inherited';
  try { assert.equal(parse('').parameters.vpmParameterTest, undefined); }
  finally { delete Object.prototype.vpmParameterTest; }
  assert.equal(Object.isFrozen(contentType), true);
  assert.throws(() => { contentType.parse = () => {}; }, TypeError);
});

test('rejects non-string inputs without calling their coercion hooks', () => {
  const object = { length: 4, toString() { throw new Error('coercion must not run'); } };
  for (const header of [null, undefined, 42, 1n, true, Symbol(), [], {}, new String('text/plain'), object]) {
    assert.throws(() => parse(header), TypeError);
  }
});

test('validates start bounds and option types instead of returning invalid indices', () => {
  for (const start of [-1, 1.5, NaN, Infinity, -Infinity, 11, '0', null, {}, 1n]) {
    assert.throws(() => parse('text/plain', { start }), TypeError);
  }
  for (const options of [false, 1, '', 'options', [], () => {}]) assert.throws(() => parse('', options), TypeError);
  for (const key of ['comma', 'parameters']) {
    for (const value of [null, 0, 1, '', 'false', {}]) assert.throws(() => parse('', { [key]: value }), TypeError);
  }
  assert.deepEqual(plain(parse('text/plain', { start: 10 })), { type: '', index: 10, parameters: {} });
  assert.deepEqual(plain(parse('', null)), { type: '', index: 0, parameters: {} });
  assert.deepEqual(plain(parse('', { start: 0 })), { type: '', index: 0, parameters: {} });
});

test('formats valid headers with stable insertion order, quoting, casing, and only own properties', () => {
  const cases = [
    { type: 'text/plain' }, { type: 'IMAGE/SVG+XML', parameters: null },
    { type: 'text/html', parameters: { Charset: 'UTF-8', charset: 'latin1', z: 'last', a: 'next' } },
    { type: 'text/plain', parameters: { empty: '', foo: 'bar or "baz"', slash: 'a\\b', latin: 'café', tab: '\t' } },
  ];
  for (const value of cases) {
    assert.equal(format(value), upstream.format(value));
    assert.equal(format(value), latest.format(value));
  }
  const parameters = Object.assign(Object.create({ inherited: 'ignored' }), { charset: 'utf-8' });
  assert.equal(format({ type: 'text/plain', parameters }), 'text/plain; charset=utf-8');
  Object.freeze(parameters);
  assert.equal(format(Object.freeze({ type: 'text/plain', parameters })), 'text/plain; charset=utf-8');
});

test('rejects malformed media types and parameter names', () => {
  for (const type of ['', '/', '/plain', 'text/', 'text/plain/more', 'text /plain', 'text/plain\r', 'text/plain\n', 'téxt/plain', 'text/\ud800']) {
    assert.throws(() => format({ type }), TypeError);
  }
  for (const name of ['', 'bad name', 'a=b', 'a/b', 'x\t', 'x\r', 'x\n', 'é']) {
    assert.throws(() => format({ type: 'text/plain', parameters: { [name]: 'value' } }), TypeError);
  }
});

test('validates every byte in formatted values, including CR, LF, DEL and Latin-1', () => {
  for (let code = 0; code < 256; code++) {
    const value = 'a' + String.fromCharCode(code) + 'b';
    const input = { type: 'text/plain', parameters: { value } };
    if (code === 9 || code >= 32 && code !== 127) {
      assert.equal(format(input), upstream.format(input));
      assert.equal(parse(format(input)).parameters.value, value);
    } else assert.throws(() => format(input), TypeError);
  }
  for (const value of ['x\n', 'x\r', '\u0100', '\u2028', '\ud800', '🙂']) {
    assert.throws(() => format({ type: 'text/plain', parameters: { value } }), TypeError);
  }
});

test('enforces string-only formatting without implicit coercion or echoing parameter values', () => {
  const object = { toString() { throw new Error('coercion must not run'); } };
  for (const input of [null, undefined, 1, 'text/plain', [], () => {}]) assert.throws(() => format(input), TypeError);
  for (const type of [undefined, null, 1, new String('text/plain'), object]) assert.throws(() => format({ type }), TypeError);
  for (const parameters of ['', 1, false, [], () => {}]) assert.throws(() => format({ type: 'text/plain', parameters }), TypeError);
  for (const value of [undefined, null, true, 42, 1n, Symbol(), object, new String('utf-8')]) {
    assert.throws(() => format({ type: 'text/plain', parameters: { value } }), TypeError);
  }
  assert.throws(() => format({ type: 'text/plain', parameters: { token: 'secret\r\n' } }), error => {
    assert.equal(error instanceof TypeError, true); assert.doesNotMatch(error.message, /secret/); return true;
  });
});

function random(seed) {
  return max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
}

test('matches both upstream parsers on 20000 generated headers and option combinations', () => {
  const next = random(0x4c327);
  const alphabet = 'abcXYZ09 /;=,"\\\t\r\n\u00c0\u0130\u03a3\ud800';
  for (let trial = 0; trial < 20000; trial++) {
    let header = trial % 2 ? 'text/plain; key=' : '';
    for (let n = next(120); n > 0; n--) header += alphabet[next(alphabet.length)];
    const options = { start: next(header.length + 1), comma: !!next(2), parameters: !!next(2) };
    const actual = plain(parse(header, options));
    assert.deepEqual(actual, plain(upstream.parse(header, options)), JSON.stringify({ header, options }));
    assert.deepEqual(actual, plain(latest.parse(header, options)));
  }
});

test('round-trips 3000 generated valid parameter maps without changing their values', () => {
  const next = random(0x71ab);
  const alphabet = 'abcXYZ019 ;=,"\\\t\u00c0\u00ff';
  for (let trial = 0; trial < 3000; trial++) {
    const parameters = Object.create(null);
    for (let i = next(8); i >= 0; i--) {
      let value = '';
      for (let n = next(40); n > 0; n--) value += alphabet[next(alphabet.length)];
      parameters['p' + i] = value;
    }
    const object = { type: 'application/example+json', parameters };
    const serialized = format(object);
    assert.equal(serialized, upstream.format(object));
    assert.deepEqual(parse(serialized).parameters, parameters);
  }
});

test('handles long quoted, escaped, duplicate and unterminated values', () => {
  const value = ('long\\"value;with,commas '.repeat(4096));
  for (const header of [
    'text/plain; x="' + 'x'.repeat(128 * 1024) + '"',
    'text/plain; x="' + value + '"; y=end',
    'text/plain; x=first; x="' + value + '"; y=end',
    'text/plain; x="' + value + '\\',
  ]) {
    assert.deepEqual(plain(parse(header, { comma: true })), plain(upstream.parse(header, { comma: true })));
  }
});

test('supports CommonJS and native ESM named and default imports', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.parse, parse); assert.equal(esm.format, format); assert.equal(esm.default, contentType);
});
