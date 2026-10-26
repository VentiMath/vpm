'use strict';

// Derived from on-finished 2.4.1, Copyright (c) 2013 Jonathan Ong and
// Copyright (c) 2014 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

const { AsyncResource } = require('node:async_hooks');
const first = require('vee-first');
const pending = new WeakMap();

module.exports = onFinished;
module.exports.isFinished = isFinished;

function onFinished(message, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('listener must be a function');
  }

  if (isFinished(message) !== false) {
    setImmediate(listener, null, message);
    return message;
  }

  const callback = { listener, resource: new AsyncResource('von-finished') };
  const existing = pending.get(message);
  if (existing) {
    existing.callbacks.push(callback);
    return message;
  }

  const state = { callbacks: [callback] };
  pending.set(message, state);
  attach(message, state);
  return message;
}

function isFinished(message) {
  const socket = message.socket;
  if (typeof message.finished === 'boolean') {
    return Boolean(message.finished || (socket && !socket.writable));
  }
  if (typeof message.complete === 'boolean') {
    return Boolean(message.upgrade || !socket || !socket.readable || (message.complete && !message.readable));
  }
  return undefined;
}

function attach(message, state) {
  const handles = [];
  let settled = false;
  let watchingSocket = false;

  function cleanup() {
    if (pending.get(message) === state) pending.delete(message);
    for (const handle of handles.splice(0)) handle.cancel();
    message.removeListener('socket', onSocket);
  }

  function dispose(callbacks) {
    for (const { resource } of callbacks) resource.emitDestroy();
  }

  function abort() {
    if (settled) return;
    settled = true;
    try {
      cleanup();
    } finally {
      dispose(state.callbacks.splice(0));
    }
  }

  function finish(error) {
    if (settled) return;
    settled = true;
    const callbacks = state.callbacks.splice(0);
    try {
      cleanup();
      for (const { listener, resource } of callbacks) {
        resource.runInAsyncScope(listener, null, error, message);
      }
    } finally {
      dispose(callbacks);
    }
  }

  function watch(source) {
    const handle = first([source], finish);
    // A newListener hook can finish the message before first() returns.
    if (settled) handle.cancel();
    else handles.push(handle);
  }

  function onSocket(socket) {
    if (settled || watchingSocket) return;
    watchingSocket = true;
    message.removeListener('socket', onSocket);
    try {
      watch([socket, 'error', 'close']);
    } catch (error) {
      abort();
      throw error;
    }
  }

  try {
    watch([message, 'end', 'finish']);
    if (settled) return;

    if (message.socket) {
      onSocket(message.socket);
    } else {
      message.on('socket', onSocket);
      // Registration hooks may finish the message or assign its socket.
      if (settled) message.removeListener('socket', onSocket);
      else if (message.socket) onSocket(message.socket);
    }
  } catch (error) {
    abort();
    throw error;
  }
}
