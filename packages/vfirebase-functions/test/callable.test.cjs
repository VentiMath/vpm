'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const https = require('../lib/common/providers/https.js');
const {CallableResponse} = require('../lib/runtime/callable-response.js');

function request(data, headers = {}) {
  const values = {'content-type': 'application/json', origin: 'https://example.test', ...headers};
  return {method: 'POST', body: {data}, headers: values, header: name => values[name.toLowerCase()]};
}
function response() {
  const res = new EventEmitter(), headers = {};
  res.statusCode = 200; res.chunks = [];
  res.setHeader = (key, value) => {headers[key.toLowerCase()] = value;};
  res.getHeader = key => headers[key.toLowerCase()];
  res.status = code => {res.statusCode = code; return res;};
  res.send = body => {res.body = body; res.emit('finish'); return res;};
  res.end = () => {res.emit('finish');};
  res.write = (chunk, callback) => {res.chunks.push(chunk); callback?.(); return true;};
  return res;
}

test('canonical errors reject inherited property names and cannot corrupt other errors', () => {
  for (const code of ['constructor', '__proto__', 'toString', 'invalid']) assert.throws(() => new https.HttpsError(code, 'bad'), /Unknown error code/);
  const error = new https.HttpsError('permission-denied', 'denied', {reason: 'admin'});
  assert.deepEqual(error.toJSON(), {details: {reason: 'admin'}, message: 'denied', status: 'PERMISSION_DENIED'});
  assert.throws(() => {error.httpErrorCode.status = 200;}, TypeError);
  assert.equal(new https.HttpsError('permission-denied', 'denied').httpErrorCode.status, 403);
});

test('payload codecs preserve own prototype-named keys without prototype mutation', () => {
  const payload = JSON.parse('{"__proto__":{"admin":true},"constructor":"data","value":7}');
  for (const convert of [https.encode, https.decode]) {
    const result = convert(payload);
    assert.deepEqual(result, payload);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.ok(Object.hasOwn(result, '__proto__'));
    assert.equal(result.admin, undefined);
  }
  const inherited = Object.assign(Object.create({'@type': 'untrusted'}), {safe: true});
  assert.deepEqual(https.decode(inherited), {safe: true});
});

test('payload codecs handle deep data, repeated objects and cycles deliberately', () => {
  let root = {}, end = root;
  for (let i = 0; i < 15000; i++) end = end.next = {};
  end.value = 42;
  for (const convert of [https.encode, https.decode]) {
    let copy = convert(root);
    for (let i = 0; i < 15000; i++) copy = copy.next;
    assert.equal(copy.value, 42);
    const shared = {value: 3};
    const result = convert({first: shared, second: shared});
    assert.deepEqual(result, {first: {value: 3}, second: {value: 3}});
    assert.notEqual(result.first, result.second);
    const cycle = {}; cycle.self = cycle;
    assert.throws(() => convert(cycle), /circular reference/);
  }
  end.next = root; // Crosses the bounded-recursion/worklist boundary.
  for (const convert of [https.encode, https.decode]) assert.throws(() => convert(root), /circular reference/);
  const sparse = [1, , 3];
  assert.equal(1 in https.encode(sparse), false);
});

test('stream writes tolerate synchronous callbacks and report backpressure', async () => {
  const res = response(), channel = new CallableResponse(res, true, null);
  assert.equal(await channel.proxy.sendChunk('first'), true);
  res.write = (chunk, callback) => {res.chunks.push(chunk); callback(); return false;};
  assert.equal(await channel.proxy.sendChunk('second'), false);
  res.write = (chunk, callback) => {callback(new Error('write failed')); return false;};
  await assert.rejects(channel.proxy.sendChunk('third'), /write failed/);
  assert.deepEqual(res.chunks, ['data: {"message":"first"}\n\n', 'data: {"message":"second"}\n\n']);
  channel.dispose();
  assert.equal(await channel.proxy.sendChunk('late'), false);
  assert.equal(res.listenerCount('close'), 0);
});

test('disconnect releases pending chunk promises and clears heartbeat state', async () => {
  const res = response(), channel = new CallableResponse(res, true, 60);
  res.write = () => false;
  channel.start();
  const pending = channel.proxy.sendChunk('pending');
  res.emit('close');
  assert.equal(await pending, false);
  assert.equal(channel.proxy.signal.aborted, true);
  assert.equal(channel.timer, null);
  channel.dispose();
  assert.equal(res.listenerCount('close'), 0);
});

test('callable CORS and invocation listeners are removed on success and preflight', async () => {
  let calls = 0;
  const handler = https.onCallHandler({cors: {origin: true, methods: 'POST'}}, req => {calls++; return req.data;}, 'gcfv2');
  const res = response();
  await handler(request({value: 42}), res);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(res.body, {result: {value: 42}});
  assert.equal(res.listenerCount('finish'), 0);
  assert.equal(res.listenerCount('close'), 0);
  const preflight = request(null, {'access-control-request-method': 'POST'});
  preflight.method = 'OPTIONS';
  const preflightResponse = response();
  await handler(preflight, preflightResponse);
  assert.equal(calls, 1);
  assert.equal(preflightResponse.listenerCount('finish'), 0);
  assert.equal(preflightResponse.listenerCount('close'), 0);
});

test('unauthenticated requests cannot bypass an application authorization policy', async () => {
  let calls = 0;
  const handler = https.onCallHandler({cors: {origin: false}, authPolicy: auth => auth?.token.admin === true}, () => {calls++;}, 'gcfv2');
  const res = response();
  await handler(request(null), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.status, 'PERMISSION_DENIED');
  assert.equal(calls, 0);
});

test('callable helpers and errors have one CJS/ESM identity', async () => {
  const esm = await import('../lib/esm/common/providers/https.mjs');
  for (const name of Object.keys(https)) assert.equal(esm[name], https[name], name);
});
