'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const once = require('..');
const upstream = require('./fixtures/load-once.cjs');

test('unmodified once and wrappy fixtures match verified source hashes', () => {
  for (const source of require('../PROVENANCE.json').sources) assert.equal(createHash('sha256').update(readFileSync(resolve(__dirname, '..', source.fixture))).digest('hex'), source.sha256);
});

test('once forwards receiver/arguments and caches all return-value shapes', () => {
  for (const result of [undefined, null, false, 0, '', 'value', {}, Symbol('value')]) {
    let calls = 0;
    const context = { marker: true };
    const wrapped = once(function (a, b) { calls++; assert.equal(this, context); assert.deepEqual([a, b], [1, 2]); return result; });
    assert.equal(wrapped.called, false); assert.equal(wrapped.value, undefined);
    assert.equal(wrapped.call(context, 1, 2), result);
    assert.equal(wrapped('ignored'), result);
    assert.equal(wrapped.called, true); assert.equal(wrapped.value, result); assert.equal(calls, 1);
  }
});

test('throwing callbacks stay called, matching upstream exception semantics', () => {
  for (const factory of [once, upstream]) {
    let calls = 0; const error = new Error('original');
    const fn = factory(() => { calls++; throw error; });
    assert.throws(fn, e => e === error);
    assert.equal(fn.called, true); assert.equal(fn.value, undefined);
    assert.equal(fn(), undefined); assert.equal(calls, 1);
  }
});

test('reentrant calls cannot invoke the callback again', () => {
  for (const factory of [once, upstream]) {
    let calls = 0;
    const fn = factory(() => { calls++; assert.equal(fn.called, true); assert.equal(fn(), undefined); return 42; });
    assert.equal(fn(), 42); assert.equal(fn(), 42); assert.equal(calls, 1);
  }
});

test('strict wrappers preserve first-call results and reject repeats and reentrancy', () => {
  for (const factory of [once.strict, upstream.strict]) {
    const fn = factory(function named() { assert.throws(fn, { message: "named shouldn't be called more than once" }); return 7; });
    assert.equal(fn.onceError, "named shouldn't be called more than once");
    assert.equal(fn(), 7); assert.equal(fn.value, 7);
    assert.throws(fn, { message: fn.onceError });
    const error = new Error('original');
    const failed = factory(() => { throw error; });
    assert.throws(failed, e => e === error); assert.throws(failed, e => e !== error && e.message === failed.onceError);
  }
});

test('callback state-shaped decorations cannot skip execution or forge results', () => {
  let calls = 0;
  const fn = () => { calls++; return 42; };
  Object.assign(fn, { called: true, value: 'forged', onceError: 'forged error' });
  assert.equal(upstream(fn)(), 'forged'); assert.equal(calls, 0);
  for (const factory of [once, once.strict]) {
    const wrapped = factory(fn);
    assert.equal(wrapped.called, false); assert.equal(wrapped.value, undefined);
    assert.equal(wrapped(), 42); assert.equal(wrapped.value, 42);
  }
  assert.equal(calls, 2);
});

test('public status cannot be changed, redefined or deleted, and frozen wrappers still run', () => {
  let calls = 0;
  const fn = once(() => ++calls);
  for (const key of ['called', 'value']) {
    assert.throws(() => { fn[key] = 'forged'; }, TypeError);
    assert.throws(() => Object.defineProperty(fn, key, { value: 'forged' }), TypeError);
    assert.throws(() => { delete fn[key]; }, TypeError);
  }
  Object.freeze(fn); assert.equal(fn(), 1); assert.equal(fn(), 1); assert.equal(calls, 1);
  const strict = once.strict(() => 2); Object.freeze(strict); assert.equal(strict(), 2); assert.throws(strict);
});

test('ordinary metadata retains property descriptors and enumerable symbols without getter execution', () => {
  const key = Symbol('metadata'); let reads = 0;
  function callback() { return 1; }
  Object.defineProperties(callback, {
    label: { value: 'metadata', enumerable: true, writable: false },
    accessor: { enumerable: true, configurable: true, get() { reads++; return this.label; } },
    hidden: { value: 'hidden' },
    called: { enumerable: true, get() { throw new Error('must not read reserved metadata'); } },
  });
  callback[key] = 3;
  const wrapped = once(callback);
  assert.equal(reads, 0); assert.equal(wrapped.label, 'metadata'); assert.equal(wrapped[key], 3);
  assert.deepEqual(Object.getOwnPropertyDescriptor(wrapped, 'label'), Object.getOwnPropertyDescriptor(callback, 'label'));
  assert.equal(Object.getOwnPropertyDescriptor(wrapped, 'accessor').get, Object.getOwnPropertyDescriptor(callback, 'accessor').get);
  assert.equal(wrapped.accessor, 'metadata'); assert.equal(reads, 1); assert.equal(Object.hasOwn(wrapped, 'hidden'), false);
  assert.equal(wrapped(), 1);
});

test('__proto__ decorations cannot change the wrapper prototype', () => {
  const fn = () => 1; const value = { injected: true };
  Object.defineProperty(fn, '__proto__', { value, enumerable: true });
  const wrapped = once(fn);
  assert.equal(Object.getPrototypeOf(wrapped), Function.prototype); assert.equal(wrapped.__proto__, value);
  assert.equal(wrapped.injected, undefined); assert.equal(wrapped(), 1);
  assert.equal(Object.getPrototypeOf(upstream(fn)), value);
});

test('callback apply decorations do not interfere with native invocation', () => {
  const fn = (a, b) => a + b; fn.apply = 'metadata';
  const wrapped = once(fn);
  assert.equal(wrapped.apply, 'metadata'); assert.equal(wrapped(2, 3), 5);
});

test('Promise identity and rejection caching are preserved', async () => {
  let calls = 0;
  const fn = once(async () => { calls++; return 42; });
  const promise = fn(); assert.equal(fn(), promise); assert.equal(await promise, 42); assert.equal(calls, 1);
  const error = new Error('rejected'); const failure = once(async () => { throw error; });
  const failed = failure(); assert.equal(failure(), failed); await assert.rejects(failed, e => e === error);
});

test('invalid callbacks are rejected at construction, without coercion', () => {
  for (const factory of [once, once.strict]) for (const value of [undefined, null, false, 1, '', {}, [], { apply() {} }]) assert.throws(() => factory(value), TypeError);
});

function child(body) {
  const file = resolve(__dirname, '..');
  const output = spawnSync(process.execPath, ['-e', "'use strict'; const assert = require('node:assert/strict'); const once = require(" + JSON.stringify(file) + ');\n' + body], { encoding: 'utf8' });
  assert.equal(output.status, 0, output.stderr || output.stdout);
}

test('legacy prototype installation is explicit, idempotent and nonenumerable', () => {
  child(`
    assert.equal(Object.hasOwn(Function.prototype, 'once'), false);
    assert.equal(Object.hasOwn(Function.prototype, 'onceStrict'), false);
    once.proto(); const method = Function.prototype.once; once.proto();
    assert.equal(Function.prototype.once, method);
    assert.equal(Object.getOwnPropertyDescriptor(Function.prototype, 'once').enumerable, false);
    const f = (() => 42).once(); assert.equal(f(), 42); assert.equal(f(), 42);
    const g = (() => 43).onceStrict(); assert.equal(g(), 43); assert.throws(g);
  `);
});

test('prototype conflicts and a frozen prototype cause no partial installation', () => {
  child(`
    const existing = () => 'owned';
    Object.defineProperty(Function.prototype, 'onceStrict', { value: existing, configurable: true });
    assert.throws(() => once.proto(), TypeError);
    assert.equal(Object.hasOwn(Function.prototype, 'once'), false);
    assert.equal(Function.prototype.onceStrict, existing);
    delete Function.prototype.onceStrict;
    Object.freeze(Function.prototype);
    assert.throws(() => once.proto(), TypeError);
    assert.equal(Object.hasOwn(Function.prototype, 'once'), false);
  `);
});

test('generated ordinary callback invocations agree with upstream', () => {
  for (let i = 0; i < 1000; i++) {
    const context = { offset: i % 17 };
    const fn = function (a, b) { return this.offset + a * 3 + b; };
    fn.tag = 'case-' + i;
    const a = once(fn), b = upstream(fn);
    for (let j = 0; j < 3; j++) assert.equal(a.call(context, i + j, j), b.call(context, i + j, j));
    assert.equal(a.tag, b.tag); assert.equal(a.called, b.called); assert.equal(a.value, b.value);
  }
});

test('CJS and ESM expose the same callable default and named helpers', async () => {
  const esm = await import('../index.js');
  assert.equal(esm.default, once); assert.equal(esm.strict, once.strict); assert.equal(esm.proto, once.proto);
  assert.equal(Object.isFrozen(once), true);
});
