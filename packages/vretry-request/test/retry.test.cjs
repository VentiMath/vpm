'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {PassThrough} = require('node:stream');
const {pipeline} = require('node:stream');
const {once} = require('node:events');
const retry = require('..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const tick = () => new Promise(resolve => setImmediate(resolve));
const opts = {maxRetryDelay: 0};
const run = options => new Promise(resolve => retry(null, {...opts, ...options}, (...args) => resolve(args)));
function streamRequest(emit) { return () => { const s = new PassThrough(); setImmediate(() => emit(s)); return s; }; }

test('callback responses preserve options and body identity', async () => {
  const requestOpts = {url: 'test'}, response = {statusCode: 200}, body = {};
  await new Promise(resolve => retry(requestOpts, {request(o, cb) { assert.equal(o, requestOpts); cb(null, response, body); }}, (e, r, b) => {
    assert.equal(e, null); assert.equal(r, response); assert.equal(b, body); resolve();
  }));
});
test('zero-delay status retries complete asynchronously with the default budget', async () => {
  let calls = 0, synchronous = true;
  const result = run({request(o, cb) { calls++; cb(null, {statusCode: 503}, calls); }});
  assert.equal(calls, 1); synchronous = false;
  const [, response, body] = await result;
  assert.equal(synchronous, false); assert.equal(response.statusCode, 503); assert.equal(body, 3); assert.equal(calls, 3);
});
test('network retries have an independent budget and preserve last error', async () => {
  let calls = 0; const error = new Error('network');
  const [err] = await run({retries: 0, noResponseRetries: 1, request(o, cb) { calls++; cb(error); }});
  assert.equal(err, error); assert.equal(calls, 2);
});
test('manual currentRetryAttempt retains the upstream counting convention', async () => {
  let calls = 0;
  await run({currentRetryAttempt: 1, request(o, cb) { calls++; cb(null, {statusCode: 500}); }});
  assert.equal(calls, 1);
});
test('duplicate and stale callbacks never schedule extra attempts or settle twice', async () => {
  let calls = 0, settled = 0, oldCallback;
  await new Promise(resolve => retry(null, {...opts, request(o, cb) {
    calls++; if (calls === 1) { oldCallback = cb; cb(null, {statusCode: 503}); cb(new Error('duplicate')); }
    else { oldCallback(null, {statusCode: 200}); cb(null, {statusCode: 200}); cb(null, {statusCode: 500}); }
  }}, () => { settled++; resolve(); }));
  await wait(10); assert.equal(calls, 2); assert.equal(settled, 1);
});
test('abort during callback backoff is idempotent and suppresses completion', async () => {
  let calls = 0, completed = false;
  const handle = retry(null, {maxRetryDelay: 0.01, request(o, cb) { calls++; cb(new Error('offline')); }}, () => { completed = true; });
  handle.abort(); handle.abort(); await wait(30);
  assert.equal(calls, 1); assert.equal(completed, false);
});
test('abort stops an active callback request and ignores its cancellation callback', () => {
  let aborts = 0, callbacks = 0;
  const handle = retry(null, {request(o, cb) { return {abort() { aborts++; cb(new Error('aborted')); }}; }}, () => callbacks++);
  handle.abort(); handle.abort(); assert.equal(aborts, 1); assert.equal(callbacks, 0);
});
test('expired retry budget returns the last response or error rather than hanging', async () => {
  const error = new Error('offline');
  assert.equal((await run({totalTimeout: 0, request(o, cb) { cb(error); }}))[0], error);
  assert.equal((await run({totalTimeout: 0, request(o, cb) { cb(null, {statusCode: 503}); }}))[1].statusCode, 503);
});
test('expired initial delay completes with ETIMEDOUT without starting transport', async () => {
  let calls = 0;
  const [error] = await run({totalTimeout: 0, currentRetryAttempt: 1, request() { calls++; }});
  assert.equal(error.code, 'ETIMEDOUT'); assert.equal(calls, 0);
});
test('request throws use the network budget; predicate errors settle once', async () => {
  const error = new Error('thrown'); let calls = 0;
  const [result] = await run({noResponseRetries: 1, request() { calls++; throw error; }});
  assert.equal(result, error); assert.equal(calls, 2);
  const [predicate] = await run({request(o, cb) { cb(null, {}); }, shouldRetryFn() { throw error; }});
  assert.equal(predicate, error);
});
test('exceptions from user callbacks remain visible', () => {
  const error = new Error('caller');
  assert.throws(() => retry(null, {request(o, cb) { cb(null, {statusCode: 200}); }}, () => { throw error; }), e => e === error);
});
test('own option snapshot ignores inherited options and undefined values', async () => {
  const options = Object.assign(Object.create({retries: -1, shouldRetryFn() { throw Error('inherited'); }}), {
    maxRetryDelay: 0, noResponseRetries: undefined, request(o, cb) { cb(null, {statusCode: 200}); },
  });
  await new Promise(resolve => retry(null, options, resolve));
  assert.equal(options.noResponseRetries, undefined);
});
test('rejects invalid retry configuration before invoking transport', () => {
  for (const key of ['retries', 'noResponseRetries', 'currentRetryAttempt', 'maxRetryDelay', 'retryDelayMultiplier', 'totalTimeout']) {
    for (const value of [-1, NaN, Infinity, '2']) assert.throws(() => retry(null, {[key]: value, request() { assert.fail('transport'); }}, () => {}), RangeError);
  }
  assert.throws(() => retry(null, {retries: 0.5, request() {}}, () => {}), RangeError);
  assert.throws(() => retry(null, {request: {}}), TypeError);
  assert.throws(() => retry(null, {request() {}, shouldRetryFn: null}), TypeError);
});
test('default status policy preserves retry ranges', () => {
  for (let code = 0; code <= 999; code++) assert.equal(retry.defaults.shouldRetryFn({statusCode: code}), code >= 100 && code <= 199 || code === 429 || code >= 500 && code <= 599);
});
test('delay helper validates input, caps jitter and returns zero after deadline', () => {
  const config = {retryNumber: 2, retryDelayMultiplier: 2, maxRetryDelay: 64, totalTimeout: 600, timeOfFirstRequest: Date.now()};
  const value = retry.getNextRetryDelay(config); assert(value >= 4000 && value < 5000);
  assert.equal(retry.getNextRetryDelay({...config, maxRetryDelay: 1}), 1000);
  assert.equal(retry.getNextRetryDelay({...config, timeOfFirstRequest: 0}), 0);
  assert.throws(() => retry.getNextRetryDelay({...config, retryNumber: Infinity}), RangeError);
});
test('stream retries discard rejected bodies and completion events', async () => {
  let calls = 0, completions = 0, responses = 0;
  const output = retry(null, {...opts, request: streamRequest(s => {
    calls++; s.write('before-'); s.emit('complete', calls);
    s.emit('response', {statusCode: calls < 3 ? 503 : 200});
    if (calls === 3) s.end('accepted');
  })});
  output.on('complete', n => { completions++; assert.equal(n, 3); });
  output.on('response', () => responses++);
  let body = ''; for await (const chunk of output) body += chunk;
  assert.equal(body, 'before-accepted'); assert.equal(calls, 3); assert.equal(completions, 1); assert.equal(responses, 1);
});
test('late events from a rejected stream cannot settle the current attempt', async () => {
  let old, calls = 0;
  const output = retry(null, {...opts, request: streamRequest(s => {
    calls++;
    if (calls === 1) { old = s; s.emit('response', {statusCode: 503}); }
    else { old.emit('response', {statusCode: 200}); old.emit('error', new Error('late')); old.emit('complete', 'stale'); s.emit('response', {statusCode: 200}); s.end('ok'); }
  })});
  let body = ''; for await (const chunk of output) body += chunk;
  assert.equal(body, 'ok'); assert.equal(calls, 2);
  assert.equal(old.listenerCount('response'), 0); assert.equal(old.listenerCount('complete'), 0); assert.equal(old.listenerCount('error'), 1);
});
test('stream abort during backoff cancels scheduled transport', async () => {
  let calls = 0;
  const output = retry(null, {maxRetryDelay: 0.01, request: streamRequest(s => { calls++; s.emit('response', {statusCode: 503}); output.abort(); })});
  await once(output, 'close'); await wait(30); assert.equal(calls, 1);
});
test('destroying an active stream calls transport cancel and releases buffers', async () => {
  let cancelled = 0; const source = new PassThrough(); source.cancel = () => cancelled++;
  const output = retry(null, {request: () => source});
  output.destroy(); await once(output, 'close');
  assert.equal(cancelled, 1); assert.equal(source.destroyed, true); assert.equal(source.listenerCount('response'), 0);
});
test('response listener can abort without piping a destroyed attempt', async () => {
  const output = retry(null, {request: streamRequest(s => s.emit('response', {statusCode: 200}))});
  output.once('response', () => output.abort()); await once(output, 'close'); assert(output.destroyed);
});
test('predicate can abort a stream without scheduling a retry', async () => {
  let calls = 0;
  const output = retry(null, {...opts, shouldRetryFn() { output.abort(); return true; }, request: streamRequest(s => { calls++; s.emit('response', {statusCode: 500}); })});
  await once(output, 'close'); await wait(10); assert.equal(calls, 1);
});
test('errors after response are terminal and cannot replay delivered bytes', async () => {
  const error = new Error('mid-body'); let calls = 0;
  const output = retry(null, {...opts, request: streamRequest(s => { calls++; s.emit('response', {statusCode: 200}); s.write('part'); s.destroy(error); })});
  await assert.rejects(async () => { for await (const chunk of output) void chunk; }, e => e === error);
  assert.equal(calls, 1);
});
test('terminal network and initial deadline errors are emitted asynchronously', async () => {
  const error = new Error('network');
  const output = retry(null, {noResponseRetries: 0, request() { throw error; }});
  assert.equal((await once(output, 'error'))[0], error);
  const timed = retry(null, {totalTimeout: 0, currentRetryAttempt: 1, request() { assert.fail(); }});
  assert.equal((await once(timed, 'error'))[0].code, 'ETIMEDOUT');
});
test('object streams preserve object identity', async () => {
  const object = {ok: true};
  const output = retry(null, {objectMode: true, request() {
    const source = new PassThrough({objectMode: true});
    setImmediate(() => { source.emit('response', {statusCode: 200}); source.end(object); }); return source;
  }});
  const chunks = []; for await (const chunk of output) chunks.push(chunk);
  assert.equal(chunks[0], object); assert.equal(chunks.length, 1);
});
test('stream backpressure does not eagerly consume a large accepted body', async () => {
  const source = new PassThrough(); const output = retry(null, {request: () => source});
  source.emit('response', {statusCode: 200});
  let writes = 0;
  while (++writes < 64 && source.write(Buffer.alloc(1024 * 1024))) {}
  assert(writes < 64);
  await tick(); assert(output.readableLength <= 1024 * 1024); assert(source.writableNeedDrain);
  output.abort();
});
test('end without response and premature close exhaust the network retry budget', async () => {
  for (const end of [s => s.end(), s => s.destroy()]) {
    let calls = 0;
    const output = retry(null, {...opts, noResponseRetries: 1, request: streamRequest(s => { calls++; end(s); })});
    const [error] = await once(output, 'error');
    assert.equal(error.code, 'ERR_STREAM_PREMATURE_CLOSE'); assert.equal(calls, 2);
  }
});
test('rejected response cleanup lets transports attach their body pipeline', async () => {
  let attempts = 0;
  const output = retry(null, {...opts, request() {
    const source = new PassThrough();
    setImmediate(() => {
      attempts++;
      const body = new PassThrough();
      source.once('response', () => pipeline(body, source, () => {}));
      source.emit('response', {statusCode: attempts === 1 ? 503 : 200});
      body.end('ok');
    });
    return source;
  }});
  let body = ''; for await (const chunk of output) body += chunk;
  assert.equal(body, 'ok'); assert.equal(attempts, 2);
});
test('supported option getters are read once and undefined keeps defaults', async () => {
  let reads = 0, calls = 0;
  await new Promise(resolve => retry(null, {get currentRetryAttempt() { reads++; return 0; }, retries: undefined,
    request(o, cb) { calls++; cb(null, {statusCode: 200}); }}, resolve));
  assert.equal(reads, 1); assert.equal(calls, 1);
});
test('mutable defaults still supply transport for both overloads', async () => {
  const previous = retry.defaults.request;
  retry.defaults.request = (o, cb) => cb(null, {statusCode: 200}, o.url);
  try {
    await new Promise(resolve => retry('test', (error, response, body) => { assert.equal(body, 'test'); resolve(); }));
  } finally { if (previous === undefined) delete retry.defaults.request; else retry.defaults.request = previous; }
});
test('transport throws after a retry callback cannot leave a scheduled attempt', async () => {
  let calls = 0; const error = new Error('transport throw');
  assert.throws(() => retry(null, {...opts, request(o, cb) { calls++; cb(new Error('network')); throw error; }}, () => {}), e => e === error);
  await wait(10); assert.equal(calls, 1);
});
