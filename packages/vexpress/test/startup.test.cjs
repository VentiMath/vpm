'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const express = require('..');
const merge = require('vmerge-descriptors');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function withDescriptors(object, descriptors, run) {
  const previous = Object.getOwnPropertyDescriptors(object);
  try { Object.defineProperties(object, descriptors); return run(); }
  finally {
    for (const key of Reflect.ownKeys(descriptors)) {
      if (Object.hasOwn(previous, key)) Object.defineProperty(object, key, previous[key]);
      else delete object[key];
    }
  }
}
function verifyCopy(application) {
  // The general implementation remains an independent descriptor oracle.
  const expected = function(req, res, next) { expected.handle(req, res, next); };
  merge(expected, EventEmitter.prototype, false);
  merge(expected, express.application, false);
  for (const key of Reflect.ownKeys(expected)) {
    if (['name', 'length', 'prototype', '_events', '_eventsCount', 'request', 'response'].includes(key)) continue;
    assert.deepEqual(Object.getOwnPropertyDescriptor(application, key), Object.getOwnPropertyDescriptor(expected, key));
  }
  assert.equal(Object.getPrototypeOf(application), Function.prototype);
}

test('startup copies live data, symbols, accessors and exact descriptor attributes', () => {
  const symbol = Symbol('metadata'); let reads = 0;
  const descriptors = { [symbol]: { value: 42, writable: true, enumerable: true, configurable: true } };
  for (let flags = 0; flags < 4; flags++) {
    descriptors['startup' + flags] = { value: flags, writable: !!(flags & 1), enumerable: !!(flags & 2), configurable: true };
  }
  descriptors.startupGetter = { get() { reads++; return this; }, configurable: true };
  withDescriptors(express.application, descriptors, () => {
    const first = express(); verifyCopy(first); assert.equal(reads, 0);
    assert.equal(first.startupGetter, first); assert.equal(reads, 1);
    express.application[symbol] = 43;
    delete express.application.startup0;
    const second = express(); verifyCopy(second);
    assert.equal(first[symbol], 42); assert.equal(second[symbol], 43);
    assert.equal(Object.hasOwn(second, 'startup0'), false);
  });
});

test('startup preserves nonconfigurable properties and skips existing function properties', () => {
  const original = EventEmitter.prototype;
  const customized = Object.create(null, Object.getOwnPropertyDescriptors(original));
  Object.defineProperties(customized, {
    startupFixed: { value: 12 },
    name: { value: 'must not replace function name' },
    length: { value: 100 },
    prototype: { value: null }
  });
  try {
    EventEmitter.prototype = customized;
    const a = express(); verifyCopy(a);
    assert.equal(a.name, 'app'); assert.equal(a.length, 3); assert.equal(a.prototype.constructor, a);
    assert.deepEqual(Object.getOwnPropertyDescriptor(a, 'startupFixed'), { value: 12, writable: false, enumerable: false, configurable: false });
  } finally { EventEmitter.prototype = original; }
});

test('startup defines own properties over inherited setters, readonly values and __proto__', () => {
  let writes = 0;
  const descriptors = {
    startupSetter: { set() { writes++; }, configurable: true },
    startupReadonly: { value: false, configurable: true }
  };
  const data = Object.create(null);
  for (const key of ['startupSetter', 'startupReadonly', '__proto__']) data[key] = { value: 42, writable: true, enumerable: true, configurable: true };
  withDescriptors(Function.prototype, descriptors, () => withDescriptors(express.application, data, () => {
    const a = express(); verifyCopy(a); assert.equal(writes, 0);
    for (const key of Object.keys(data)) assert.equal(a[key], 42);
  }));
});

test('startup retains EventEmitter precedence and observes application hook overrides', () => {
  const hooks = ['init', 'defaultConfiguration', 'set', 'enable', 'on'];
  const originals = Object.fromEntries(hooks.map(name => [name, name === 'on' ? EventEmitter.prototype.on : express.application[name]]));
  const calls = [];
  const descriptors = {};
  for (const name of hooks) descriptors[name] = { configurable: true, writable: true, enumerable: true,
    value: function(...args) { calls.push([name, args[0]]); return originals[name].apply(this, args); } };
  withDescriptors(express.application, descriptors, () => {
    const a = express();
    assert.equal(a.on, EventEmitter.prototype.on); assert.equal(calls.some(([name]) => name === 'on'), false);
    for (const name of hooks.slice(0, -1)) assert.ok(calls.some(([hook]) => hook === name), name);
    assert.ok(calls.some(([name, key]) => name === 'set' && key === 'etag fn'));
  });
});

test('startup uses general copy semantics for proxy sources, including disappearing keys', () => {
  const original = EventEmitter.prototype;
  const target = Object.create(null, Object.getOwnPropertyDescriptors(original));
  target.startupFirst = 1; target.startupGone = 2;
  const descriptors = [];
  const proxy = new Proxy(target, {
    getOwnPropertyDescriptor(object, key) {
      descriptors.push(key);
      if (key === 'startupFirst') delete object.startupGone;
      return Reflect.getOwnPropertyDescriptor(object, key);
    }
  });
  try {
    EventEmitter.prototype = proxy;
    const a = express();
    assert.equal(a.startupFirst, 1); assert.equal(Object.hasOwn(a, 'startupGone'), false);
    assert.ok(descriptors.includes('startupGone'));
  } finally { EventEmitter.prototype = original; }
});

test('startup cannot be intercepted by a proxy in the function prototype chain', () => {
  const inherited = Object.getPrototypeOf(Function.prototype);
  let intercepted = 0;
  const proxy = new Proxy(inherited, {
    has() { return false; },
    set() { intercepted++; throw new Error('assignment intercepted'); }
  });
  // This checks copied descriptors only; later initialization intentionally uses
  // ordinary assignments and may be customized by such a prototype.
  withDescriptors(express.application, {
    init: { value() {}, writable: true, enumerable: true, configurable: true },
    request: { value: null, writable: true, enumerable: true, configurable: true },
    response: { value: null, writable: true, enumerable: true, configurable: true }
  }, () => {
    try {
      Object.setPrototypeOf(Function.prototype, proxy);
      const a = express(); verifyCopy(a); assert.equal(intercepted, 0);
    } finally { Object.setPrototypeOf(Function.prototype, inherited); }
  });
});

test('startup rejects invalid EventEmitter prototypes without treating primitives as descriptors', () => {
  const original = EventEmitter.prototype;
  try {
    for (const value of [null, undefined, 'invalid', 3, false]) {
      EventEmitter.prototype = value; assert.throws(() => express(), TypeError);
    }
  } finally { EventEmitter.prototype = original; }
});

test('startup reads current environment and cwd and isolates application state', () => {
  const oldEnv = process.env.NODE_ENV, oldCwd = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vexpress-startup-'));
  try {
    process.env.NODE_ENV = 'development'; const first = express();
    process.env.NODE_ENV = 'production'; process.chdir(directory); const second = express();
    assert.equal(first.get('env'), 'development'); assert.equal(second.get('env'), 'production');
    assert.equal(first.enabled('view cache'), false); assert.equal(second.enabled('view cache'), true);
    assert.equal(second.get('views'), path.join(fs.realpathSync(directory), 'views'));
    for (const key of ['settings', 'locals', 'engines', 'cache', 'request', 'response', 'router']) assert.notEqual(first[key], second[key], key);
    assert.equal(first.locals.settings, first.settings); assert.equal(second.locals.settings, second.settings);
  } finally {
    if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
    process.chdir(oldCwd); fs.rmSync(directory, { recursive: true, force: true });
  }
});
