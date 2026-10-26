'use strict';

// Derived from ee-first 1.1.1, Copyright (c) 2014 Jonathan Ong.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

module.exports = first;

function first(sources, listener) {
  if (!Array.isArray(sources)) {
    throw new TypeError('sources must be an array of [emitter, ...events] tuples');
  }
  if (listener !== undefined && typeof listener !== 'function') {
    throw new TypeError('listener must be a function');
  }

  // Validate and snapshot every source before attaching any listeners.
  const events = [];
  for (const source of sources) {
    if (!Array.isArray(source) || source.length < 2) {
      throw new TypeError('each source must be [emitter, ...events]');
    }
    const [emitter, ...names] = source;
    if (!emitter || typeof emitter.on !== 'function' || typeof emitter.removeListener !== 'function') {
      throw new TypeError('each emitter must provide on() and removeListener()');
    }
    for (const event of names) {
      if (typeof event !== 'string' && typeof event !== 'symbol') {
        throw new TypeError('event names must be strings or symbols');
      }
      events.push({ emitter, event });
    }
  }

  let callback = listener;
  let settled = false;
  const subscriptions = [];

  function cleanup() {
    // Clear the list first: removeListener hooks can reenter this utility.
    for (const { emitter, event, handler } of subscriptions.splice(0)) {
      emitter.removeListener(event, handler);
    }
  }

  function handle(nextListener) {
    if (typeof nextListener !== 'function') {
      throw new TypeError('listener must be a function');
    }
    callback = nextListener;
  }

  handle.cancel = function cancel() {
    settled = true;
    cleanup();
  };

  for (const { emitter, event } of events) {
    function handler(...args) {
      // emit() can retain a snapshot containing a second, removed listener.
      if (settled) return;
      settled = true;
      cleanup();
      if (typeof callback !== 'function') {
        throw new TypeError('a listener must be set before an event is emitted');
      }
      callback.call(null, event === 'error' ? args[0] : null, emitter, event, args);
    }

    subscriptions.push({ emitter, event, handler });
    try {
      emitter.on(event, handler);
    } catch (error) {
      settled = true;
      cleanup();
      throw error;
    }

    // EventEmitter's newListener hook runs before the new listener is added.
    // A previous event may win or cancel the group during that hook.
    if (settled) {
      emitter.removeListener(event, handler);
      break;
    }
  }

  return handle;
}
