'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const depd = require('..');
const upstream = require('./fixtures/depd-2.0.0.cjs');
const library = require('./fixtures/library.cjs');

function env(values, fn) {
  const old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) value === undefined ? delete process.env[key] : process.env[key] = value;
    return fn();
  } finally {
    for (const [key, value] of Object.entries(old)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
}
function events(fn) {
  const received = [];
  const listener = error => received.push(error);
  process.on('deprecation', listener);
  try { fn(received); } finally { process.removeListener('deprecation', listener); }
  return received;
}
function output(fn, tty = false) {
  const write = process.stderr.write;
  const descriptor = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
  let text = '';
  process.stderr.write = value => { text += value; return true; };
  Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: tty });
  try { fn(); } finally {
    process.stderr.write = write;
    if (descriptor) Object.defineProperty(process.stderr, 'isTTY', descriptor); else delete process.stderr.isTTY;
  }
  return text;
}
function quiet(fn) { return env({ NO_DEPRECATION: '*', TRACE_DEPRECATION: undefined }, fn); }

for (const [name, factory] of [['upstream', upstream], ['vpm', depd]]) {
  test(name + ': direct warnings deduplicate by deprecation and external call site', () => {
    const lib = library(factory);
    const received = events(() => {
      for (let i = 0; i < 5; i++) lib.old();
      lib.old(); lib.old();
      for (const method of ['old', 'other']) lib[method]();
    });
    assert.equal(received.length, 5);
    assert.ok(received.every(e => e.message === 'use next' && e.namespace === 'example-lib'));
    assert.match(received[0].stack, /depd.test.cjs:\d+:\d+/);
  });
  test(name + ': changing a message at the same site does not repeat the warning', () => {
    const lib = library(factory);
    assert.equal(events(() => { for (const msg of ['one', 'two']) lib.dynamic(msg); }).length, 1);
  });
  test(name + ': function wrapper preserves receiver, arguments, return and arity', () => {
    const lib = library(factory);
    assert.equal(lib.wrapped.length, 2);
    const received = events(() => { for (let i = 0; i < 3; i++) assert.equal(lib.wrapped.call({ base: 10 }, 2, 3), 15); });
    assert.equal(received.length, 1);
    assert.equal(received[0].message, 'use sum');
    assert.match(received[0].stack, /depd.test.cjs:\d+:\d+/);
  });
  test(name + ': default messages identify direct and wrapped functions', () => {
    const lib = library(factory);
    const received = events(() => { lib.auto(); lib.defaultWrapped(); });
    assert.match(received[0].message, /autoName/);
    assert.match(received[1].message, /named/);
  });
  test(name + ': property get/set warnings preserve owner value', () => {
    const lib = library(factory);
    const received = events(() => { lib.object.value = 2; assert.equal(lib.object.value, 2); });
    assert.equal(received.length, 2);
    assert.equal(received[0].message, 'use nextValue');
  });
  test(name + ': namespace filters match exactly, case-insensitively, with commas/spaces and wildcard', () => {
    for (const [filter, suppressed] of [['other,EXAMPLE-LIB third', true], ['*', true], ['example', false], ['example-*', false]]) {
      env({ NO_DEPRECATION: filter }, () => {
        const lib = library(factory);
        assert.equal(output(() => lib.old()).length === 0, suppressed);
      });
    }
  });
  test(name + ': listeners override suppression and replace stderr output', () => {
    quiet(() => {
      const lib = library(factory);
      const received = events(() => assert.equal(output(() => lib.old()), ''));
      assert.equal(received.length, 1);
      const error = received[0];
      assert.ok(error instanceof Error);
      assert.equal(Object.prototype.toString.call(error), '[object Error]');
      assert.equal(error.name, 'DeprecationError');
      assert.equal(Object.keys(error).length, 0);
      error.namespace = 'changed'; error.message = 'changed'; error.name = 'Changed'; error.stack = 'custom';
      assert.equal(error.stack, 'custom');
    });
  });
  test(name + ': filtering policy is captured at factory creation', () => {
    quiet(() => {
      const lib = library(factory);
      env({ NO_DEPRECATION: undefined }, () => assert.equal(output(() => lib.old()), ''));
    });
  });
  test(name + ': plain stderr has timestamp and location; TTY has colors', () => {
    const lib = library(factory);
    const plain = output(() => lib.old());
    assert.match(plain, /GMT example-lib deprecated use next at .*depd.test.cjs:\d+:\d+\n$/);
    assert.doesNotMatch(plain, /\x1b/);
    const colored = library(factory);
    assert.match(output(() => colored.old(), true), /\x1b\[36;1mexample-lib/);
  });
  test(name + ': trace filter emits caller frames in plain and colored output', () => {
    env({ TRACE_DEPRECATION: 'EXAMPLE-LIB' }, () => {
      const lib = library(factory);
      assert.match(output(() => lib.old()), /\n    at .*depd.test.cjs/);
      const colored = library(factory);
      assert.match(output(() => colored.old(), true), /\n    \x1b\[36mat /);
    });
  });
  test(name + ': process flags suppress and trace warnings', () => {
    const ignored = process.noDeprecation, traced = process.traceDeprecation;
    try {
      process.noDeprecation = true;
      const a = library(factory);
      assert.equal(output(() => a.old()), '');
      process.noDeprecation = false; process.traceDeprecation = true;
      const b = library(factory);
      assert.match(output(() => b.old()), /\n    at /);
    } finally { process.noDeprecation = ignored; process.traceDeprecation = traced; }
  });
  test(name + ': errors from callbacks/accessors are preserved', () => quiet(() => {
    const warn = factory('test'), problem = new Error('same');
    const fn = warn.function(() => { throw problem; });
    assert.throws(fn, error => error === problem);
    const obj = { get value() { throw problem; } };
    warn.property(obj, 'value');
    assert.throws(() => obj.value, error => error === problem);
  }));
  test(name + ': accessor receiver and descriptor flags are preserved', () => quiet(() => {
    const warn = factory('test'); let reads = 0;
    const obj = Object.defineProperty({}, 'value', { configurable: true, get() { reads++; return this.x; }, set(v) { this.x = v; } });
    warn.property(obj, 'value'); assert.equal(reads, 0);
    const child = Object.create(obj); child.value = 12;
    assert.equal(child.value, 12); assert.equal(obj.x, undefined);
    assert.equal(Object.getOwnPropertyDescriptor(obj, 'value').enumerable, false);
  }));
  test(name + ': invalid wrappers and nonconfigurable or inherited properties are rejected', () => quiet(() => {
    const warn = factory('test');
    for (const fn of [null, {}, 1]) assert.throws(() => warn.function(fn), TypeError);
    for (const obj of [null, undefined, 'x', 1]) assert.throws(() => warn.property(obj, 'x'), TypeError);
    assert.throws(() => warn.property(Object.create({ x: 1 }), 'x'), /owner/);
    assert.throws(() => warn.property(Object.freeze({ x: 1 }), 'x'), /configurable/);
  }));
  test(name + ': missing getter/setter and readonly data remain restricted', () => quiet(() => {
    const warn = factory('test');
    const obj = Object.defineProperties({}, {
      read: { configurable: true, get() { return 4; } },
      write: { configurable: true, set(v) { this.x = v; } },
      data: { configurable: true, value: 2 },
    });
    for (const key of ['read', 'write', 'data']) warn.property(obj, key);
    assert.equal(obj.write, undefined); obj.write = 3; assert.equal(obj.x, 3);
    assert.throws(() => { obj.read = 1; }, TypeError);
    assert.throws(() => { obj.data = 1; }, TypeError);
  }));
}

test('private state cannot be used to mute or reset warnings; methods are bound', () => {
  const lib = library(depd);
  assert.ok(Object.isFrozen(lib.warn));
  assert.equal(lib.warn._warned, undefined);
  assert.throws(() => { lib.warn._ignored = true; }, TypeError);
  assert.equal(events(() => lib.old()).length, 1);
  quiet(() => {
    const { function: wrap, property } = depd('test');
    assert.equal(wrap(x => x)(3), 3);
    const obj = { x: 1 }; property(obj, 'x'); assert.equal(obj.x, 1);
  });
});
test('function metadata, statics, class construction and subclasses survive wrapping', () => quiet(() => {
  const warn = depd('test');
  class Base { static version = 4; constructor(value) { this.value = value; this.target = new.target; } }
  const Wrapped = warn.function(Base);
  assert.equal(Wrapped.name, 'Base'); assert.equal(Wrapped.length, 1);
  assert.equal(Wrapped.version, 4); assert.equal(Wrapped.prototype, Base.prototype);
  const instance = new Wrapped(9);
  assert.equal(instance.value, 9); assert.equal(instance.target, Base);
  assert.ok(instance instanceof Wrapped); assert.ok(instance instanceof Base);
  class Child extends Wrapped {}
  assert.equal(new Child(3).target, Child);
  assert.equal(new (warn.function(Date))(0).getTime(), 0);
  const arrow = warn.function(x => x);
  assert.throws(() => new arrow(), TypeError);
}));
test('async, generator and bound function contracts survive wrapping', async () => {
  await quiet(async () => {
    const warn = depd('test');
    assert.equal(await warn.function(async x => x + 1)(2), 3);
    assert.deepEqual([...warn.function(function* () { yield 3; })()], [3]);
    const fn = function(a) { return this.x + a; }.bind({ x: 4 });
    assert.equal(warn.function(fn)(5), 9);
  });
});
test('inherited data writes do not mutate prototype or siblings', () => quiet(() => {
  const owner = { x: 1 }; depd('test').property(owner, 'x');
  const a = Object.create(owner), b = Object.create(owner);
  a.x = 2;
  assert.equal(owner.x, 1); assert.equal(b.x, 1); assert.equal(a.x, 2);
  assert.deepEqual(Object.getOwnPropertyDescriptor(a, 'x'), { value: 2, writable: true, enumerable: true, configurable: true });
  owner.x = 3; assert.equal(b.x, 3); assert.equal(a.x, 2);
}));
test('explicit receiver writes honor existing own descriptors and frozen receivers', () => quiet(() => {
  const owner = { x: 1 }; depd('test').property(owner, 'x');
  const child = Object.defineProperty({}, 'x', { value: 3, writable: true });
  assert.equal(Reflect.set(owner, 'x', 4, child), true);
  assert.deepEqual(Object.getOwnPropertyDescriptor(child, 'x'), { value: 4, writable: true, enumerable: false, configurable: false });
  for (const receiver of [Object.freeze({}), Object.freeze({ x: 1 }), { get x() { return 1; } }]) {
    assert.throws(() => Reflect.set(owner, 'x', 4, receiver), TypeError);
  }
  assert.equal(owner.x, 1);
}));
test('property installation is a single definition and failure leaves original descriptor', () => quiet(() => {
  const object = { x: 1 }; let attempts = 0;
  const proxy = new Proxy(object, { defineProperty() { attempts++; throw new Error('blocked'); } });
  assert.throws(() => depd('test').property(proxy, 'x'), /blocked/);
  assert.equal(attempts, 1); assert.deepEqual(Object.getOwnPropertyDescriptor(object, 'x'), { value: 1, writable: true, configurable: true, enumerable: true });
}));
test('symbol and numeric property keys work with default messages', () => {
  const symbol = Symbol('test'), obj = { [symbol]: 1, 3: 4 };
  const warn = depd('test'); warn.property(obj, symbol); warn.property(obj, 3);
  const received = events(() => { assert.equal(obj[symbol], 1); assert.equal(obj[3], 4); });
  assert.deepEqual(received.map(e => e.message), ['Symbol(test)', '3']);
});
test('namespace and property-key coercion are rejected', () => quiet(() => {
  for (const value of ['', null, undefined, 1, {}, Symbol('x')]) assert.throws(() => depd(value), TypeError);
  let coerced = false;
  assert.throws(() => depd('x').property({ x: 1 }, { toString() { coerced = true; return 'x'; } }), TypeError);
  assert.equal(coerced, false);
}));
test('short captures expand to distinguish callers behind deep library stacks', () => {
  const limit = Error.stackTraceLimit;
  try {
    Error.stackTraceLimit = 60;
    const lib = library(depd);
    const received = events(() => {
      for (let i = 0; i < 3; i++) lib.deep(20);
      lib.deep(20);
    });
    assert.equal(received.length, 2);
    for (const error of received) assert.match(error.stack, /depd.test.cjs:\d+:\d+/);
  } finally { Error.stackTraceLimit = limit; }
});
test('creating wrappers preserves the runtime own stack depth, not just Error metadata', () => {
  function depth(left) {
    const value = left ? depth(left - 1) : new Error().stack;
    return String(value);
  }
  const before = depth(20).split('\n').length;
  for (let i = 0; i < 30; i++) depd('depth').function(value => value);
  assert.equal(depth(20).split('\n').length, before);
});
test('wrapping does not generate source from function length metadata', () => quiet(() => {
  const fn = value => value;
  Object.defineProperty(fn, 'length', { value: Infinity });
  const wrapped = depd('test').function(fn);
  assert.equal(wrapped.length, Infinity); assert.equal(wrapped(3), 3);
}));
test('normal custom stack hook and its descriptor survive warning capture', () => {
  const before = Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
  let calls = 0;
  const hook = () => { calls++; return 'custom stack'; };
  try {
    Error.prepareStackTrace = hook;
    const descriptor = Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace');
    const lib = library(depd);
    const received = events(() => lib.old());
    assert.match(received[0].stack, /deprecated/);
    // Bun eagerly formats the new Error used for event delivery.
    assert.equal(calls, process.versions.bun ? 1 : 0);
    assert.deepEqual(Object.getOwnPropertyDescriptor(Error, 'prepareStackTrace'), descriptor);
    assert.equal(new Error().stack, 'custom stack');
  } finally {
    if (before) Error.prepareStackTrace = before.value; else delete Error.prepareStackTrace;
  }
});
test('warning is marked before listeners run, including when Node listeners throw', () => {
  const lib = library(depd); const problem = new Error('listener'); let calls = 0;
  const listener = () => { calls++; if (!process.versions.bun) throw problem; };
  process.on('deprecation', listener);
  try {
    for (let i = 0; i < 2; i++) { try { lib.old(); } catch (error) { assert.equal(error, problem); } }
    assert.equal(calls, 1);
  } finally { process.removeListener('deprecation', listener); }
});
test('Node native stack capture works with a throwing, immutable Error hook', { skip: !!process.versions.bun || !require('node:util').getCallSites }, () => {
  const source = `const assert=require('node:assert/strict'); const depd=require(${JSON.stringify(require.resolve('..'))});
    const hook=()=>{throw Error('hook called')}; Object.defineProperty(Error,'prepareStackTrace',{value:hook,writable:false,configurable:false});
    Object.defineProperty(Error,'stackTraceLimit',{value:0,writable:false,configurable:false});
    let count=0;process.on('deprecation',e=>{assert.match(e.stack,/deprecated/);count++});
    const warn=depd('test');warn('direct');warn.function(x=>x)(1);const obj={x:1};warn.property(obj,'x');obj.x;
    assert.equal(count,3);assert.equal(Error.prepareStackTrace,hook);assert.equal(Error.stackTraceLimit,0);`;
  const result = spawnSync(process.execPath, ['-e', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
test('wrapping works when string code generation is disabled', { skip: !!process.versions.bun }, () => {
  const source = `const depd=require(${JSON.stringify(require.resolve('..'))}); process.env.NO_DEPRECATION='*'; const f=depd('test').function(function(a){return a+1}); if(f(2)!==3)throw Error('wrong result');`;
  const result = spawnSync(process.execPath, ['--disallow-code-generation-from-strings', '-e', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
test('legacy capture restores exact descriptors even when capture throws', () => {
  const source = `const assert=require('node:assert/strict'); const util=require('node:util');util.getCallSites=undefined;
    const depd=require(${JSON.stringify(require.resolve('..'))}); delete Error.prepareStackTrace;
    const before=Object.getOwnPropertyDescriptor(Error,'stackTraceLimit'); const original=Error.captureStackTrace;
    Error.captureStackTrace=()=>{throw Error('capture failed')};assert.throws(()=>depd('test'),/capture failed/);
    assert.equal(Object.hasOwn(Error,'prepareStackTrace'),false);assert.deepEqual(Object.getOwnPropertyDescriptor(Error,'stackTraceLimit'),before);
    Error.captureStackTrace=original;process.env.NO_DEPRECATION='*';depd('test')('x');assert.equal(Object.hasOwn(Error,'prepareStackTrace'),false);`;
  const result = spawnSync(process.execPath, ['-e', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
test('browser entry is dependency-free and validates without wrapping or mutation', () => {
  const browser = require('../browser');
  const warn = browser('test'), fn = x => x, obj = { x: 1 }, before = Object.getOwnPropertyDescriptor(obj, 'x');
  assert.equal(warn('x'), undefined); assert.equal(warn.function(fn), fn);
  warn.property(obj, 'x'); assert.deepEqual(Object.getOwnPropertyDescriptor(obj, 'x'), before);
  assert.throws(() => browser(''), TypeError); assert.throws(() => warn.function(1), TypeError);
  assert.throws(() => warn.property({}, 'x'), TypeError);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../browser.js'), 'utf8'), /node:|process\./);
});
test('vendored comparison and reference files match their provenance hashes', () => {
  const provenance = require('../PROVENANCE.json');
  for (const fixture of provenance.fixtures) {
    const bytes = fs.readFileSync(path.join(__dirname, '..', fixture.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256, fixture.file);
  }
});
