'use strict';

const assert = require('node:assert/strict');
const { AsyncLocalStorage } = require('node:async_hooks');
const { EventEmitter } = require('node:events');
const http = require('node:http');
const test = require('node:test');
const onFinished = require('..');

function outgoing(withSocket = true) {
  const message = new EventEmitter();
  message.finished = false;
  message.socket = withSocket ? Object.assign(new EventEmitter(), { readable: true, writable: true }) : null;
  return message;
}

function assertClean(message, socket = message.socket) {
  for (const event of ['end', 'finish', 'socket']) assert.equal(message.listenerCount(event), 0, event);
  if (socket) {
    for (const event of ['error', 'close']) assert.equal(socket.listenerCount(event), 0, event);
  }
}

test('returns the message and observes response finish with cleanup before callback', () => {
  const message = outgoing();
  let calls = 0;
  assert.equal(onFinished(message, (error, original) => {
    assert.equal(error, null);
    assert.equal(original, message);
    assertClean(message);
    calls++;
  }), message);
  message.emit('finish');
  message.socket.emit('close');
  message.emit('end');
  assert.equal(calls, 1);
});

test('observes incoming message end', () => {
  const message = outgoing();
  delete message.finished;
  message.complete = false;
  message.readable = true;
  let calls = 0;
  onFinished(message, (error) => { assert.equal(error, null); calls++; });
  message.emit('end');
  assert.equal(calls, 1);
  assertClean(message);
});

test('observes socket closure before message finish', () => {
  const message = outgoing();
  let received;
  onFinished(message, (...args) => { received = args; });
  message.socket.emit('close');
  assert.deepEqual(received, [null, message]);
  assertClean(message);
});

test('preserves socket error payloads', () => {
  for (const error of [new Error('socket failed'), 'socket failed', undefined]) {
    const message = outgoing();
    let received;
    onFinished(message, (...args) => { received = args; });
    message.socket.emit('error', error);
    assert.deepEqual(received, [error, message]);
    assertClean(message);
  }
});

test('attaches to a socket assigned after registration', () => {
  const message = outgoing(false);
  const socket = outgoing().socket;
  let calls = 0;
  onFinished(message, () => { calls++; });
  assert.equal(message.listenerCount('socket'), 1);
  message.socket = socket;
  message.emit('socket', socket);
  assert.equal(message.listenerCount('socket'), 0);
  socket.emit('close');
  assert.equal(calls, 1);
  assertClean(message);
});

test('finishing before socket assignment removes the socket listener', () => {
  const message = outgoing(false);
  const socket = outgoing().socket;
  let calls = 0;
  onFinished(message, () => { calls++; });
  message.emit('finish');
  message.socket = socket;
  message.emit('socket', socket);
  assert.equal(calls, 1);
  assertClean(message);
});

test('shares event subscriptions across callbacks and preserves registration order', () => {
  const message = outgoing();
  const calls = [];
  for (let i = 0; i < 20; i++) onFinished(message, () => calls.push(i));
  assert.equal(message.listenerCount('end'), 1);
  assert.equal(message.listenerCount('finish'), 1);
  assert.equal(message.socket.listenerCount('error'), 1);
  assert.equal(message.socket.listenerCount('close'), 1);
  message.emit('finish');
  assert.deepEqual(calls, Array.from({ length: 20 }, (_, i) => i));
  assertClean(message);
});

test('does not add or overwrite private message properties', () => {
  const message = outgoing();
  const marker = { ownedByOtherCode: true };
  message.__onFinished = marker;
  onFinished(message, () => {});
  message.emit('finish');
  assert.equal(message.__onFinished, marker);
});

test('preserves unrelated message and socket listeners', () => {
  const message = outgoing();
  const existing = () => {};
  message.on('finish', existing);
  message.socket.on('close', existing);
  onFinished(message, () => {});
  message.emit('finish');
  assert.deepEqual(message.listeners('finish'), [existing]);
  assert.deepEqual(message.socket.listeners('close'), [existing]);
});

test('already finished responses invoke callbacks asynchronously', async () => {
  const message = outgoing();
  message.finished = true;
  let returned = false;
  const completion = new Promise((resolve) => {
    assert.equal(onFinished(message, (error, original) => {
      assert.equal(returned, true);
      assert.equal(error, null);
      assert.equal(original, message);
      resolve();
    }), message);
  });
  returned = true;
  assertClean(message);
  await completion;
});

test('unknown shapes retain the deferred completion convention', async () => {
  const message = {};
  assert.equal(onFinished.isFinished(message), undefined);
  await new Promise((resolve) => onFinished(message, (error, original) => {
    assert.equal(error, null);
    assert.equal(original, message);
    resolve();
  }));
});

test('isFinished preserves response state checks', () => {
  assert.equal(onFinished.isFinished({ finished: false, socket: null }), false);
  assert.equal(onFinished.isFinished({ finished: true, socket: null }), true);
  assert.equal(onFinished.isFinished({ finished: false, socket: { writable: true } }), false);
  assert.equal(onFinished.isFinished({ finished: false, socket: { writable: false } }), true);
});

test('isFinished preserves request and upgrade state checks', () => {
  const socket = { readable: true };
  assert.equal(onFinished.isFinished({ complete: false, readable: true, socket }), false);
  assert.equal(onFinished.isFinished({ complete: true, readable: true, socket }), false);
  assert.equal(onFinished.isFinished({ complete: true, readable: false, socket }), true);
  assert.equal(onFinished.isFinished({ complete: false, upgrade: true, socket }), true);
  assert.equal(onFinished.isFinished({ complete: false, socket: null }), true);
  assert.equal(onFinished.isFinished({ complete: false, socket: { readable: false } }), true);
});

test('each queued callback retains its own registration-time async context', () => {
  const storage = new AsyncLocalStorage();
  const message = outgoing();
  const contexts = [];
  storage.run('first request context', () => onFinished(message, () => contexts.push(storage.getStore())));
  storage.run('second request context', () => onFinished(message, () => contexts.push(storage.getStore())));
  storage.run('socket context', () => {
    message.emit('finish');
    assert.equal(storage.getStore(), 'socket context');
  });
  assert.deepEqual(contexts, ['first request context', 'second request context']);
});

test('deferred completion preserves registration-time async context', async () => {
  const storage = new AsyncLocalStorage();
  const message = outgoing();
  message.finished = true;
  const observed = await new Promise((resolve) => {
    storage.run('already finished context', () => onFinished(message, () => resolve(storage.getStore())));
  });
  assert.equal(observed, 'already finished context');
});

test('callback exceptions propagate after cleanup and stop later queued callbacks', () => {
  const message = outgoing();
  const error = new Error('callback failed');
  let laterCalls = 0;
  onFinished(message, () => { throw error; });
  onFinished(message, () => { laterCalls++; });
  assert.throws(() => message.emit('finish'), (caught) => caught === error);
  assert.equal(laterCalls, 0);
  assertClean(message);
});

test('rejects an invalid callback before attaching subscriptions', () => {
  const message = outgoing();
  assert.throws(() => onFinished(message, null), TypeError);
  assertClean(message);
});

test('registration hooks cannot lose the first callback or leave late subscriptions', () => {
  const message = outgoing();
  let calls = 0;
  message.on('newListener', (event) => {
    if (event === 'finish') message.emit('end');
  });
  onFinished(message, () => { calls++; });
  assert.equal(calls, 1);
  assertClean(message);
});

test('finishing while the socket listener is being added leaves no subscription', () => {
  const message = outgoing(false);
  let calls = 0;
  message.on('newListener', (event) => {
    if (event === 'socket') message.emit('finish');
  });
  onFinished(message, () => { calls++; });
  assert.equal(calls, 1);
  assertClean(message);
});

test('socket assignment during a registration hook is observed', () => {
  const message = outgoing(false);
  const socket = outgoing().socket;
  let calls = 0;
  message.on('newListener', (event) => {
    if (event === 'socket') message.socket = socket;
  });
  onFinished(message, () => { calls++; });
  socket.emit('close');
  assert.equal(calls, 1);
  assertClean(message);
});

test('reentrant completion during listener removal only dispatches once', () => {
  const message = outgoing();
  let calls = 0;
  message.on('removeListener', (event) => {
    if (event === 'end') message.socket.emit('close');
  });
  onFinished(message, () => { calls++; });
  message.emit('finish');
  assert.equal(calls, 1);
  assertClean(message);
});

test('failed socket registration rolls back message listeners and allows a later retry', () => {
  const message = outgoing();
  const failure = new Error('failed to register');
  const socket = message.socket;
  socket.on = function (event, callback) {
    EventEmitter.prototype.on.call(this, event, callback);
    if (event === 'close') throw failure;
    return this;
  };
  assert.throws(() => onFinished(message, () => {}), (caught) => caught === failure);
  assertClean(message);
  delete socket.on;
  let calls = 0;
  onFinished(message, () => { calls++; });
  message.emit('finish');
  assert.equal(calls, 1);
  assertClean(message);
});

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    return await run(server.address().port);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

function request(port, options = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, agent: false, ...options }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('real HTTP response completion invokes the callback once', { timeout: 5000 }, async () => {
  const calls = [];
  await withServer((_req, res) => {
    onFinished(res, (error, message) => calls.push({ error, same: message === res }));
    res.end('complete');
  }, async (port) => {
    assert.equal(await request(port), 'complete');
  });
  assert.deepEqual(calls, [{ error: null, same: true }]);
});

test('real incoming HTTP request completion follows reading the body', { timeout: 5000 }, async () => {
  const calls = [];
  await withServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    onFinished(req, (error, message) => {
      calls.push({ error, same: message === req, body });
      res.end('received');
    });
  }, async (port) => {
    assert.equal(await request(port, { method: 'POST' }, 'request body'), 'received');
  });
  assert.deepEqual(calls, [{ error: null, same: true, body: 'request body' }]);
});

test('real client disconnect completes an unfinished server response', { timeout: 5000 }, async () => {
  let observed;
  let completed;
  const completion = new Promise((resolve) => { completed = resolve; });
  await withServer((_req, res) => {
    onFinished(res, (error) => {
      observed = { error, finished: res.finished };
      completed();
    });
    res.write('partial response');
  }, async (port) => {
    const req = http.get({ host: '127.0.0.1', port, agent: false }, (res) => {
      res.on('error', () => {});
      res.once('data', () => req.destroy());
    });
    req.on('error', () => {});
    await completion;
  });
  assert.deepEqual(observed, { error: null, finished: false });
});
