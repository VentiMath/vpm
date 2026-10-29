'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const Negotiator = require('..');
const Upstream = require('./upstream.cjs');
const cases = [
  ['mediaTypes', 'accept', ['text/html', 'application/json', 'text/plain'],
    [undefined, '', '*/*', 'text/*;q=0.5, application/json', 'TEXT/HTML', 'text/html;q=0, */*;q=1', 'image/png', 'text/plain;q=0.7, text/html;q=0.7']],
  ['charsets', 'accept-charset', ['utf-8', 'ISO-8859-1', 'utf-16'],
    [undefined, '', '*', 'UTF-8', 'utf-8;q=0, *;q=0.5', 'utf-8;q=0.3, iso-8859-1;q=0.7']],
  ['encodings', 'accept-encoding', ['gzip', 'br', 'identity'],
    [undefined, '', '*', 'gzip, br', 'gzip;q=0.5', '*;q=0', 'gzip;q=0, *;q=1', 'identity;q=0, gzip']],
  ['languages', 'accept-language', ['en', 'en-US', 'fr', 'de-DE'],
    [undefined, '', '*', 'en', 'en-US', 'en;q=0.5, fr', 'en-US;q=0, en', 'de;q=0.9, fr;q=0.8']],
];

test('ordinary negotiation agrees with the pinned upstream across all four headers', () => {
  for (const [method, field, available, headers] of cases) for (const header of headers) {
    const request = { headers: { [field]: header } };
    for (const values of [undefined, [], available, available.slice().reverse()]) {
      assert.deepEqual(Negotiator(request)[method](values), Upstream(request)[method](values), JSON.stringify([method, header, values]));
    }
  }
});

test('quality values follow upstream weight parsing in all header types', () => {
  for (const [method, field, available] of cases) {
    for (const value of ['2', '-1', '+1', '0.8junk', 'Infinity', 'NaN', 'abc', '0x1', '1e0', '.5', '.2', '01', '1.001', '0.1234', '0.5000', '1.', '0.', '']) {
      for (const header of [available[0] + ';q=' + value + ', ' + available[1] + ';q=0.5', available[0] + ';Q=' + value]) {
        const headers = { [field]: header };
        assert.deepEqual(Negotiator({ headers })[method](available.slice(0, 2)), Upstream({ headers })[method](available.slice(0, 2)), JSON.stringify([method, header]));
        assert.deepEqual(Negotiator({ headers })[method](), Upstream({ headers })[method](), JSON.stringify([method, header]));
      }
    }
  }
});

test('real client headers with legacy weights negotiate like upstream', () => {
  // Java HttpURLConnection's default Accept header uses q=.2.
  const java = { headers: { accept: 'text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2' } };
  assert.equal(Negotiator(java).mediaType(['application/json']), 'application/json');
  assert.deepEqual(Negotiator(java).mediaTypes(), Upstream(java).mediaTypes());
  for (const headers of [{ accept: 'text/html;q=2, */*;q=1' }, { accept: 'application/json;q=abc, text/html' }, { 'accept-language': 'en;q=.5, en-us' }, { 'accept-encoding': 'gzip;q=.5, br;q=0.4' }]) {
    for (const method of ['mediaTypes', 'languages', 'encodings']) {
      assert.deepEqual(Negotiator({ headers })[method](['text/html', 'application/json', 'en', 'en-us', 'gzip', 'br']), Upstream({ headers })[method](['text/html', 'application/json', 'en', 'en-us', 'gzip', 'br']));
    }
  }
});

test('media specificity and parameter count override wildcard quality', () => {
  const n = Negotiator({ headers: { accept: 'text/*;q=0.3, text/plain;q=0.7, text/plain;format=flowed, text/plain;format=fixed;q=0.4, */*;q=0.5' } });
  assert.deepEqual(n.mediaTypes(['text/plain', 'text/plain;format=flowed', 'text/plain;format=fixed', 'image/jpeg', 'text/html']),
    ['text/plain;format=flowed', 'text/plain', 'image/jpeg', 'text/plain;format=fixed', 'text/html']);
  const header = 'text/html;level=1;q=0.9, text/html;level=1;profile=a;q=0, application/json;q=0.5';
  assert.equal(Negotiator({ headers: { accept: header } }).mediaType(['text/html;level=1;profile=a', 'application/json']), 'application/json');
  assert.equal(Upstream({ headers: { accept: header } }).mediaType(['text/html;level=1;profile=a', 'application/json']), 'text/html;level=1;profile=a');
});

test('quoted commas and escapes survive; parameter values preserve case except charset', () => {
  const n = Negotiator({ headers: { accept: 'application/json;profile="a,b";q=0.9, text/html;q=0.5' } });
  assert.equal(n.mediaType(['text/html', 'application/json;profile="a,b"']), 'application/json;profile="a,b"');
  assert.equal(Negotiator({ headers: { accept: 'text/plain;note="a\\\"b,c"' } }).mediaType(['text/plain;note="a\\\"b,c"']), 'text/plain;note="a\\\"b,c"');
  assert.equal(Negotiator({ headers: { accept: 'text/plain;charset=UTF-8' } }).mediaType(['text/plain;charset=utf-8']), 'text/plain;charset=utf-8');
  for (const profile of ['ABC', '*']) {
    assert.equal(Negotiator({ headers: { accept: 'application/json;profile=' + profile } }).mediaType(['application/json;profile=abc']), undefined);
    assert.equal(Upstream({ headers: { accept: 'application/json;profile=' + profile } }).mediaType(['application/json;profile=abc']), 'application/json;profile=abc');
  }
  // Generic parameter decoding is retained: quoted numbers and first duplicates.
  assert.equal(Negotiator({ headers: { accept: 'text/html;q="0.5";q=0' } }).mediaType(['text/html']), 'text/html');
});

test('equal preferences retain first header occurrence and then offered order', () => {
  assert.deepEqual(Negotiator({ headers: { accept: 'text/html, application/json, text/html' } }).mediaTypes(['application/json', 'text/html']), ['text/html', 'application/json']);
  assert.deepEqual(Negotiator({ headers: { accept: '*/*' } }).mediaTypes(['application/json', 'text/html']), ['application/json', 'text/html']);
  assert.deepEqual(Negotiator({ headers: { accept: 'text/html;q=0.2, text/html;q=0.8' } }).mediaTypes(['text/html']), ['text/html']);
});

test('encoding identity exclusions and caller preferences are preserved', () => {
  for (const header of [undefined, '', 'gzip', 'gzip;q=0.4', 'identity;q=0', '*;q=0', '*;q=0, identity;q=0.5']) {
    const req = { headers: { 'accept-encoding': header } };
    assert.deepEqual(Negotiator(req).encodings(['gzip', 'identity']), Upstream(req).encodings(['gzip', 'identity']));
  }
  const n = Negotiator({ headers: { 'accept-encoding': 'gzip, br' } });
  assert.deepEqual(n.encodings(['gzip', 'br'], { preferred: ['BR', 'gzip'] }), ['br', 'gzip']);
  assert.equal(Negotiator({ headers: { 'accept-encoding': 'gzip;q=0.9, br;q=0.1' } }).encoding(['br', 'gzip'], { preferred: ['br'] }), 'gzip');
  assert.equal(n.encoding(['gzip', 'br'], { preferred: ['br', 'br', 'gzip'] }), 'br');
  assert.equal(n.encodings(undefined, { preferred: ['BR'] })[0], 'br');
});

test('language fallback retains upstream base and regional behavior', () => {
  for (const accept of ['en-US', 'en', 'zh-Hant', 'zh', 'en-US;q=0, en;q=1', 'FR, en;q=0.2']) {
    const request = { headers: { 'accept-language': accept } };
    const available = ['en', 'en-US', 'en-GB', 'zh', 'zh-Hant', 'zh-Hant-TW', 'fr'];
    assert.deepEqual(Negotiator(request).languages(available), Upstream(request).languages(available));
  }
});

test('media names are validated before Unicode folding and invalid offered values are skipped', () => {
  for (const [method, field] of cases) {
    if (method === 'mediaTypes') {
      for (const value of ['text/K', 'text/html\n', 'text/@bad', 'text/html/extra']) assert.deepEqual(Negotiator({ headers: { [field]: value } })[method]([value]), []);
      // A wildcard type with a concrete subtype is a range upstream accepts.
      assert.deepEqual(Negotiator({ headers: { [field]: '*/json' } })[method](['application/json']), Upstream({ headers: { [field]: '*/json' } })[method](['application/json']));
    } else {
      // Languages, charsets and encodings take any nonempty entry, as upstream does (e.g. Java's en_US).
      for (const value of ['en_US', 'bad name']) assert.deepEqual(Negotiator({ headers: { [field]: value } })[method](), Upstream({ headers: { [field]: value } })[method]());
    }
    const actual = method === 'mediaTypes' ? 'text/html' : 'en';
    assert.deepEqual(Negotiator({ headers: { [field]: actual } })[method]([null, 1, {}, actual]), [actual]);
  }
});

test('own header arrays, invalid header values and absent versus empty values are explicit', () => {
  const n = Negotiator({ headers: { accept: ['text/html;q=0.2', 'application/json'] } });
  assert.equal(n.mediaType(['text/html', 'application/json']), 'application/json');
  for (const header of [null, 1, {}, ['text/html', 1]]) {
    assert.deepEqual(Negotiator({ headers: { accept: header } }).mediaTypes(['text/html']), []);
  }
  assert.deepEqual(Negotiator({ headers: Object.create({ accept: 'text/html;q=0' }) }).mediaTypes(['text/html']), ['text/html']);
  assert.deepEqual(Negotiator({ headers: { accept: '' } }).mediaTypes(['text/html']), []);
});

test('request/header/available mutations are reflected without changing caller arrays', () => {
  const request = { headers: { accept: 'text/html' } };
  const n = Negotiator(request), available = ['text/html', 'application/json'];
  assert.equal(n.mediaType(available), 'text/html');
  request.headers = { accept: 'application/json' };
  assert.equal(n.mediaType(available), 'application/json');
  available.reverse();
  assert.equal(n.mediaType(available), 'application/json');
  assert.deepEqual(available, ['application/json', 'text/html']);
  n.request = { headers: { accept: 'text/plain' } };
  assert.equal(n.mediaType(available), undefined);
});

test('constructor and option validation do not invoke coercion hooks', () => {
  for (const request of [null, undefined, 1, {}, { headers: null }, { headers: [] }]) assert.throws(() => Negotiator(request), TypeError);
  const n = Negotiator({ headers: {} });
  assert.throws(() => n.mediaTypes('text/html'), TypeError);
  for (const options of [1, [], { preferred: 'gzip' }, { preferred: [1] }]) assert.throws(() => n.encodings([], options), TypeError);
  const hostile = { toString() { throw new Error('coercion'); } };
  assert.deepEqual(n.mediaTypes([hostile]), []);
});

test('generated valid unique preferences preserve upstream ranking', () => {
  let seed = 91817;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let i = 0; i < 5000; i++) for (const [method, field, available] of cases) {
    const header = available.map(value => value + ';q=' + (next() % 1001 / 1000)).join(', ');
    const request = { headers: { [field]: header } };
    assert.deepEqual(Negotiator(request)[method](available), Upstream(request)[method](available));
  }
});

test('legacy aliases, constructor calls and native ESM exports agree', async () => {
  const request = { headers: {} }, n = new Negotiator(request);
  assert.ok(n instanceof Negotiator);
  assert.ok(Negotiator(request) instanceof Negotiator);
  for (const name of ['Charset', 'Charsets', 'Encoding', 'Encodings', 'Language', 'Languages', 'MediaType', 'MediaTypes']) {
    assert.equal(n['preferred' + name], n[name[0].toLowerCase() + name.slice(1)]);
  }
  assert.equal(Object.isFrozen(Negotiator), true);
  assert.equal(Object.isFrozen(Negotiator.prototype), true);
  const esm = await import('../index.js');
  assert.equal(esm.default, Negotiator); assert.equal(esm.Negotiator, Negotiator);
});
