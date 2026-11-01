'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');

const load = () => import(path.join(__dirname, '../protected-api.js'));
// Records each fetch and answers from `reply`.
function stubFetch(t, reply = () => ({ok: true, status: 200, json: async () => ['event']})) {
  const calls = [], previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => { calls.push({url, options}); return reply(url, options); };
  t.after(() => { globalThis.fetch = previous; });
  return calls;
}

test('exports, entry and package metadata', async () => {
  const api = await load();
  assert.deepEqual(Object.keys(api).sort(), ['JsonRequestError', 'identity', 'requestJson']);
  assert.deepEqual(Object.keys(await import(path.join(__dirname, '../index.js'))), []);
  const metadata = require('../package.json');
  assert.equal(metadata.dependencies, undefined);
  assert.equal(metadata.peerDependencies, undefined);
  assert.equal(metadata.type, 'module');
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), /console/);
  const value = {a: 1};
  assert.equal(api.identity(value), value);
});

test('GET parameters join the query ahead of any fragment', async t => {
  const {requestJson} = await load(), calls = stubFetch(t);
  const params = {start: '2026-11-01T00:00:00', end: '2026-12-13'};
  for (const url of ['/feed', '/feed?calendar=7', '/feed?', '/feed?calendar=7&', '/feed#week', '/feed?calendar=7#week', 'https://example.test/feed#a#b']) await requestJson('get', url, params);
  await requestJson('GET', '/feed#week', {});
  await requestJson('GET', '/feed', {});
  const query = 'start=2026-11-01T00%3A00%3A00&end=2026-12-13';
  assert.deepEqual(calls.map(call => call.url), [
    '/feed?' + query, '/feed?calendar=7&' + query, '/feed?' + query, '/feed?calendar=7&' + query,
    '/feed?' + query + '#week', '/feed?calendar=7&' + query + '#week', 'https://example.test/feed?' + query + '#a#b',
    '/feed#week', '/feed',
  ]);
  assert.deepEqual(calls[0].options, {method: 'GET'});
});

test('other methods send form-encoded bodies', async t => {
  const {requestJson} = await load(), calls = stubFetch(t);
  const [events, response] = await requestJson('post', '/feed#week', {start: 'a b', tags: ['x', 'y'], missing: undefined});
  assert.deepEqual(events, ['event']);
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, '/feed#week');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(String(calls[0].options.body), 'start=a+b&tags=x%2Cy&missing=undefined');
  assert.deepEqual(calls[0].options.headers, {'Content-Type': 'application/x-www-form-urlencoded'});
});

test('failed responses and unparseable JSON reject with JsonRequestError', async t => {
  const {requestJson, JsonRequestError} = await load();
  const failed = {ok: false, status: 503, json: async () => ({})}, broken = {ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); }};
  let next = failed;
  stubFetch(t, () => next);
  await assert.rejects(requestJson('GET', '/feed', {}), error => error instanceof JsonRequestError && error.message === 'Request failed' && error.response === failed);
  next = broken;
  await assert.rejects(requestJson('GET', '/feed', {}), error => error instanceof JsonRequestError && error.message === 'Failure parsing JSON' && error.response === broken);
  const error = new JsonRequestError('x', failed);
  assert.ok(error instanceof Error);
  assert.equal(error.name, 'Error');
});

test('network errors pass through unchanged', async t => {
  const {requestJson, JsonRequestError} = await load(), failure = new TypeError('fetch failed');
  stubFetch(t, () => { throw failure; });
  await assert.rejects(requestJson('GET', '/feed', {}), error => error === failure && !(error instanceof JsonRequestError));
});
