'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const qs = require('..');
const upstream = require('./upstream.cjs');

function outcome(implementation, method, input, options) {
  try { return { value: implementation[method](input, options) }; }
  catch (error) { return { error: error.name, message: error.message }; }
}
function same(method, input, options) {
  assert.deepEqual(outcome(qs, method, input, options), outcome(upstream, method, input, options));
}

test('baseline sources and licenses have pinned hashes; runtime has no external dependencies', () => {
  const provenance = require('./fixtures/provenance.json');
  assert.equal(provenance.packages.length, 19); // qs plus 18 helpers
  for (const [file, hash] of Object.entries(provenance.sha256)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'fixtures/upstream', file))).digest('hex'), hash, file);
  }
  assert.equal(require('../package.json').dependencies, undefined);
  for (const file of ['index.js', ...fs.readdirSync(path.join(__dirname, '../lib')).map(file => 'lib/' + file)]) {
    for (const match of fs.readFileSync(path.join(__dirname, '..', file), 'utf8').matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      assert.ok(match[1].startsWith('./'), 'unexpected dependency: ' + match[1]);
    }
  }
});

test('nested fields, arrays, duplicate values, nulls, and empty values', () => {
  assert.deepEqual(qs.parse('person[name]=Ada&tags[]=one&tags[]=two&x=1&x=2&empty=&bare'), {
    person: { name: 'Ada' }, tags: ['one', 'two'], x: ['1', '2'], empty: '', bare: '',
  });
  assert.deepEqual(qs.parse('a&b=&c[]', { strictNullHandling: true, allowEmptyArrays: true }), { a: null, b: '', c: [] });
  assert.equal(qs.stringify({ a: null, b: '', c: [], d: undefined }, { strictNullHandling: true, allowEmptyArrays: true }), 'a&b=&c[]');
});

const parseOptions = [
  undefined, {}, { allowDots: true }, { decodeDotInKeys: true }, { plainObjects: true },
  { allowPrototypes: true }, { allowSparse: true }, { parseArrays: false },
  { arrayLimit: 0 }, { arrayLimit: 1 }, { arrayLimit: 3 }, { arrayLimit: Infinity },
  { arrayLimit: 2, throwOnLimitExceeded: true }, { depth: 0 }, { depth: false },
  { depth: 1 }, { depth: 2, strictDepth: true }, { depth: Infinity },
  { parameterLimit: 0 }, { parameterLimit: 2 }, { parameterLimit: 3, throwOnLimitExceeded: true },
  { duplicates: 'first' }, { duplicates: 'last' }, { comma: true },
  { comma: true, arrayLimit: 2, throwOnLimitExceeded: true }, { strictMerge: false },
  { strictNullHandling: true, allowEmptyArrays: true }, { ignoreQueryPrefix: true },
  { charset: 'iso-8859-1', interpretNumericEntities: true, comma: true },
  { charsetSentinel: true, interpretNumericEntities: true }, { delimiter: /[;&]/ },
];
test('parsing option matrix matches qs 6.17.0', () => {
  const inputs = [
    '', 'a=1&b=2', 'a[]=x&a[]=y', 'a[0]=x&a[2]=y', 'a=x&a[b]=y&a=z',
    'a[b]=x&a=y&a=z&a[c]=q', 'a[b][c][d]=x', 'a[99]=x&a[0]=y',
    'a[01]=x&a[-1]=y&a[1.5]=z', 'a=1,2,3&a=4', 'a[]=1,2&a[]=3,4',
    'a.b=x&a[c.d]=y&a%252eb=z', 'a[[]=b&a[b]]oops[c]=d', 'a[b=c]=d',
    '__proto__[polluted]=yes&constructor[prototype][polluted]=yes&toString=x&hasOwnProperty=y',
    '=x&&a=&a&b[]', '?a=1;b=2&c=3', 'utf8=%E2%9C%93&a=%C3%A9',
    'utf8=%26%2310003%3B&a=%E9&b=%26%2310003%3B', 'a=%E0%A4%A&b=%xx&c=one+two',
    'a=%26%239786%3B,%26%239786%3B', 'a[]=x&a[]=y&a[]=z',
  ];
  for (const input of inputs) for (const options of parseOptions) same('parse', input, options);
});

test('6,200 deterministic mixed-key differential parses', () => {
  const keys = ['a', 'b', 'a[]', 'a[0]', 'a[2]', 'a[b]', 'a[b][]', 'a.b', '[a]', 'a[[b]]', 'a%5B1%5D', '__proto__', 'constructor', 'a[toString]', 'a%252eb'];
  const values = ['', 'x', 'one+two', 'a,b', '%C3%A9', '%F0%9F%92%A9', '%ED%A0%80', '%', '[]', '1=2'];
  let seed = 0x7e57cafe;
  function pick(list) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return list[seed % list.length]; }
  for (let i = 0; i < 200; i++) {
    const fields = [];
    for (let j = 0; j < 12; j++) fields.push(pick(keys) + '=' + pick(values));
    for (const options of parseOptions) same('parse', fields.join('&'), options);
  }
});

test('numeric limits reject invalid configuration before processing input', () => {
  for (const name of ['depth', 'arrayLimit', 'parameterLimit']) {
    for (const value of [NaN, -1, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, '2', null, true, {}, 1n]) {
      assert.throws(() => qs.parse('', { [name]: value }), { name: 'TypeError', message: name + ' must be a non-negative safe integer or Infinity' });
    }
  }
  for (const value of [NaN, -1, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, '2', null, true, false]) {
    assert.throws(() => qs.stringify({}, { depth: value }), TypeError);
  }
  assert.deepEqual(qs.parse('a[b]=x', { depth: false }), { 'a[b]': 'x' });
  for (const value of [0, 1, Number.MAX_SAFE_INTEGER, Infinity]) {
    assert.doesNotThrow(() => qs.parse('', { depth: value, arrayLimit: value, parameterLimit: value }));
    assert.doesNotThrow(() => qs.stringify({}, { depth: value }));
  }
});

test('parameter limits do not wrap at the uint32 boundary', () => {
  for (const parameterLimit of [2 ** 32 - 2, 2 ** 32 - 1, 2 ** 32, 2 ** 32 + 1, Number.MAX_SAFE_INTEGER, Infinity]) {
    for (const throwOnLimitExceeded of [true, false]) {
      assert.deepEqual(qs.parse('a=1&b=2&c=3', { parameterLimit, throwOnLimitExceeded }), { a: '1', b: '2', c: '3' });
    }
  }
  assert.deepEqual(upstream.parse('a=1&b=2', { parameterLimit: 2 ** 32 }), {});
});

test('finite depth, array, and parameter bounds retain their boundary behavior', () => {
  assert.deepEqual(qs.parse('a[b]=x', { depth: 1, strictDepth: true }), { a: { b: 'x' } });
  assert.throws(() => qs.parse('a[b][c]=x', { depth: 1, strictDepth: true }), RangeError);
  assert.deepEqual(qs.parse('a[]=x&a[]=y', { arrayLimit: 2, throwOnLimitExceeded: true }), { a: ['x', 'y'] });
  assert.throws(() => qs.parse('a[]=x&a[]=y&a[]=z', { arrayLimit: 2, throwOnLimitExceeded: true }), RangeError);
  assert.deepEqual(qs.parse('a=1&b=2&c=3', { parameterLimit: 2 }), { a: '1', b: '2' });
  assert.throws(() => qs.parse('a=1&b=2&c=3', { parameterLimit: 2, throwOnLimitExceeded: true }), RangeError);
  assert.equal(qs.stringify({ a: { b: 1 } }, { depth: 1 }), 'a%5Bb%5D=1');
  assert.throws(() => qs.stringify({ a: { b: 1 } }, { depth: 0 }), RangeError);
});

test('prototype attacks cannot mutate prototypes, including object-form input', () => {
  for (const options of [{}, { allowPrototypes: true }, { plainObjects: true }, { allowPrototypes: true, plainObjects: true }]) {
    const input = '__proto__[vqsPolluted]=yes&a[__proto__][vqsPolluted]=yes&constructor[prototype][vqsPolluted]=yes';
    same('parse', input, options);
    assert.equal(Object.prototype.vqsPolluted, undefined);
    assert.equal(Array.prototype.vqsPolluted, undefined);
    const object = JSON.parse('{"__proto__":{"vqsPolluted":"yes"},"safe":{"__proto__":{"x":"y"}}}');
    const result = qs.parse(object, options);
    assert.equal(Object.prototype.vqsPolluted, undefined);
    assert.equal(Object.getPrototypeOf(result), options.plainObjects ? null : Object.prototype);
    assert.ok(Object.hasOwn(result.safe, '__proto__'));
    assert.equal(Object.getPrototypeOf(result.safe), Object.prototype);
    assert.equal(Object.getPrototypeOf(object.safe), Object.prototype);
  }
});

test('object inputs and frozen option/filter arrays remain unmodified', () => {
  const input = Object.freeze({ a: Object.freeze([, 'x', , 'y']), 'a[]': Object.freeze(['z']) });
  same('parse', input);
  assert.deepEqual(input.a, [, 'x', , 'y']);
  const filter = Object.freeze(['b', 'a']);
  const options = Object.freeze({ filter, sort: (a, b) => a.localeCompare(b) });
  same('stringify', { b: { b: 2, a: 1 }, a: 0 }, options);
  assert.deepEqual(filter, ['b', 'a']);
});

test('shared and cyclic input containers retain upstream parsing semantics', () => {
  const shared = { x: [, 'one', , 'two'] };
  const input = { a: shared, b: shared };
  same('parse', input);
  const cyclic = { name: 'root' }; cyclic.self = cyclic;
  same('parse', { a: cyclic });
  assert.deepEqual(shared.x, [, 'one', , 'two']);
});

test('custom decoding receives the original decoder, charset, and key/value kind', () => {
  function decoder(value, decode, charset, kind) {
    if (kind === 'key' && value === 'ignore') return null;
    return kind === 'value' && /^\d+$/.test(value) ? Number(value) : decode(value, decode, charset);
  }
  same('parse', 'a=42&b=%E9&ignore=value', { decoder, charset: 'iso-8859-1' });
  assert.deepEqual(qs.parse('a=42&b=hello+world&ignore=value', { decoder }), { a: 42, b: 'hello world' });
});

test('Latin-1 sentinels, entities and literal plus signs round trip', () => {
  const object = { a: 'café+✓' };
  const query = qs.stringify(object, { charset: 'iso-8859-1', charsetSentinel: true });
  assert.equal(query, upstream.stringify(object, { charset: 'iso-8859-1', charsetSentinel: true }));
  assert.deepEqual(qs.parse(query, { charsetSentinel: true, interpretNumericEntities: true }), object);
});

const stringifyOptions = [
  undefined, {}, { encode: false }, { encodeValuesOnly: true },
  { arrayFormat: 'repeat' }, { arrayFormat: 'brackets' }, { arrayFormat: 'comma', commaRoundTrip: true },
  { arrayFormat: 'comma', encodeValuesOnly: true }, { indices: false },
  { allowDots: true }, { encodeDotInKeys: true }, { strictNullHandling: true },
  { skipNulls: true }, { allowEmptyArrays: true }, { charset: 'iso-8859-1', charsetSentinel: true },
  { format: 'RFC1738' }, { format: 'RFC3986' }, { format: 'WHATWG' },
  { addQueryPrefix: true, delimiter: ';' }, { sort: (a, b) => b.localeCompare(a) },
  { serializeDate: date => String(date.valueOf()) }, { depth: 0 }, { depth: 2 },
];
test('serialization option matrix matches qs 6.17.0', () => {
  const shared = { a: 1 };
  const objects = [
    {}, { a: 1, b: true, c: null, d: undefined, e: '' }, { a: ['x', 'y'], b: [] },
    { a: { b: [1, 2], c: { d: 'x' } }, 'a.b': 'a &b=c?#[]()' },
    { a: Buffer.from('café'), b: new Date('2020-01-02T03:04:05Z'), c: 42n, d: Symbol('s') },
    { a: ['one', null, undefined, new Date('2020-01-01Z')], b: [''] },
    { a: shared, b: shared }, { a: Object.assign(Object.create(null), { b: 'x' }) },
    { a: [Object.create(null), { toString: 'no', valueOf: 3 }, ['b', 'c']] },
    { a: 'é💩\ud800z\udfff', 'bad\ud800': '~!*()\'' },
  ];
  for (const object of objects) for (const options of stringifyOptions) same('stringify', object, options);
});

test('all 65,536 UTF-16 code units match upstream encoding in all three formats', () => {
  for (const format of ['RFC3986', 'RFC1738', 'WHATWG']) {
    // Delimit each code unit so isolated surrogates remain isolated. Also check
    // every 1024-code-unit boundary in upstream's former manual encoder.
    const value = Array.from({ length: 65536 }, (_, i) => String.fromCharCode(i) + 'x').join('');
    same('stringify', { value }, { format });
    for (const length of [0, 1, 1022, 1023, 1024, 2047]) {
      same('stringify', { value: 'x'.repeat(length) + '💩\ud800z\udfff' }, { format });
    }
  }
});

test('astral characters and WHATWG escaping match URLSearchParams for scalar fields', () => {
  let value = '~!*()\' + space';
  for (let point = 0x10000; point <= 0x10ffff; point += 137) value += String.fromCodePoint(point);
  same('stringify', { value }, { format: 'WHATWG' });
  assert.equal(qs.stringify({ value }, { format: 'WHATWG' }), new URLSearchParams({ value }).toString());
});

test('native encoding keeps custom encoder hooks and coercions', () => {
  function encoder(value, encode, charset, kind, format) {
    return encode(kind === 'value' ? 'v:' + String(value) : value, encode, charset, kind, format);
  }
  same('stringify', { a: 'café', b: ['x', 'y'] }, { encoder });
  const arrays = [Object.create(null), { toString: null, valueOf: () => 7 }, { [Symbol.toPrimitive]: () => 'primitive' }];
  same('stringify', { arrays }, { arrayFormat: 'comma' });
});

test('cycles throw while reused siblings and filter transformations remain valid', () => {
  const cycle = {}; cycle.self = cycle;
  const array = []; array.push(array);
  for (const object of [cycle, { a: cycle }, { a: array }]) {
    assert.throws(() => qs.stringify(object), { name: 'RangeError', message: 'Cyclic object value' });
    same('stringify', object);
  }
  const shared = { x: 1 };
  same('stringify', { a: shared, b: shared, c: [shared, shared] });
  same('stringify', { a: cycle }, { filter: (prefix, value) => prefix === 'a' ? 'pruned' : value });
  // A primitive can be replaced by a container; native Map must support the
  // original primitive as a key in the upstream cycle-tracking algorithm.
  same('stringify', { a: 1 }, { filter: (prefix, value) => prefix === 'a' ? { child: value } : value });
  same('stringify', { a: array }, { arrayFormat: 'comma' });
});

test('large flat arrays serialize without exceeding the function argument limit', () => {
  const count = 200000;
  const result = qs.stringify({ a: Array(count).fill('x') }, { arrayFormat: 'repeat' });
  assert.equal(result.length, 4 * count - 1);
  assert.equal(result, 'a=x&'.repeat(count).slice(0, -1));
});

test('named and default ESM exports share the CommonJS implementation', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.default, qs);
  for (const name of ['parse', 'stringify', 'formats']) assert.equal(esm[name], qs[name]);
});
