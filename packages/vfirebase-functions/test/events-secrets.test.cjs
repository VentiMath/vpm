'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const params = require('../lib/params/index.js');
const {globalManifest} = require('../lib/runtime/manifest.js');
const {applyFieldMask, Change} = require('../lib/common/change.js');
const {DocumentPattern} = require('../lib/runtime/document-pattern.js');
const {dateToTimestampProto} = require('../lib/common/utilities/encoder.js');

test('secret declarations share CJS/ESM identity and remove every duplicate registration', async () => {
  const esm = await import('../lib/esm/params/index.mjs');
  const types = require('../lib/params/types.js'), esmTypes = await import('../lib/esm/params/types.mjs');
  assert.equal(esm.defineSecret, params.defineSecret);
  assert.equal(esmTypes.SecretParam, types.SecretParam);
  const list = params.declaredParams;
  params.clearParams();
  try {
    const first = params.defineSecret('VPM_TEST_SECRET', {description: 'first'});
    list.push(first, first);
    globalManifest.params.push(first.toSpec(), first.toSpec());
    const replacement = esm.defineSecret('VPM_TEST_SECRET', {description: 'new'});
    assert.equal(params.declaredParams, list);
    assert.deepEqual(list, [replacement]);
    assert.deepEqual(globalManifest.params, [{type: 'secret', name: 'VPM_TEST_SECRET', description: 'new'}]);
  } finally {params.clearParams();}
});

test('secret reads are dynamic and deployment guards do not reveal secret contents', () => {
  const name = 'VPM_TEST_SECRET_VALUE', prior = process.env[name], guard = process.env.FUNCTIONS_CONTROL_API;
  const secret = params.defineSecret(name), json = params.defineJsonSecret(name);
  try {
    delete process.env.FUNCTIONS_CONTROL_API;
    process.env[name] = 'first'; assert.equal(secret.value(), 'first');
    process.env[name] = 'second'; assert.equal(secret.value(), 'second');
    process.env[name] = 'sensitive-credential-invalid-json';
    assert.throws(() => json.value(), error => {
      assert.match(error.message, /could not be parsed as JSON/);
      assert.doesNotMatch(error.stack, /sensitive-credential/);
      assert.equal(error.cause, undefined);
      return true;
    });
    process.env.FUNCTIONS_CONTROL_API = 'true';
    assert.throws(() => secret.value(), /only available at runtime/);
    assert.throws(() => json.value(), /only available at runtime/);
  } finally {
    if (prior === undefined) delete process.env[name]; else process.env[name] = prior;
    if (guard === undefined) delete process.env.FUNCTIONS_CONTROL_API; else process.env.FUNCTIONS_CONTROL_API = guard;
    params.clearParams();
  }
});

test('field masks preserve sibling changes, own prototype-named data and frozen inputs', () => {
  const before = Object.freeze({nested: Object.freeze({a: 1, b: 2})});
  const after = Object.freeze({nested: Object.freeze({a: 10, b: 20, c: 30}), retained: true});
  assert.deepEqual(applyFieldMask(before, after, 'nested.a,nested.b'), {nested: {a: 1, b: 2, c: 30}, retained: true});
  const value = applyFieldMask(JSON.parse('{"__proto__":{"x":1}}'), {}, '__proto__.x');
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
  assert.ok(Object.hasOwn(value, '__proto__'));
  assert.equal(value.__proto__.x, 1);
  assert.equal({}.x, undefined);
  assert.equal(Change.fromObjects(before, after).before, before);
});

test('document captures retain prototype-named keys and decode literal or multi-segment IDs', () => {
  const pattern = new DocumentPattern('groups/{__proto__}/items/{item=**}');
  const result = pattern.extractMatches('groups/math%20club/items/a/b');
  assert.ok(Object.hasOwn(result, '__proto__'));
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.deepEqual(result, JSON.parse('{"__proto__":"math club","item":"a/b"}'));
  assert.equal(new DocumentPattern('items/{id}').extractMatches('items/%invalid').id, '%invalid');
  assert.equal(new DocumentPattern('items/fixed').hasWildcards(), false);
});

test('event timestamps preserve nanoseconds and timezone offsets, including before the epoch', () => {
  assert.deepEqual(dateToTimestampProto('1970-01-01T00:00:00.123456789Z'), {seconds: 0, nanos: 123456789});
  assert.deepEqual(dateToTimestampProto('1970-01-01T01:00:00.123456789+01:00'), {seconds: 0, nanos: 123456789});
  assert.deepEqual(dateToTimestampProto('1969-12-31T23:59:59.999999999Z'), {seconds: -1, nanos: 999999999});
  assert.deepEqual(dateToTimestampProto({seconds: 42, nanoseconds: 123456789}), {seconds: 42, nanos: 123456789});
  assert.throws(() => dateToTimestampProto('invalid'), /Invalid event timestamp/);
});

test('Firestore factories share CJS/ESM identities and normalize frozen declarations', async () => {
  const cjs = require('../lib/v2/providers/firestore.js'), esm = await import('../lib/esm/v2/providers/firestore.mjs');
  for (const name of ['onDocumentCreated', 'onDocumentWritten', 'Change', 'createSnapshot']) assert.equal(cjs[name], esm[name]);
  const options = Object.freeze({document: '//items///{id}//', retry: true});
  const fn = cjs.onDocumentCreated(options, () => {});
  assert.equal(fn.__endpoint.eventTrigger.eventFilterPathPatterns.document, 'items/{id}');
  assert.equal(fn.__endpoint.eventTrigger.retry, true);
  assert.equal(options.document, '//items///{id}//');
  assert.equal(cjs.getV1Context({type: 'google.cloud.firestore.document.v1.constructor'}).eventType, 'google.cloud.firestore.document.v1.constructor');
});

test('a changed protobuf event decodes once and preserves both document snapshots', async () => {
  const admin = require('vfirebase-admin/app');
  const app = require('../lib/common/app.js');
  const {makeChangedFirestoreEvent} = require('../lib/v2/providers/firestore.js');
  const {DocumentEventData} = require('../protos/compiledFirestore.js').google.events.cloud.firestore.v1;
  const instance = admin.initializeApp({projectId: 'vpm-event-fixture'}, 'vpm-event-fixture');
  app.setApp(instance);
  const name = 'projects/vpm-event-fixture/databases/(default)/documents/items/one';
  const payload = DocumentEventData.encode(DocumentEventData.create({
    oldValue: {name, createTime: {seconds: 1}, updateTime: {seconds: 2}, fields: {value: {stringValue: 'before'}}},
    value: {name, createTime: {seconds: 1}, updateTime: {seconds: 3}, fields: {value: {stringValue: 'after'}}},
  })).finish();
  const original = DocumentEventData.decode;
  let calls = 0;
  DocumentEventData.decode = function (...args) {calls++; return Reflect.apply(original, this, args);};
  try {
    const event = makeChangedFirestoreEvent({project: 'vpm-event-fixture', database: '(default)',
      document: 'items/one', datacontenttype: 'application/protobuf', data: payload}, {id: 'one'});
    assert.equal(calls, 1);
    assert.deepEqual(event.data.before.data(), {value: 'before'});
    assert.deepEqual(event.data.after.data(), {value: 'after'});
    assert.equal(event.data.before.ref.path, 'items/one');
    assert.deepEqual(event.params, {id: 'one'});
  } finally {
    DocumentEventData.decode = original;
    app.setApp(undefined);
    await admin.deleteApp(instance);
  }
});
