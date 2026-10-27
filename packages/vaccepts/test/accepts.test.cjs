'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const Accepts = require('..');
const Upstream = require('./upstream.cjs');

test('ordinary Express-style array and variadic calls preserve upstream results', () => {
  const cases = [
    ['types', 'accept', ['html', 'json', 'text/plain'], [undefined, '*/*', 'text/html', 'application/json', 'text/*;q=0.5, application/json', 'image/png']],
    ['encodings', 'accept-encoding', ['gzip', 'br', 'identity'], [undefined, '', '*', 'gzip;q=0.5, br', 'identity;q=0', '*;q=0']],
    ['charsets', 'accept-charset', ['utf-8', 'iso-8859-1'], [undefined, '', '*', 'utf-8', 'utf-8;q=0, *;q=1']],
    ['languages', 'accept-language', ['en', 'en-US', 'fr'], [undefined, '', '*', 'en', 'en-US', 'fr, en;q=0.5']],
  ];
  for (const [method, field, values, headers] of cases) for (const header of headers) {
    const request = { headers: { [field]: header } }, v = Accepts(request), u = Upstream(request);
    assert.deepEqual(v[method](), u[method]());
    assert.deepEqual(v[method]([]), u[method]([]));
    assert.deepEqual(v[method](values), u[method](values));
    assert.deepEqual(v[method](...values), u[method](...values));
  }
});

test('distinguishes an absent Accept header from an explicitly empty one', () => {
  assert.equal(Accepts({ headers: {} }).types(['json', 'html']), 'json');
  assert.equal(Accepts({ headers: { accept: '' } }).types(['json', 'html']), false);
  assert.equal(Upstream({ headers: { accept: '' } }).types(['json', 'html']), 'json');
  assert.equal(Accepts({ headers: { accept: [] } }).types('html'), false);
});

test('invalid first offers and unknown extensions cannot bypass matching when Accept is absent', () => {
  const a = Accepts({ headers: {} });
  assert.equal(a.types(['not-a-known-extension', 'json']), 'json');
  assert.equal(a.types(['text/@bad', 'json']), 'json');
  assert.equal(a.types([null, 1, 'html']), 'html');
  assert.equal(a.types(['not-a-known-extension']), false);
  assert.equal(Upstream({ headers: {} }).types(['not-a-known-extension', 'json']), 'not-a-known-extension');
});

test('extension aliases return the first original offer and preserve its spelling', () => {
  const a = Accepts({ headers: { accept: 'text/html' } });
  assert.equal(a.types(['htm', 'html']), 'htm');
  assert.equal(a.types(['html', 'htm']), 'html');
  assert.equal(a.types(['HTML', 'text/html']), 'HTML');
  assert.equal(a.types(['TEXT/HTML', 'html']), 'TEXT/HTML');
  assert.equal(a.types(['application/json', 'text/html;level=1']), 'text/html;level=1');
});

test('all methods apply strict quality values and zero exclusions', () => {
  for (const [method, field, values] of [
    ['types', 'accept', ['text/html', 'application/json']],
    ['encodings', 'accept-encoding', ['gzip', 'br']],
    ['charsets', 'accept-charset', ['utf-8', 'iso-8859-1']],
    ['languages', 'accept-language', ['en', 'fr']],
  ]) {
    assert.equal(Accepts({ headers: { [field]: values[0] + ';q=2, ' + values[1] + ';q=0.8' } })[method](values), values[1]);
    assert.equal(Accepts({ headers: { [field]: values[0] + ';q=0' } })[method]([values[0]]), false);
  }
});

test('quoted parameters, parameter specificity and case sensitivity flow through the wrapper', () => {
  const a = Accepts({ headers: { accept: 'application/json;profile="a,b";q=0.9, text/html;q=0.5' } });
  assert.equal(a.types(['html', 'application/json;profile="a,b"']), 'application/json;profile="a,b"');
  assert.equal(Accepts({ headers: { accept: 'application/json;profile=ABC' } }).types('application/json;profile=abc'), false);
  const b = Accepts({ headers: { accept: 'text/html;level=1;q=0.9, text/html;level=1;profile=a;q=0' } });
  assert.equal(b.types('text/html;level=1;profile=a'), false);
});

test('headers and preferences stay coherent after request mutation', () => {
  const request = { headers: { accept: 'text/html' } }, a = Accepts(request);
  const types = ['html', 'json'];
  assert.equal(a.types(types), 'html');
  request.headers = { accept: 'application/json' };
  assert.equal(a.headers, request.headers);
  assert.equal(a.types(types), 'json');
  types[1] = 'xml';
  assert.equal(a.types(types), false);
  assert.deepEqual(types, ['html', 'xml']);
  a.negotiator.request = { headers: { accept: 'text/html' } };
  assert.equal(a.types(types), 'html');
});

test('header arrays and inherited fields follow the negotiator contract', () => {
  const a = Accepts({ headers: { accept: ['text/html;q=0.1', 'application/json'] } });
  assert.equal(a.types('html', 'json'), 'json');
  assert.equal(Accepts({ headers: Object.create({ accept: 'application/json' }) }).types('html', 'json'), 'html');
  for (const value of [null, 1, {}]) assert.equal(Accepts({ headers: { accept: value } }).types('html'), false);
});

test('invalid requests are rejected and invalid offers are skipped without coercion', () => {
  for (const request of [null, undefined, 1, {}, { headers: [] }]) assert.throws(() => Accepts(request), TypeError);
  const hostile = { toString() { throw new Error('coercion'); } };
  assert.equal(Accepts({ headers: {} }).types([hostile, 'html']), 'html');
  assert.equal(Accepts({ headers: {} }).languages([hostile, 'en']), 'en');
});

test('generated valid Accept preferences preserve upstream wrapper results', () => {
  let seed = 72819;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const types = ['text/html', 'application/json', 'text/plain', 'image/png'];
  const offers = ['html', 'json', 'txt', 'png'];
  for (let count = 0; count < 5000; count++) {
    const headers = { accept: types.map(value => value + ';q=' + (next() % 1001 / 1000)).join(',') };
    assert.equal(Accepts({ headers }).types(offers), Upstream({ headers }).types(offers));
  }
});

test('constructors, all aliases, list returns and ESM default imports work', async () => {
  const a = new Accepts({ headers: {} });
  assert.ok(a instanceof Accepts); assert.ok(Accepts({ headers: {} }) instanceof Accepts);
  for (const kind of ['type', 'charset', 'encoding', 'language']) {
    assert.equal(a[kind], a[kind + 's']);
    assert.ok(Array.isArray(a[kind]()));
    assert.ok(Array.isArray(a[kind]([])));
  }
  assert.equal(a.lang, a.language); assert.equal(a.langs, a.languages);
  assert.equal(Object.isFrozen(Accepts), true); assert.equal(Object.isFrozen(Accepts.prototype), true);
  assert.equal((await import('../index.js')).default, Accepts);
});
