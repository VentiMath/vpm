'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const first = require('..');

test('first event wins across emitters and preserves every payload', () => {
  const a = new EventEmitter();
  const b = new EventEmitter();
  const payload = { ok: true };
  const calls = [];
  first([[a, 'end'], [b, 'close']], (...args) => calls.push(args));
  b.emit('close', payload, 42);
  a.emit('end');
  assert.deepEqual(calls, [[null, b, 'close', [payload, 42]]]);
  assert.equal(a.listenerCount('end'), 0);
  assert.equal(b.listenerCount('close'), 0);
});

test('cleans up competing listeners before calling back', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  first([[emitter, 'finish', 'close']], () => {
    calls++;
    assert.equal(emitter.listenerCount('finish'), 0);
    assert.equal(emitter.listenerCount('close'), 0);
    emitter.emit('close');
  });
  emitter.emit('finish');
  assert.equal(calls, 1);
});

test('passes an error payload through without wrapping it', () => {
  const emitter = new EventEmitter();
  const error = new Error('connection failed');
  let received;
  first([[emitter, 'finish', 'error']], (...args) => { received = args; });
  emitter.emit('error', error, 'extra');
  assert.deepEqual(received, [error, emitter, 'error', [error, 'extra']]);
  assert.equal(emitter.listenerCount('finish'), 0);
  assert.equal(emitter.listenerCount('error'), 0);
});

test('preserves non-Error error payloads', () => {
  const emitter = new EventEmitter();
  let received;
  first([[emitter, 'error']], (error) => { received = error; });
  emitter.emit('error', 'a string error');
  assert.equal(received, 'a string error');
});

test('preserves an error event with no payload', () => {
  const emitter = new EventEmitter();
  let received;
  first([[emitter, 'error']], (...args) => { received = args; });
  emitter.emit('error');
  assert.deepEqual(received, [undefined, emitter, 'error', []]);
});

test('supports symbol event names', () => {
  const emitter = new EventEmitter();
  const event = Symbol('ready');
  let received;
  first([[emitter, event]], (...args) => { received = args; });
  emitter.emit(event, 'ready');
  assert.deepEqual(received, [null, emitter, event, ['ready']]);
});

test('deferred callback assignment and replacement preserve the thunk API', () => {
  const emitter = new EventEmitter();
  const calls = [];
  const handle = first([[emitter, 'finish']], () => calls.push('original'));
  handle(() => calls.push('replacement'));
  emitter.emit('finish');
  assert.deepEqual(calls, ['replacement']);

  const later = first([[emitter, 'ready']]);
  later(() => calls.push('deferred'));
  emitter.emit('ready');
  assert.deepEqual(calls, ['replacement', 'deferred']);
});

test('cancellation removes only this group and is idempotent', () => {
  const emitter = new EventEmitter();
  let unrelated = 0;
  let calls = 0;
  emitter.on('finish', () => { unrelated++; });
  const handle = first([[emitter, 'finish', 'close']], () => { calls++; });
  handle.cancel();
  handle.cancel();
  handle(() => { calls++; });
  emitter.emit('finish');
  assert.equal(calls, 0);
  assert.equal(unrelated, 1);
  assert.equal(emitter.listenerCount('finish'), 1);
  assert.equal(emitter.listenerCount('close'), 0);
});

test('cancellation after completion is harmless', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  const handle = first([[emitter, 'finish']], () => { calls++; });
  emitter.emit('finish');
  handle.cancel();
  handle.cancel();
  handle(() => { calls++; });
  emitter.emit('finish');
  assert.equal(calls, 1);
});

test('unrelated listeners survive successful completion', () => {
  const emitter = new EventEmitter();
  const existing = () => {};
  emitter.on('finish', existing);
  first([[emitter, 'finish', 'close']], () => {});
  emitter.emit('finish');
  assert.deepEqual(emitter.listeners('finish'), [existing]);
});

test('duplicate event registrations in one tuple invoke the callback once', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  first([[emitter, 'finish', 'finish']], () => { calls++; });
  emitter.emit('finish');
  assert.equal(calls, 1);
  assert.equal(emitter.listenerCount('finish'), 0);
});

test('duplicate source tuples invoke the callback once', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  first([[emitter, 'finish'], [emitter, 'finish']], () => { calls++; });
  emitter.emit('finish');
  assert.equal(calls, 1);
});

test('event emission from a removeListener hook cannot invoke twice', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  first([[emitter, 'finish', 'close']], () => { calls++; });
  emitter.on('removeListener', (event) => {
    if (event === 'finish') emitter.emit('close');
  });
  emitter.emit('finish');
  assert.equal(calls, 1);
  assert.equal(emitter.listenerCount('close'), 0);
});

test('a newListener hook can settle the group without leaking a late listener', () => {
  const emitter = new EventEmitter();
  let calls = 0;
  emitter.on('newListener', (event) => {
    if (event === 'second') emitter.emit('first');
  });
  first([[emitter, 'first', 'second', 'third']], () => { calls++; });
  assert.equal(calls, 1);
  for (const event of ['first', 'second', 'third']) {
    assert.equal(emitter.listenerCount(event), 0);
  }
});

test('listener cleanup holds if the callback throws', () => {
  const emitter = new EventEmitter();
  const error = new Error('callback failed');
  first([[emitter, 'finish', 'close']], () => { throw error; });
  assert.throws(() => emitter.emit('finish'), (caught) => caught === error);
  assert.equal(emitter.listenerCount('finish'), 0);
  assert.equal(emitter.listenerCount('close'), 0);
});

test('validates all sources before attaching any listeners', () => {
  const emitter = new EventEmitter();
  assert.throws(() => first([[emitter, 'finish'], [emitter]], () => {}), TypeError);
  assert.equal(emitter.listenerCount('finish'), 0);
  assert.throws(() => first([[emitter, 'finish'], [{}, 'close']], () => {}), TypeError);
  assert.equal(emitter.listenerCount('finish'), 0);
});

test('rejects invalid input and callback types explicitly', () => {
  const emitter = new EventEmitter();
  for (const source of [null, {}, 1, 'event']) {
    assert.throws(() => first(source, () => {}), TypeError);
  }
  for (const source of [null, {}, [], [emitter], [emitter, 3], [emitter, null]]) {
    assert.throws(() => first([source], () => {}), TypeError);
  }
  assert.throws(() => first([[emitter, 'finish']], null), TypeError);
  const handle = first([[emitter, 'finish']], () => {});
  assert.throws(() => handle(null), TypeError);
  handle.cancel();
});

test('an event before callback assignment throws after cleanup', () => {
  const emitter = new EventEmitter();
  first([[emitter, 'finish', 'close']]);
  assert.throws(() => emitter.emit('finish'), /a listener must be set/);
  assert.equal(emitter.listenerCount('finish'), 0);
  assert.equal(emitter.listenerCount('close'), 0);
});

test('rolls back subscriptions if an emitter throws during registration', () => {
  const error = new Error('registration failed');
  class FailingEmitter extends EventEmitter {
    on(event, listener) {
      super.on(event, listener);
      if (event === 'bad') throw error;
      return this;
    }
  }
  const emitter = new FailingEmitter();
  assert.throws(() => first([[emitter, 'first', 'bad']], () => {}), (caught) => caught === error);
  assert.equal(emitter.listenerCount('first'), 0);
  assert.equal(emitter.listenerCount('bad'), 0);
});

test('snapshots source tuples before newListener hooks can mutate them', () => {
  const emitter = new EventEmitter();
  const source = [emitter, 'finish', 'close'];
  let received;
  emitter.on('newListener', (event) => {
    if (event === 'finish') source[2] = 'changed';
  });
  first([source], (_error, _emitter, event) => { received = event; });
  emitter.emit('close');
  assert.equal(received, 'close');
  assert.equal(emitter.listenerCount('finish'), 0);
});

test('empty source lists return an inert cancellable handle', () => {
  const handle = first([], () => { assert.fail('must not be called'); });
  handle.cancel();
  handle(() => {});
  handle.cancel();
});
