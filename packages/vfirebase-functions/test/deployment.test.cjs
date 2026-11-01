'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {stackToWire} = require('../lib/runtime/manifest.js');
const {RESET_VALUE} = require('../lib/common/options.js');
const {Expression} = require('../lib/params/types.js');

test('deployment serialization preserves frozen declarations and parameter expressions', () => {
  class Project extends Expression {toString() {return 'params.PROJECT';}}
  const expression = new Project();
  const declaration = Object.freeze({minInstances: RESET_VALUE, labels: Object.freeze({project: expression})});
  const stack = Object.freeze({specVersion: 'v1alpha1', endpoints: Object.freeze({api: declaration})});
  const serialized = stackToWire(stack);
  assert.deepEqual(serialized, {specVersion: 'v1alpha1', endpoints: {api: {minInstances: null, labels: {project: '{{ params.PROJECT }}'}}}});
  assert.equal(stack.endpoints.api.minInstances, RESET_VALUE);
  assert.equal(stack.endpoints.api.labels.project, expression);
  assert.deepEqual(stackToWire(stack), serialized);
});

test('serialization handles deep declarations and repeated references without recursion', () => {
  const leaf = {value: RESET_VALUE};
  let nested = leaf;
  for (let depth = 0; depth < 15000; depth++) nested = {nested};
  const out = stackToWire({endpoints: {first: nested, second: nested}});
  assert.equal(out.endpoints.first, out.endpoints.second);
  let cursor = out.endpoints.first;
  for (let depth = 0; depth < 15000; depth++) cursor = cursor.nested;
  assert.deepEqual(cursor, {value: null});
  assert.equal(leaf.value, RESET_VALUE);
});

test('own prototype-named metadata stays a data property', () => {
  const labels = JSON.parse('{"__proto__":{"safe":true},"constructor":"label"}');
  const out = stackToWire({endpoints: {api: {labels}}});
  assert.equal(Object.getPrototypeOf(out.endpoints.api.labels), Object.prototype);
  assert.ok(Object.hasOwn(out.endpoints.api.labels, '__proto__'));
  assert.deepEqual(out.endpoints.api.labels, labels);
});

test('HTTP, scheduler and deployment entry points share module identity across CJS and ESM', async () => {
  for (const [cjs, esm, names] of [
    ['../lib/v2/providers/https.js', '../lib/esm/v2/providers/https.mjs', ['onRequest', 'onCall', 'HttpsError']],
    ['../lib/v2/providers/scheduler.js', '../lib/esm/v2/providers/scheduler.mjs', ['onSchedule']],
    ['../lib/v2/options.js', '../lib/esm/v2/options.mjs', ['getGlobalOptions', 'setGlobalOptions']],
    ['../lib/runtime/manifest.js', '../lib/esm/runtime/manifest.mjs', ['globalManifest', 'stackToWire']],
  ]) {
    const required = require(cjs), imported = await import(esm);
    for (const name of names) assert.equal(required[name], imported[name], name);
  }
});

test('HTTP CORS completion removes its finish listener after preflight and handlers', async () => {
  const {onRequest} = require('../lib/v2/providers/https.js');
  let calls = 0;
  const handler = onRequest({cors: true}, () => {calls++;});
  for (const method of ['OPTIONS', 'GET']) {
    const response = new EventEmitter();
    const headers = {};
    response.setHeader = (name, value) => {headers[name.toLowerCase()] = value;};
    response.getHeader = name => headers[name.toLowerCase()];
    response.end = () => response.emit('finish');
    await handler({method, headers: {origin: 'https://example.test', 'access-control-request-method': 'GET'}}, response);
    assert.equal(response.listenerCount('finish'), 0);
    assert.equal(headers['access-control-allow-origin'], 'https://example.test');
  }
  assert.equal(calls, 1);
});
