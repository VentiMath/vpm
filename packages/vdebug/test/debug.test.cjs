'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const util = require('node:util');
const setup = require('../common');
const ms = require('../../vms');
const load = require('./load.cjs');
const originalMs = require('./fixtures/ms-2.1.3.cjs');
const fixture = name => path.join(__dirname, 'fixtures/debug-4.4.3', name);
const originalSetup = load(fixture('common.js'), { ms: originalMs });
function environment() {
  return { colors: [1, 2, 3], useColors: () => false, formatArgs() {}, log() {}, save() {}, load() {}, destroy() {} };
}

test('supports names, wildcards, exclusions, and literal regexp punctuation', () => {
  const debug = setup(environment());
  debug.enable('api:*, -api:secret foo[bar] a.b');
  for (const name of ['api:users', 'api:', 'foo[bar]', 'a.b']) assert.equal(debug.enabled(name), true, name);
  for (const name of ['api:secret', 'api', 'foobar', 'axb', 'other']) assert.equal(debug.enabled(name), false, name);
});
test('matches upstream on exhaustive small wildcard patterns and names', () => {
  const debug = setup(environment()), upstream = originalSetup(environment());
  function strings(alphabet, max) {
    const result = [''];
    let level = [''];
    for (let i = 0; i < max; i++) { level = level.flatMap(prefix => alphabet.map(char => prefix + char)); result.push(...level); }
    return result;
  }
  const names = strings(['a', 'b'], 6);
  for (const pattern of strings(['a', 'b', '*'], 5)) {
    for (const config of [pattern, '*,-' + pattern]) {
      debug.enable(config); upstream.enable(config);
      for (const name of names) assert.equal(debug.enabled(name), upstream.enabled(name), JSON.stringify({ config, name }));
    }
  }
});
test('matches upstream for generated Unicode, punctuation, and multi-pattern filters', () => {
  const debug = setup(environment()), upstream = originalSetup(environment());
  let seed = 0x72a9bcef;
  function random(max) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % max; }
  const chars = ['a', 'b', ':', '[', ']', '.', '😀', 'é', '*'];
  function word() { return Array.from({ length: random(20) }, () => chars[random(chars.length)]).join(''); }
  for (let i = 0; i < 2000; i++) {
    const config = word() + ',' + word() + ',-' + word();
    debug.enable(config); upstream.enable(config);
    const name = word();
    assert.equal(debug.enabled(name), upstream.enabled(name), JSON.stringify({ config, name }));
  }
});
test('handles long wildcard failures without rescanning a long prefix at each position', () => {
  const debug = setup(environment());
  debug.enable('*' + 'a'.repeat(1000) + 'b');
  assert.equal(debug.enabled('a'.repeat(100000)), false);
  debug.enable('a*ab');
  assert.equal(debug.enabled('ab'), false);
  assert.equal(debug.enabled('aab'), true);
  debug.enable('*a*a');
  assert.equal(debug.enabled('a'), false);
  assert.equal(debug.enabled('aa'), true);
});
test('invalidates existing loggers on enable/disable and restores normalized filters', () => {
  const debug = setup(environment());
  const log = debug('app:http');
  assert.equal(log.enabled, false);
  debug.enable('app:* -app:secret');
  assert.equal(log.enabled, true);
  const previous = debug.disable();
  assert.equal(previous, 'app:*,-app:secret');
  assert.equal(log.enabled, false);
  debug.enable(previous);
  assert.equal(log.enabled, true);
  assert.equal(debug.enabled('app:secret'), false);
});
test('readonly filter snapshots cannot silently desynchronize logger caches', () => {
  const debug = setup(environment());
  debug.enable('app:*');
  const names = debug.names;
  assert.throws(() => names.push('other'), TypeError);
  assert.throws(() => { debug.names = ['other']; }, TypeError);
  assert.throws(() => { debug.namespaces = 'other'; }, TypeError);
  debug.enable('new');
  assert.deepEqual(names, ['app:*']);
  assert.deepEqual(debug.names, ['new']);
});
test('supports boolean enabled overrides and null to restore namespace filtering', () => {
  const debug = setup(environment()), log = debug('app');
  log.enabled = true; assert.equal(log.enabled, true);
  log.enabled = false; debug.enable('*'); assert.equal(log.enabled, false);
  log.enabled = null; assert.equal(log.enabled, true);
  assert.throws(() => { log.enabled = 'yes'; }, TypeError);
});
test('a changed logger namespace refreshes cached enablement', () => {
  const debug = setup(environment()); debug.enable('app');
  const log = debug('app'); assert.equal(log.enabled, true);
  log.namespace = 'other'; assert.equal(log.enabled, false);
});
test('disabled logging does not coerce, format, or call the output sink', () => {
  const debug = setup(environment()), log = debug('off');
  debug.coerce = () => { throw new Error('must not coerce'); };
  log.log = () => { throw new Error('must not log'); };
  log({ toString() { throw new Error('must not convert'); } });
  assert.equal(log.curr, undefined);
});
test('retains custom formatters, Error coercion, and per-instance log overrides', () => {
  const debug = setup(environment()); debug.enable('*');
  const log = debug('app');
  const calls = []; log.log = function (...args) { assert.equal(this, log); calls.push(args); };
  debug.formatters.h = function (value) { assert.equal(this, log); return value.toString(16); };
  log('%h %s %%', 255, 'word');
  assert.deepEqual(calls[0], ['ff %s %', 'word']);
  const error = new Error('broken'); log(error); assert.equal(calls[1][0], error.stack);
  log({ value: 1 }); assert.deepEqual(calls[2], ['%O', { value: 1 }]);
  assert.equal(debug.humanize, ms);
  assert.equal(debug.debug, debug); assert.equal(debug.default, debug);
});
test('extend preserves the parent sink and supports custom delimiters', () => {
  const debug = setup(environment()), log = debug('app');
  log.log = () => {};
  assert.equal(log.extend('http').namespace, 'app:http');
  assert.equal(log.extend('http', '/').namespace, 'app/http');
  assert.equal(log.extend('http').log, log.log);
  assert.throws(() => log.extend(1), TypeError);
});
test('elapsed time stays positive across a backwards wall-clock change', () => {
  let monotonic = 0, wall = 10000;
  const custom = load(path.join(__dirname, '../common.js'), { vms: ms }, {
    performance: { now: () => monotonic }, Date: { now: () => wall },
  })(environment());
  custom.enable('*'); const log = custom('clock'); log();
  assert.equal(log.diff, 0); assert.equal(log.curr, 10000);
  monotonic = 50.2; wall = 9000; log();
  assert.equal(log.diff, 50); assert.equal(log.prev, 10000); assert.equal(log.curr, 9000);
});
test('invalid configuration fails without changing the previous filters', () => {
  const debug = setup(environment()); debug.enable('app');
  for (const value of [null, 1, {}, []]) {
    assert.throws(() => debug.enable(value), TypeError);
    assert.throws(() => debug(value), TypeError);
    assert.throws(() => debug.enabled(value), TypeError);
  }
  assert.equal(debug.enabled('app'), true);
  debug.save = () => { throw new Error('storage failed'); };
  assert.throws(() => debug.enable('other'), /storage failed/);
  assert.equal(debug.enabled('app'), true);
});

test('Node output and inspection match upstream with colors and dates disabled', () => {
  const globals = { process: { env: { DEBUG: '*', DEBUG_HIDE_DATE: '1', DEBUG_COLORS: '0' }, stderr: { fd: 2 } } };
  const debug = load(path.join(__dirname, '../node.js'), { './common': setup }, globals);
  const original = load(fixture('node.js'), { './common': originalSetup }, globals);
  const actual = [], expected = [];
  const log = debug('app'), old = original('app');
  log.log = (...args) => actual.push(util.formatWithOptions(debug.inspectOpts, ...args));
  old.log = (...args) => expected.push(util.formatWithOptions(original.inspectOpts, ...args));
  for (const args of [['hello %s', 'world'], ['count %d', 42], ['%o', { a: [1, 2] }], ['%O', { nested: { a: 1 } }], [{ object: true }], ['multiline\ntext']]) {
    log(...args); old(...args);
  }
  assert.deepEqual(actual, expected);
});
test('Node uses built-in terminal color detection without loading supports-color', () => {
  const loaded = [];
  const globals = { process: { env: { DEBUG: '*', DEBUG_COLORS: '1' }, stderr: {
    fd: 2, hasColors(depth) { loaded.push(depth); return depth === 256; },
  } } };
  const debug = load(path.join(__dirname, '../node.js'), { './common': setup }, globals);
  assert.deepEqual(loaded, [256]); assert.ok(debug.colors.length > 6);
  const log = debug('color'), calls = []; log.log = (...args) => calls.push(args);
  log('message'); assert.match(calls[0][0], /\x1b\[38;5;/);
});
test('browser adapter retains storage, CSS colors, JSON formatting, and console output', () => {
  const stored = new Map([['debug', 'web:*']]), calls = [];
  const globals = {
    process: undefined,
    localStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
    navigator: { userAgent: 'AppleWebKit/537.36' },
    console: { debug(...args) { calls.push(args); } },
  };
  const debug = load(path.join(__dirname, '../browser.js'), { './common': setup }, globals);
  const log = debug('web:http'); assert.equal(log.enabled, true);
  log('value %j', { x: 1 });
  assert.match(calls[0][0], /web:http.*value \{"x":1\}/);
  assert.equal(calls[0].filter(arg => typeof arg === 'string' && arg.startsWith('color:')).length, 3);
  debug.disable(); assert.equal(stored.has('debug'), false);
  debug.enable('new:*'); assert.equal(stored.get('debug'), 'new:*');
});
test('browser loading tolerates unavailable storage', () => {
  const debug = load(path.join(__dirname, '../browser.js'), { './common': setup }, { process: undefined, console: { log() {} } });
  debug.enable('app'); assert.equal(debug.enabled('app'), true); debug.disable();
});
test('browser starts disabled with empty storage and exposes boolean color support', () => {
  const debug = load(path.join(__dirname, '../browser.js'), { './common': setup }, {
    process: undefined, console: { log() {} },
    localStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },
  });
  assert.equal(debug.load(), undefined);
  assert.equal(debug('app').enabled, false);
  assert.equal(debug.useColors(), false);
});
