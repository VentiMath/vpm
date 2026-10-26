'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const createError = require('..');
const upstream = require('./upstream.cjs');
const statuses = require('vstatuses');

function shape(error) {
  return { name: error.name, message: error.message, status: error.status, statusCode: error.statusCode,
    expose: error.expose, keys: Object.keys(error), messageDescriptor: Object.getOwnPropertyDescriptor(error, 'message') };
}

test('matches every exported upstream constructor, alias, and ordinary factory result', () => {
  assert.deepEqual(Object.keys(createError).sort(), Object.keys(upstream).sort());
  for (const code of statuses.codes.filter(code => code >= 400)) {
    for (const message of [undefined, '', 'custom <message>']) {
      for (const construct of [factory => factory(code, ...(message === undefined ? [] : [message])),
        factory => factory[code](message), factory => new factory[code](message)]) {
        const next = construct(createError); const before = construct(upstream);
        assert.deepEqual(shape(next), shape(before));
        assert.ok(next instanceof Error); assert.ok(next instanceof createError.HttpError);
        assert.ok(next instanceof createError[code]); assert.equal(createError.isHttpError(next), true);
        assert.equal(next.constructor, createError[code]);
      }
    }
  }
});

test('supports unknown 4xx/5xx codes with the upstream family constructor', () => {
  for (const code of [499, 555, 599]) assert.deepEqual(shape(createError(code)), shape(upstream(code)));
});

test('preserves argument ordering, existing Error identity, and custom properties', () => {
  const error = Object.assign(new Error('original'), { status: 403 });
  const result = createError(404, error, 'ignored', { detail: 'context', expose: false, headers: { 'Retry-After': '3' } });
  assert.equal(result, error); assert.equal(result.message, 'original'); assert.equal(result.status, 403);
  assert.equal(result.expose, false); assert.equal(result.detail, 'context'); assert.equal(result.headers['Retry-After'], '3');
  assert.equal(createError({ detail: 1 }, { detail: 2 }).detail, 2);
  assert.equal(createError(null).status, 500);
});

test('normalizes invalid statuses and uses a valid statusCode on existing errors', () => {
  for (const status of [NaN, Infinity, -Infinity, 200, 399, 600, 400.5]) {
    assert.equal(createError(status).status, 500);
    assert.equal(createError(Object.assign(new Error('x'), { status, statusCode: 401 })).status, 401);
    assert.equal(createError(402, Object.assign(new Error('x'), { status })).status, 402);
  }
  const inconsistent = createError(400); inconsistent.statusCode = 500;
  assert.equal(createError(inconsistent).statusCode, 400);
});

test('does not copy inherited properties or prototype-changing keys', () => {
  const props = Object.create({ inherited: 'not copied' }); props.own = 'copied';
  props.status = props.statusCode = 401;
  // Use a null-prototype object so __proto__ remains an actual own data key.
  const dangerous = Object.assign(Object.create(null), JSON.parse('{"__proto__":{"polluted":true},"constructor":"bad","prototype":"bad"}'));
  const ordinary = createError(404, props); const error = createError(404, dangerous);
  assert.equal(ordinary.own, 'copied'); assert.equal(ordinary.inherited, undefined);
  assert.equal(ordinary.status, 404); assert.equal(ordinary.statusCode, 404);
  assert.equal(error.polluted, undefined); assert.equal(error.constructor, createError.NotFound);
  assert.equal(error.prototype, undefined); assert.equal(error.status, 404); assert.equal(error.statusCode, 404);
  assert.ok(error instanceof createError.HttpError);
});

test('does not evaluate excluded property getters', () => {
  const props = {};
  for (const key of ['__proto__', 'prototype', 'constructor', 'status', 'statusCode']) {
    Object.defineProperty(props, key, { enumerable: true, get() { throw new Error('excluded getter'); } });
  }
  assert.equal(createError(403, props).status, 403);
});

test('isHttpError checks status integrity even on branded instances', () => {
  for (const value of [null, {}, new Error('plain'), { status: 400, statusCode: 400, expose: true }]) {
    assert.equal(createError.isHttpError(value), false);
  }
  const foreign = Object.assign(new Error('foreign'), { status: 429, statusCode: 429, expose: true });
  assert.equal(createError.isHttpError(foreign), true);
  for (const invalid of [NaN, 400.5, 200, 600]) {
    const error = createError(400); error.status = error.statusCode = invalid;
    assert.equal(createError.isHttpError(error), false);
  }
});

test('supports subclasses without losing their prototype', () => {
  class MissingWidget extends createError.NotFound { widget() { return 'widget'; } }
  const error = new MissingWidget('missing');
  assert.ok(error instanceof MissingWidget); assert.ok(error instanceof createError.NotFound);
  assert.equal(error.widget(), 'widget'); assert.equal(error.status, 404);
});

test('captures stacks at the public caller and retains message/name descriptors', () => {
  const factoryError = createError(404, 'factory');
  const constructorError = new createError.NotFound('constructor');
  for (const error of [factoryError, constructorError]) {
    assert.match(error.stack, /errors\.test\.cjs/);
    assert.doesNotMatch(error.stack, /at (?:makeError|createError|NotFoundError|StatusError) /);
    assert.equal(Object.getOwnPropertyDescriptor(error, 'name').enumerable, false);
    assert.equal(Object.getOwnPropertyDescriptor(error, 'message').enumerable, true);
  }
});

test('rejects unsupported arguments and construction of the abstract base', () => {
  for (const value of [undefined, true, Symbol('invalid'), 1n, () => {}]) assert.throws(() => createError(value), TypeError);
  assert.throws(() => createError('message', 404), TypeError);
  assert.throws(() => new createError.HttpError(), /cannot construct abstract class/);
});

test('constructor export mutation cannot change the internal factory lookup', () => {
  const original = createError[404];
  try { createError[404] = () => { throw new Error('replaced'); }; assert.ok(createError(404) instanceof original); }
  finally { createError[404] = original; }
});
