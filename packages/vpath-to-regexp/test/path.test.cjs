'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { runInNewContext } = require('node:vm');
const p = require('..');
const upstream = require('./fixtures/path-to-regexp-8.4.2.cjs');
const plain = x => JSON.parse(JSON.stringify(x));
const data = tokens => new p.TokenData(tokens);

test('fixture bytes and generated corpus match provenance', () => {
  const provenance = require('../PROVENANCE.json');
  for (const source of [provenance.source, ...provenance.upstreamTests, provenance.generatedCorpus]) {
    const bytes = fs.readFileSync(path.join(__dirname, '..', source.fixture || source.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
  }
});
test('compiled templates, matchers and returned keys are isolated from caller tokens', () => {
  const text = { type: 'text', value: '/' }, param = { type: 'param', name: 'id' };
  const input = data([text, param]);
  const match = p.match(input), compile = p.compile(input), result = p.pathToRegexp(input);
  param.name = 'changed'; text.value = '/changed/'; input.tokens.length = 0;
  assert.deepEqual(plain(match('/x')), { path: '/x', params: { id: 'x' } });
  assert.equal(compile({ id: 'x' }), '/x');
  assert.deepEqual(result.keys, [{ type: 'param', name: 'id' }]);
  result.keys[0].name = 'different';
  assert.equal(match('/x').params.id, 'x');
  const original = data([{ type: 'text', value: '/' }, { type: 'param', name: 'id' }]);
  const old = upstream.match(original); original.tokens[1].name = 'changed';
  assert.equal(old('/x').params.changed, 'x');
});
test('stringify preserves every UTF-16 code unit in parameter names', () => {
  for (let i = 0; i <= 0xffff; i++) {
    const name = 'a' + String.fromCharCode(i) + 'z';
    assert.equal(p.parse(p.stringify(data([{ type: 'param', name }]))).tokens[0].name, name);
  }
  for (const name of ['a\nb', 'a\tb', 'a\0b', '\\"\r\n', '𐐀', 'x😀z']) {
    const tokens = [{ type: 'wildcard', name }];
    assert.deepEqual(p.parse(p.stringify(data(tokens))).tokens, tokens);
  }
  const broken = data([{ type: 'param', name: 'a\nb' }]);
  assert.notEqual(upstream.parse(upstream.stringify(broken)).tokens[0].name, 'a\nb');
});
test('stringify keeps identifiers separate from astral and empty text neighbors', () => {
  for (const tail of ['𐐀', 'x', '\u200c']) {
    const tokens = [{ type: 'param', name: 'name' }, { type: 'text', value: '' }, { type: 'text', value: tail }];
    assert.deepEqual(p.parse(p.stringify(data(tokens))).tokens, [tokens[0], tokens[2]]);
  }
});
test('compile reads own parameter and wildcard entries once without prototype fallback', () => {
  let reads = 0, lengths = 0, parts = 0;
  const wildcard = new Proxy(['a', 'b'], { get(target, key) { if (key === 'length') lengths++; else if (key === '0' || key === '1') parts++; return target[key]; } });
  assert.equal(p.compile('/*parts')({ get parts() { reads++; return wildcard; } }), '/a/b');
  assert.deepEqual([reads, lengths, parts], [1, 1, 2]);
  assert.throws(() => p.compile('/:id')(Object.create({ id: 'inherited' })), /Missing parameters/);
  const sparse = new Array(1); Object.setPrototypeOf(sparse, { 0: 'inherited' });
  assert.throws(() => p.compile('/*parts')({ parts: sparse }), /parts\/0/);
  assert.equal(p.compile('/:"__proto__"')(Object.assign(Object.create(null), { ['__proto__']: 'safe' })), '/safe');
});
test('options are snapshotted once and wildcard splitting uses the same delimiter as matching', () => {
  const counts = Object.create(null), options = {};
  for (const [key, value] of Object.entries({ encodePath: x => x, delimiter: '.', end: true, trailing: false, sensitive: true, decode: x => x.toUpperCase() })) {
    Object.defineProperty(options, key, { get() { counts[key] = (counts[key] || 0) + 1; return value; } });
  }
  const match = p.match('*parts', options);
  assert.deepEqual(match('a.b').params.parts, ['A', 'B']);
  assert.deepEqual(Object.values(counts), [1, 1, 1, 1, 1, 1]);
});
test('token graphs use single field and array reads, with frozen and foreign data supported', () => {
  const count = { tokens: 0, originalPath: 0, type: 0, name: 0, length: 0, index: 0 };
  const token = { get type() { count.type++; return 'param'; }, get name() { count.name++; return 'x'; } };
  const tokens = new Proxy([token], { get(target, key) { if (key === 'length') count.length++; if (key === '0') count.index++; if (key === Symbol.iterator || key === 'slice') throw Error('unused'); return target[key]; } });
  const input = { get tokens() { count.tokens++; return tokens; }, get originalPath() { count.originalPath++; return undefined; } };
  assert.equal(p.compile(input)({ x: 'yes' }), 'yes');
  assert.ok(Object.values(count).every(n => n === 1));
  const foreign = runInNewContext('Object.freeze({tokens: Object.freeze([Object.freeze({type:"text",value:"/"}), Object.freeze({type:"param",name:"x"})])})');
  assert.equal(p.match(foreign)('/ok').params.x, 'ok');
});
test('custom callbacks retain receiver, call order, wildcard map arguments and thrown errors', () => {
  const calls = [];
  const decoder = function (value, index, array) { assert.equal(this, undefined); calls.push([value, index, array?.slice()]); return value.toUpperCase(); };
  assert.deepEqual(p.match('/*x', { decode: decoder })('/a/b').params.x, ['A', 'B']);
  assert.deepEqual(calls, [['a', 0, ['a', 'b']], ['b', 1, ['a', 'b']]]);
  const error = new Error('callback');
  for (const make of [() => p.parse('/a', { encodePath() { throw error; } }), () => p.compile('/:x', { encode() { throw error; } })({ x: 'a' }), () => p.match('/:x', { decode() { throw error; } })('/a')]) assert.throws(make, e => e === error);
  for (const value of [null, undefined, 1, {}, Promise.resolve('x')]) {
    assert.throws(() => p.parse('/a', { encodePath: () => value }), TypeError);
    assert.throws(() => p.compile('/:x', { encode: () => value })({ x: 'a' }), TypeError);
    assert.throws(() => p.match('/:x', { decode: () => value })('/a'), TypeError);
    assert.throws(() => p.match('/*x', { decode: () => value })('/a/b'), TypeError);
  }
});
test('default decoding preserves malformed URI errors, encoded delimiters and literal Unicode', () => {
  for (const input of ['/plain', '/%2F', '/caf%C3%A9', '/😀', '/\ud800', '/a\nb']) assert.deepEqual(p.match('/:x')(input), upstream.match('/:x')(input));
  for (const input of ['/%', '/%GG', '/%E0%A4', '/%ED%A0%80']) {
    assert.throws(() => p.match('/:x')(input), URIError);
    assert.throws(() => p.match('/*x')(input), URIError);
    assert.equal(p.match('/:x', { decode: false })(input).params.x, input.slice(1));
  }
  assert.deepEqual(p.match('/*x')('/a%2Fb/c').params.x, ['a/b', 'c']);
});
test('default URL encoding agrees with the native encoder across every UTF-16 code unit', () => {
  const fn = p.compile('/:x'), wildcard = p.compile('/*x');
  for (let i = 0; i <= 0xffff; i++) {
    const value = 'a' + String.fromCharCode(i) + 'z';
    if (i >= 0xd800 && i <= 0xdfff) {
      assert.throws(() => fn({ x: value }), URIError);
      assert.throws(() => wildcard({ x: [value] }), URIError);
    } else {
      assert.equal(fn({ x: value }), '/' + encodeURIComponent(value));
      assert.equal(wildcard({ x: [value] }), '/' + encodeURIComponent(value));
    }
  }
  assert.equal(fn({ x: '𐐀😀' }), '/' + encodeURIComponent('𐐀😀'));
});
test('full and prefix matching preserve delimiters, trailing behavior and original casing', () => {
  assert.deepEqual(plain(p.match('/fixed')('/FIXED/')), { path: '/FIXED/', params: {} });
  for (const input of ['/fixed\n', '/fixed\r', '/fixed\u2028', '/fixedx']) assert.equal(p.match('/fixed')(input), false);
  assert.equal(p.match('/fixed', { end: false })('/fixed/child').path, '/fixed');
  assert.equal(p.match('/fixed', { end: false })('/fixedish'), false);
  assert.equal(p.match('/fixed', { trailing: false })('/fixed/'), false);
  assert.equal(p.match('/fixed', { sensitive: true })('/FIXED'), false);
  assert.equal(p.match('/fixed')('/fixed').params !== p.match('/fixed')('/fixed').params, true);
});
test('malformed public inputs and options fail without coercion', () => {
  const hostile = { toString() { throw Error('must not coerce'); } };
  for (const value of [undefined, null, 1, false, Symbol(), hostile, []]) {
    assert.throws(() => p.parse(value), TypeError);
    assert.throws(() => p.match('/:x')(value), TypeError);
  }
  for (const value of [null, false, 1, '', [], () => {}]) for (const fn of [p.parse, p.compile, p.match, p.pathToRegexp]) assert.throws(() => fn('/x', value), TypeError);
  for (const key of ['end', 'sensitive', 'trailing']) for (const value of [0, 1, null, 'true']) assert.throws(() => p.match('/x', { [key]: value }), TypeError);
  for (const key of ['encodePath', 'encode', 'decode']) for (const value of [true, null, 1, 'x']) assert.throws(() => (key === 'encode' ? p.compile : p.match)('/x', { [key]: value }), TypeError);
  for (const value of ['', null, 1, {}, []]) assert.throws(() => p.match('/x', { delimiter: value }), TypeError);
  for (const value of [null, [], 1, false, 'x']) assert.throws(() => p.compile('/:x')(value), TypeError);
});
test('malformed, cyclic and excessively nested token graphs fail deterministically', () => {
  const cyclic = []; cyclic.push({ type: 'group', tokens: cyclic });
  const paths = []; paths.push(paths);
  for (const fn of [p.compile, p.match, p.pathToRegexp, p.stringify]) assert.throws(() => fn(data(cyclic)), p.PathError);
  assert.throws(() => p.match(paths), p.PathError);
  for (const input of [{ tokens: {} }, data([null]), data([{ type: 'text', value: 1 }]), data([{ type: 'param', name: '' }]), data(new Array(1)), { tokens: [], originalPath: 1 }]) {
    for (const fn of [p.compile, p.match, p.pathToRegexp, p.stringify]) assert.throws(() => fn(input), TypeError);
  }
  for (const fn of [p.parse, p.compile, p.match, p.pathToRegexp]) assert.throws(() => fn('{'.repeat(129) + 'x' + '}'.repeat(129)), /maximum 128/);
  assert.doesNotThrow(() => p.parse('{'.repeat(128) + 'x' + '}'.repeat(128)));
});
test('alternative expansion retains the 256 limit and guards before flattening', () => {
  assert.equal(p.pathToRegexp('{/x}'.repeat(8)).regexp.test(''), true);
  for (const path of ['{/x}'.repeat(9), '{}'.repeat(10000), Array(257).fill('/x')]) assert.throws(() => p.pathToRegexp(path), /Too many path combinations/);
  assert.equal(p.match([['/a'], ['/b/:id']])('/b/x').params.id, 'x');
});
test('optional groups preserve omission, missing-parameter order and duplicate names', () => {
  const fn = p.compile('/a{/:b{/:c}}/:d');
  assert.equal(fn({ b: 'B', d: 'D' }), '/a/B/D');
  assert.equal(fn({ c: 'C', d: 'D' }), '/a/D');
  assert.throws(() => p.compile('/:a/:b')({}), /Missing parameters: a, b/);
  const matched = p.match('/:x/:x')('/a/b'); assert.equal(matched.params.x, 'b');
  assert.equal(Object.getPrototypeOf(matched.params), null);
  assert.equal(p.match('/:"__proto__"')('/safe').params.__proto__, 'safe');
});
test('generated route matches and URL creation agree with verified upstream', () => {
  let seed = 0x316495ab;
  const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const routes = ['/users/:id', '/file{.:ext}', '/a{/:b}/:c', '/*path', '/a/:b-:c', '/a/*b.:c', '/固定/:id', '/:x/:x', ['/a/:id', '/b/:id']];
  const inputs = ['/users/alice', '/file', '/file.txt', '/a/B/C', '/a/B-C', '/a/B.txt', '/固定/雪', '/a/b/c', '/a/%', '/a/%2F', '/a/abc\n', '', '/b/2'];
  for (let i = 0; i < 4000; i++) {
    const route = routes[rand() % routes.length], input = inputs[rand() % inputs.length];
    const options = { end: !!(rand() & 1), sensitive: !!(rand() & 1), trailing: !!(rand() & 1), decode: rand() & 1 ? false : undefined };
    let result, error;
    try { result = upstream.match(route, options)(input); } catch (e) { error = e; }
    if (error) assert.throws(() => p.match(route, options)(input), { name: error.name, message: error.message });
    else assert.deepEqual(p.match(route, options)(input), result);
    if (!Array.isArray(route)) {
      const values = { id: 'a/b', ext: 'txt', b: route.includes('*b') ? ['a', 'b'] : 'B', c: 'C', x: 'x', path: ['α', 'b'] };
      assert.equal(p.compile(route)(values), upstream.compile(route)(values));
    }
  }
});
test('adversarial separated captures retain upstream backtracking safeguards', () => {
  for (const route of ['/:a-:b', '/:a-:b-:c', '/*a.:b', '/:a.*b', '/*a/*b', '/*a-:b-*c']) {
    const a = p.pathToRegexp(route), b = upstream.pathToRegexp(route);
    assert.equal(a.regexp.source, b.regexp.source);
    for (const input of ['/' + 'x'.repeat(20000), '/' + '-'.repeat(20000) + '/!', '/' + '.'.repeat(20000) + '/!']) assert.equal(a.regexp.test(input), b.regexp.test(input));
  }
});
test('CJS and ESM exports preserve identities', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.default, p); assert.ok(Object.isFrozen(p));
  for (const key of ['parse', 'compile', 'match', 'pathToRegexp', 'stringify', 'TokenData', 'PathError']) assert.equal(esm[key], p[key]);
});
