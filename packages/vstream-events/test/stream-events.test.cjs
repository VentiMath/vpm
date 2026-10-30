'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {PassThrough, Readable, Writable} = require('node:stream');
const decorate = require('..');
function fixture() { return Object.assign(new EventEmitter(), {_read() {}, _write() {}}); }

for (const order of [['_read', '_write'], ['_write', '_read']]) test('notifies each direction once: ' + order.join(' then '), () => {
  const s = fixture(), events = [];
  s.on('reading', () => events.push('read')); s.on('writing', () => events.push('write'));
  decorate(s);
  for (const key of order) { s[key](); s[key](); s[key](); }
  assert.deepEqual(events, order.map(key => key.slice(1)));
});
test('preserves arguments, receiver and exact return value with listeners present', () => {
  const s = fixture(), receiver = {}, result = {}, values = [{}, 'utf8', () => {}];
  s._write = function (...args) { assert.equal(this, receiver); assert.deepEqual(args, values); return result; };
  s.on('writing', (...args) => assert.deepEqual(args, values));
  decorate(s);
  assert.equal(s._write.apply(receiver, values), result);
});
test('original method runs before the notification', () => {
  const s = fixture(), order = [];
  s._read = () => order.push('method'); s.on('reading', () => order.push('event'));
  decorate(s)._read(); assert.deepEqual(order, ['method', 'event']);
});
test('restores own function identity and descriptors', () => {
  const s = fixture(); Object.defineProperty(s, '_read', {enumerable: false});
  const before = Object.getOwnPropertyDescriptor(s, '_read');
  decorate(s)._read(); assert.deepEqual(Object.getOwnPropertyDescriptor(s, '_read'), before);
});
test('restores inherited function identity in the own method slots', () => {
  class S extends EventEmitter { _read() {} _write() {} }
  const s = new S(); decorate(s); assert(Object.hasOwn(s, '_read'));
  s._read(); s._write(); assert(Object.hasOwn(s, '_read')); assert(Object.hasOwn(s, '_write'));
  assert.equal(s._read, S.prototype._read);
});
test('reentrant method and event calls cannot duplicate notifications', () => {
  const s = fixture(); let calls = 0, notifications = 0;
  s._read = function () { if (++calls === 1) this._read(); };
  s.on('reading', () => { notifications++; s._read(); });
  decorate(s)._read(); assert.equal(calls, 3); assert.equal(notifications, 1);
});
test('retained wrappers remain once-only under reentrancy', () => {
  const s = fixture(); let cached, calls = 0, notifications = 0;
  s._read = () => { if (++calls === 1) cached(); };
  s.on('reading', () => notifications++); decorate(s); cached = s._read.bind(s);
  cached(); cached(); assert.equal(calls, 3); assert.equal(notifications, 1);
});
test('method exceptions propagate without emitting or rearming', () => {
  const s = fixture(), error = new Error('read'); let events = 0;
  s._read = () => { throw error; }; s.on('reading', () => events++);
  const original = s._read; decorate(s);
  assert.throws(() => s._read(), e => e === error); assert.equal(s._read, original); assert.equal(events, 0);
});
test('listener exceptions cannot rearm hooks', () => {
  const s = fixture(), error = new Error('listener'); let calls = 0;
  s.on('reading', () => { calls++; throw error; }); decorate(s);
  assert.throws(() => s._read(), e => e === error); s._read(); assert.equal(calls, 1);
});
test('does not overwrite replacements installed by the method or listener', () => {
  for (const replaceInMethod of [true, false]) {
    const s = fixture(), replacement = () => 42;
    if (replaceInMethod) s._read = () => { s._read = replacement; };
    else s.on('reading', () => { s._read = replacement; });
    decorate(s)._read(); assert.equal(s._read, replacement);
  }
});
test('calling a saved hook cannot overwrite an externally replaced method', () => {
  const s = fixture(), replacement = () => 42; decorate(s); const saved = s._read;
  s._read = replacement; saved.call(s); assert.equal(s._read, replacement);
});
test('explicit redecoration starts another observation period, as upstream does', () => {
  const s = fixture(); let count = 0; s.on('reading', () => count++);
  assert.equal(decorate(s), s); s._read(); s._read(); assert.equal(count, 1);
  const original = s._read; decorate(s); assert.notEqual(s._read, original);
  s._read(); s._read(); assert.equal(count, 2); assert.equal(s._read, original);
});
test('works through constructor-style call(this)', () => {
  class S extends PassThrough { constructor() { super(); decorate.call(this); } }
  const s = new S(); let count = 0; s.on('reading', () => count++); s.read(0); s.read(0);
  assert.equal(count, 1); s.destroy();
});
test('supports native readable-only and writable-only streams', async () => {
  const readable = decorate(new Readable({read() { this.push('ok'); this.push(null); }}));
  let reads = 0; readable.on('reading', () => reads++);
  let body = ''; for await (const chunk of readable) body += chunk;
  assert.equal(body, 'ok'); assert.equal(reads, 1);
  let writes = 0, calls = 0;
  const writable = decorate(new Writable({write(chunk, encoding, done) {calls++; done();}}));
  writable.on('writing', () => writes++);
  await new Promise((resolve, reject) => {writable.on('error', reject); writable.write('a'); writable.end('b', resolve);});
  assert.equal(calls, 2); assert.equal(writes, 1);
});
test('supports byte and object streams without changing data', async () => {
  for (const objectMode of [false, true]) {
    const s = decorate(new PassThrough({objectMode})); let reads = 0, writes = 0;
    s.on('reading', () => reads++); s.on('writing', () => writes++);
    const values = objectMode ? [{a: 1}, {a: 2}] : [Buffer.from('a'), Buffer.from('b')];
    const actual = [];
    const consume = (async () => { for await (const value of s) actual.push(value); })();
    for (const value of values) s.write(value); s.end();
    await consume;
    if (objectMode) assert.deepEqual(actual, values); else assert.equal(Buffer.concat(actual).toString(), 'ab');
    assert.equal(reads, 1); assert.equal(writes, 1);
  }
});
test('validates both methods before changing either', () => {
  for (const value of [null, 1, {}]) {
    const s = fixture(), read = s._read; s._write = value;
    assert.throws(() => decorate(s), TypeError); assert.equal(s._read, read);
  }
  const s = fixture(), read = s._read; Object.defineProperty(s, '_write', {writable: false});
  assert.throws(() => decorate(s), TypeError); assert.equal(s._read, read);
});
test('rejects missing contracts and own accessors without invoking them', () => {
  for (const value of [null, false, 1, 'stream', {}, {emit() {}}]) assert.throws(() => decorate(value), TypeError);
  const s = fixture(); let reads = 0;
  Object.defineProperty(s, '_write', {get() { reads++; return () => {}; }});
  assert.throws(() => decorate(s), TypeError); assert.equal(reads, 0);
});
test('rejects inherited accessors and readonly methods before installing hooks', () => {
  for (const descriptor of [{get() {assert.fail('getter must not run');}}, {value() {}, writable: false}]) {
    const prototype = Object.create(EventEmitter.prototype); Object.defineProperty(prototype, '_write', descriptor);
    const s = Object.create(prototype); s._read = () => {}; const read = s._read;
    assert.throws(() => decorate(s), TypeError); assert.equal(s._read, read);
  }
});
test('rolls back a first hook when installing the second fails', () => {
  const target = fixture(), read = target._read; let fail = true;
  const s = new Proxy(target, {defineProperty(obj, key, descriptor) { if (key === '_write' && fail) throw new Error('blocked'); return Reflect.defineProperty(obj, key, descriptor); }});
  assert.throws(() => decorate(s), /blocked/); assert.equal(target._read, read);
  fail = false; decorate(s); s._read(); assert.equal(target._read, read);
});
test('freezing a decorated object leaves inert once-only wrappers', () => {
  const s = {emit() {events++;}, _read() {return 42;}}; let events = 0;
  decorate(s); Object.freeze(s);
  assert.equal(s._read(), 42); assert.equal(s._read(), 42); assert.equal(events, 1);
});
