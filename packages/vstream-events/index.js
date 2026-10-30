'use strict';

function restore(stream, key, original, wrapper, rollback, descriptor) {
  const current = Object.getOwnPropertyDescriptor(stream, key);
  if (current?.value !== wrapper) return;
  if (rollback && !descriptor) {
    if (current.configurable) delete stream[key];
  } else if (current.writable) {
    stream[key] = original;
  }
  // A stream frozen after decoration keeps an inert once-only wrapper.
}

function hook(stream, key, event, original, emit) {
  let called = false;
  function wrapped() {
    if (called) return Reflect.apply(original, this, arguments);
    called = true;
    restore(stream, key, original, wrapped);
    const result = Reflect.apply(original, this, arguments);
    switch (arguments.length) {
      case 0: emit.call(stream, event); break;
      case 1: emit.call(stream, event, arguments[0]); break;
      case 3: emit.call(stream, event, arguments[0], arguments[1], arguments[2]); break;
      default: Reflect.apply(emit, stream, [event, ...arguments]);
    }
    return result;
  }
  return wrapped;
}

function originalMethod(stream, key, descriptor) {
  const own = descriptor;
  if (!descriptor) {
    let prototype = Object.getPrototypeOf(stream);
    while (prototype && !(descriptor = Object.getOwnPropertyDescriptor(prototype, key))) prototype = Object.getPrototypeOf(prototype);
  }
  if (!descriptor) return;
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${key} must be a data method`);
  const original = descriptor.value;
  if (original === undefined) return;
  if (typeof original !== 'function') throw new TypeError(`${key} must be a function`);
  if (!descriptor.writable || !own && !Object.isExtensible(stream)) throw new TypeError(`${key} must be replaceable`);
  return original;
}

function streamEvents(stream) {
  if (stream === undefined) stream = this;
  if (stream === null || typeof stream !== 'object' && typeof stream !== 'function') throw new TypeError('A stream object is required');
  const emit = stream.emit;
  if (typeof emit !== 'function') throw new TypeError('Stream must have an emit method');
  const readDescriptor = Object.getOwnPropertyDescriptor(stream, '_read');
  const read = originalMethod(stream, '_read', readDescriptor);
  const writeDescriptor = Object.getOwnPropertyDescriptor(stream, '_write');
  const write = originalMethod(stream, '_write', writeDescriptor);
  if (!read && !write) throw new TypeError('Stream must have _read or _write');
  const readHook = read && hook(stream, '_read', 'reading', read, emit);
  const writeHook = write && hook(stream, '_write', 'writing', write, emit);
  if (read) stream._read = readHook;
  try { if (write) stream._write = writeHook; }
  catch (error) {
    if (read) restore(stream, '_read', read, readHook, true, readDescriptor);
    throw error;
  }
  return stream;
}

module.exports = streamEvents;
