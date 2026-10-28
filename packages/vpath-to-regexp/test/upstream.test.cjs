'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const p = require('..');
const upstream = require('./fixtures/path-to-regexp-8.4.2.cjs');
const { PARSER_TESTS, COMPILE_TESTS, MATCH_TESTS, STRINGIFY_TESTS } = require('./fixtures/cases.cjs');
// Upstream's match corpus uses plain object literals; compare enumerable values
// while checking the public null-prototype result separately in our own tests.
const plain = value => JSON.parse(JSON.stringify(value));
for (const [i, { path, options, expected }] of PARSER_TESTS.entries()) test('upstream parse ' + i, () => {
  assert.deepEqual(p.parse(path, options), expected);
  assert.deepEqual(plain(p.parse(path, options)), plain(upstream.parse(path, options)));
});
for (const [i, { data, expected }] of STRINGIFY_TESTS.entries()) test('upstream stringify ' + i, () => {
  assert.equal(p.stringify(data), expected);
  assert.equal(upstream.stringify(data), expected);
});
for (const [i, { path, options, tests }] of COMPILE_TESTS.entries()) for (const [j, { input, expected }] of tests.entries()) test('upstream compile ' + i + '/' + j, () => {
  const fn = p.compile(path, options), original = upstream.compile(path, options);
  if (expected === null) { assert.throws(() => fn(input)); assert.throws(() => original(input)); }
  else { assert.equal(fn(input), expected); assert.equal(original(input), expected); }
});
for (const [i, { path, options, tests }] of MATCH_TESTS.entries()) for (const [j, { input, expected }] of tests.entries()) test('upstream match ' + i + '/' + j, () => {
  assert.deepEqual(plain(p.match(path, options)(input)), plain(expected));
  assert.deepEqual(plain(upstream.match(path, options)(input)), plain(expected));
  // Preserve upstream's complete expression and capture ordering.
  const a = p.pathToRegexp(path, options), b = upstream.pathToRegexp(path, options);
  assert.equal(a.regexp.source, b.regexp.source); assert.equal(a.regexp.flags, b.regexp.flags);
  assert.deepEqual(plain(a.keys), plain(b.keys));
});
test('upstream error contracts and Unicode offsets', () => {
  const cases = [
    ['parse', '/{'], ['parse', '/{:foo,'], ['parse', '/{:foo/{x,y}'], ['parse', '/:/'], ['parse', '/*/'],
    ['parse', '/:"foo'], ['parse', '/foo\\'], ['parse', '/foo/{bar\\'], ['parse', '/foo/:bar\\'], ['parse', '/foo/*bar\\'], ['parse', '/foo/:"bar\\'],
    ...['}', '(', ')', '[', ']', '+', '?', '!'].map(c => ['parse', '/foo/' + c]),
    ['parse', '/😀/:'], ['parse', '/😀/{'], ['parse', '/😀/:"x'], ['pathToRegexp', '/:a:b'],
    ['pathToRegexp', new p.TokenData([{ type: 'param', name: 'a' }, { type: 'param', name: 'b' }], '/[a][b]')],
    ['pathToRegexp', '{/x}'.repeat(10)], ['stringify', { tokens: [{ type: 'unknown', value: 'test' }] }],
  ];
  for (const [method, value] of cases) {
    let original; try { upstream[method](value); } catch (error) { original = error; }
    assert.ok(original, method);
    assert.throws(() => p[method](value), error => error.message === original.message && error.originalPath === original.originalPath && error instanceof TypeError);
  }
  for (const [path, data] of [['/a/:b/c', undefined], ['/*foo', { foo: [] }], ['/:foo', { foo: [] }], ['/*foo', { foo: 'a' }], ['/*foo', { foo: [1, 'a'] }]]) {
    let expected; try { upstream.compile(path)(data); } catch (error) { expected = error.message; }
    assert.throws(() => p.compile(path)(data), { message: expected });
  }
  for (const path of [undefined, '/{:foo,']) {
    const error = new p.PathError('Unexpected end', path);
    assert.ok(error instanceof TypeError); assert.equal(error.message, new upstream.PathError('Unexpected end', path).message);
    assert.equal(error.originalPath, path);
  }
});
