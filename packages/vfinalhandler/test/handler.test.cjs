'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { setImmediate: tick } = require('node:timers/promises');
const finalhandler = require('..');
const upstream = require('./load-upstream.cjs');
const { Request, Response, snapshot } = require('./helpers.cjs');

function run(handler, { req = {}, res = {}, error, options = { env: 'test' } } = {}) {
  const request = Object.assign(new Request(), req);
  const response = Object.assign(new Response(), res);
  handler(request, response, options)(error);
  return { request, response };
}

test('matches upstream handler output across normal 404, error, status, and header cases', () => {
  const errors = [undefined, null, false, 0, '', 'broken', new Error('a <b> & "c"\n  detail'),
    Object.create(null), { status: 400 }, { status: 404, statusCode: 500 }, { statusCode: 503 },
    { status: '401', statusCode: 402 }, { status: 399, statusCode: 600 },
    { status: 429, headers: { 'Retry-After': '5', 'Set-Cookie': ['a=1', 'b=2'] } },
    { headers: { 'X-Ignored': 'yes' } }, { status: 400, headers: 'ignored' }];
  for (const method of ['GET', 'HEAD', 'POST']) {
    for (const env of ['test', 'production']) {
      for (const statusCode of [200, 404, 500, 600, '403']) {
        for (const error of errors) {
          const input = { req: { method, originalUrl: '/original/<tag>?secret=1' },
            res: { statusCode }, error, options: { env } };
          assert.deepEqual(snapshot(run(finalhandler, input).response), snapshot(run(upstream, input).response));
        }
      }
    }
  }
});

test('all standard error statuses preserve their reason phrases', () => {
  const statuses = require('vstatuses');
  for (const status of statuses.codes.filter(code => code >= 400)) {
    const input = { error: { status }, options: { env: 'production' } };
    assert.deepEqual(snapshot(run(finalhandler, input).response), snapshot(run(upstream, input).response));
  }
});

test('404 paths use originalUrl, omit queries, encode URLs, and escape HTML', () => {
  const { response } = run(finalhandler, { req: { originalUrl: '/<a>&"\uD800\uD800/%a?password=secret' } });
  assert.match(response.body, /Cannot GET \/%3Ca%3E&amp;%22%EF%BF%BD%EF%BF%BD\/%25a/);
  assert.doesNotMatch(response.body, /password|secret/);
  assert.equal(response.headers['content-length'], Buffer.byteLength(response.body));
});

test('missing, malformed, and empty resource names have a readable fallback', () => {
  for (const url of [undefined, null, 1, '', '?x=1']) {
    assert.match(run(finalhandler, { req: { url } }).response.body, /Cannot GET resource/);
  }
});

test('production hides error details even with expose=true', () => {
  const error = Object.assign(new Error('private token'), { status: 403, expose: true });
  const { response } = run(finalhandler, { error, options: { env: 'production' } });
  assert.match(response.body, /Forbidden/);
  assert.doesNotMatch(response.body, /private token/);
});

test('environment defaults to NODE_ENV and then development', () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.doesNotMatch(run(finalhandler, { error: 'secret', options: null }).response.body, /secret/);
    delete process.env.NODE_ENV;
    assert.match(run(finalhandler, { error: 'secret', options: null }).response.body, /secret/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('HEAD keeps the GET byte length but sends no body', () => {
  const get = run(finalhandler, { error: 'é <tag>' }).response;
  const head = run(finalhandler, { req: { method: 'HEAD' }, error: 'é <tag>' }).response;
  assert.equal(head.body, '');
  assert.equal(head.headers['content-length'], Buffer.byteLength(get.body));
});

test('invalid numeric statuses fall back in order without NaN or fractional responses', () => {
  for (const status of [NaN, Infinity, -Infinity, 400.5, 599.5, 399, 600, '404']) {
    assert.equal(run(finalhandler, { error: { status, statusCode: 401 } }).response.statusCode, 401);
    assert.equal(run(finalhandler, { error: { status, statusCode: status }, res: { statusCode: 402 } }).response.statusCode, 402);
    assert.equal(run(finalhandler, { error: {}, res: { statusCode: status } }).response.statusCode, 500);
  }
});

test('unknown integer error codes get a defined reason phrase', () => {
  const { response } = run(finalhandler, { error: { status: 499 }, options: { env: 'production' } });
  assert.equal(response.statusCode, 499);
  assert.equal(response.statusMessage, 'Unknown Error');
  assert.match(response.body, /Unknown Error/);
  assert.doesNotMatch(response.body, /undefined/);
});

test('error headers need an explicit valid error status', () => {
  for (const status of [undefined, NaN, 400.5, 200, '400']) {
    const { response } = run(finalhandler, { error: { status, headers: { 'X-Error': 'value' } }, res: { statusCode: 400 } });
    assert.equal(response.headers['x-error'], undefined);
  }
});

test('replaces representation and framing headers while retaining unrelated headers', () => {
  const req = new Request();
  const res = new Response();
  const obsolete = { 'Content-Encoding': 'gzip', 'Content-Language': 'nl', 'Content-Range': 'bytes 0-3/4',
    'Transfer-Encoding': 'chunked', Trailer: 'Digest' };
  for (const [name, value] of Object.entries(obsolete)) res.setHeader(name, value);
  res.setHeader('X-Existing', 'kept');
  finalhandler(req, res)({ status: 429, headers: { ...obsolete, 'Retry-After': '5',
    'content-length': 1, 'CONTENT-TYPE': 'application/json', 'Content-Security-Policy': 'unsafe',
    'X-Content-Type-Options': 'unsafe' } });
  for (const name of Object.keys(obsolete)) assert.equal(res.headers[name.toLowerCase()], undefined);
  assert.equal(res.headers['x-existing'], 'kept');
  assert.equal(res.headers['retry-after'], '5');
  assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(res.headers['content-length'], Buffer.byteLength(res.body));
  assert.equal(res.headers['content-security-policy'], "default-src 'none'");
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});

test('preserves explicit 416 range metadata while discarding a stale partial range', () => {
  for (const status of [400, 416, 500]) {
    const { response } = run(finalhandler, { error: { status, headers: { 'cOnTeNt-RaNgE': 'bytes */20' } } });
    assert.equal(response.headers['content-range'], status === 416 ? 'bytes */20' : undefined);
  }
  const req = new Request(); const res = new Response();
  res.setHeader('Content-Range', 'bytes 0-3/20');
  finalhandler(req, res)({ status: 416 });
  assert.equal(res.headers['content-range'], undefined);
});

test('snapshots error headers including array values before request draining', () => {
  const req = new Request(true); const res = new Response();
  const headers = { 'Retry-After': '5', 'Set-Cookie': ['a=1'] };
  finalhandler(req, res)({ status: 429, headers });
  headers['Retry-After'] = '10'; headers['Set-Cookie'].push('b=2');
  req.finish();
  assert.equal(res.headers['retry-after'], '5');
  assert.deepEqual(res.headers['set-cookie'], ['a=1']);
});

test('first completion wins while pending and after the response finishes', async () => {
  for (const pending of [false, true]) {
    const req = new Request(pending); const res = new Response(); const logged = [];
    const done = finalhandler(req, res, { onerror: error => logged.push(error) });
    const first = { status: 401 }; const second = { status: 500 }; const third = { status: 403 };
    done(first); done(second); done();
    if (pending) req.finish();
    done(third);
    await tick();
    assert.equal(res.statusCode, 401); assert.equal(res.ends, 1);
    // Later errors are still reported, since Express and connect cannot log them otherwise.
    assert.deepEqual(logged, [first, second, third]); assert.equal(req.socket.destroys, 0);
  }
});

test('first 404 wins over a later error during draining, which is still reported', async () => {
  const req = new Request(true); const res = new Response(); const logged = [];
  const done = finalhandler(req, res, { onerror: error => logged.push(error) });
  const late = new Error('late');
  done(); done(late); req.finish(); await tick();
  assert.equal(res.statusCode, 404); assert.equal(res.ends, 1); assert.deepEqual(logged, [late]);
});

test('ignored 404 on a started response still permits a later error', async () => {
  const req = new Request(); const res = new Response(); const logged = [];
  res.headersSent = true;
  const done = finalhandler(req, res, { onerror: error => logged.push(error) });
  done(); assert.equal(req.socket.destroys, 0);
  const error = new Error('late'); done(error); await tick();
  assert.equal(req.socket.destroys, 1); assert.deepEqual(logged, [error]); assert.equal(res.ends, 0);
});

test('draining unpipes and resumes the request, then cleans up completion listeners', () => {
  const req = new Request(true); const res = new Response();
  finalhandler(req, res)();
  assert.equal(req.unpipes, 1); assert.equal(req.resumes, 1); assert.equal(res.ends, 0);
  req.finish();
  assert.equal(res.ends, 1);
  for (const event of ['end', 'finish', 'socket']) assert.equal(req.listenerCount(event), 0);
  for (const event of ['error', 'close']) assert.equal(req.socket.listenerCount(event), 0);
});

test('rechecks headers sent by another writer during draining', () => {
  for (const error of [undefined, new Error('failure')]) {
    const req = new Request(true); const res = new Response();
    finalhandler(req, res)(error); res.headersSent = true;
    assert.doesNotThrow(() => req.finish());
    assert.equal(res.ends, 0); assert.equal(req.socket.destroys, error ? 1 : 0);
  }
});

test('leaves completed and destroyed responses alone before and after draining', async () => {
  for (const pending of [false, true]) {
    for (const state of ['writableEnded', 'destroyed']) {
      const req = new Request(pending); const res = new Response(); let logged = 0;
      if (!pending) res[state] = true;
      finalhandler(req, res, { onerror: () => logged++ })(new Error('late'));
      if (pending) { res[state] = true; req.finish(); }
      await tick();
      assert.equal(res.ends, 0); assert.equal(req.socket.destroys, 0); assert.equal(logged, 1);
    }
  }
});

test('does not write after abort, socket close, or socket error during draining', () => {
  for (const event of ['aborted', 'close', 'error']) {
    const req = new Request(true); const res = new Response();
    finalhandler(req, res)();
    if (event === 'aborted') { req.aborted = true; req.finish(); }
    else {
      if (event === 'close') req.socket.destroyed = true;
      req.socket.emit(event, event === 'error' ? new Error('reset') : undefined);
      req.finish();
    }
    assert.equal(res.ends, 0); assert.equal(req.listenerCount('end'), 0);
  }
});

test('a normally auto-destroyed request does not suppress its response', () => {
  const req = new Request(true); const res = new Response();
  finalhandler(req, res)(); req.destroyed = true; req.finish();
  assert.equal(res.ends, 1);
});

test('onerror is asynchronous, receives original objects, and is validated at construction', async () => {
  const req = new Request(); const res = new Response(); const error = new Error('oops'); let received;
  finalhandler(req, res, { onerror: (...args) => { received = args; } })(error);
  assert.equal(received, undefined); await tick(); assert.deepEqual(received, [error, req, res]);
  for (const onerror of [true, false, 1, 'log', {}]) {
    assert.throws(() => finalhandler(req, res, { onerror }), { name: 'TypeError', message: 'onerror must be a function' });
  }
});

test('HTTP/2 never assigns statusMessage', () => {
  const req = new Request(); req.httpVersionMajor = 2; const res = new Response();
  Object.defineProperty(res, 'statusMessage', { set() { throw new Error('HTTP/2 has no reason phrase'); } });
  assert.doesNotThrow(() => finalhandler(req, res)());
  assert.equal(res.statusCode, 404);
});

test('handles a null socket after headers were sent', () => {
  const req = new Request(); req.socket = null; const res = new Response(); res.headersSent = true;
  assert.doesNotThrow(() => finalhandler(req, res)(new Error('late')));
});
