/*!
 * Derived from raw-body, MIT licensed.
 * Copyright(c) 2013-2014 Jonathan Ong
 * Copyright(c) 2014-2022 Douglas Christopher Wilson
 * VPM modifications Copyright (c) 2026 VentiMath
 */
'use strict';

const { AsyncResource } = require('node:async_hooks');
const { isUint8Array } = require('node:util').types;
const bytes = require('vbytes');
const createError = require('vhttp-errors');
const iconv = require('viconv-lite');
const emptyOptions = Object.freeze({});

module.exports = getRawBody;

function getRawBody(stream, options, callback) {
  if (stream === undefined) throw new TypeError('argument stream is required');
  if (stream === null || typeof stream !== 'object' || typeof stream.on !== 'function' ||
      typeof stream.removeListener !== 'function' || typeof stream.pause !== 'function' || typeof stream.unpipe !== 'function') {
    throw new TypeError('argument stream must be a Node.js readable stream');
  }
  if (typeof options === 'function') { callback = options; options = undefined; }
  if (callback !== undefined && typeof callback !== 'function') throw new TypeError('argument callback must be a function');
  if (options === true || typeof options === 'string') options = { encoding: options };
  if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('options must be an object, encoding, or callback');
  const opts = options ?? emptyOptions;
  const requestedEncoding = opts.encoding;
  const encoding = requestedEncoding === true ? 'utf-8' : requestedEncoding;
  if (encoding != null && encoding !== false && (typeof encoding !== 'string' || encoding.length === 0)) {
    throw new TypeError('encoding must be a nonempty string, boolean, or null');
  }
  const requestedLimit = opts.limit;
  const limit = count(typeof requestedLimit === 'string' ? bytes.parse(requestedLimit) : requestedLimit, 'limit');
  const requestedLength = opts.length;
  if (typeof requestedLength === 'string' && !/^[0-9]+$/.test(requestedLength)) {
    throw new TypeError('length must contain only decimal digits');
  }
  const length = count(typeof requestedLength === 'string' ? Number(requestedLength) : requestedLength, 'length');

  if (callback) {
    const resource = new AsyncResource('vraw-body', { requireManualDestroy: true });
    readStream(stream, encoding, length, limit, (error, body) => {
      try { resource.runInAsyncScope(callback, null, error, body); }
      finally { resource.emitDestroy(); }
    });
    return;
  }
  return new Promise((resolve, reject) => {
    readStream(stream, encoding, length, limit, (error, body) => error ? reject(error) : resolve(body));
  });
}

function count(value, name) {
  if (value == null) return null;
  if (typeof value !== 'number') throw new TypeError(name + ' must be a byte count');
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(name + ' must be a nonnegative safe integer');
  return value;
}

function readStream(stream, encoding, length, limit, callback) {
  let complete = false;
  let synchronous = true;
  let received = 0;
  let decoder;
  let chunks;
  let text = '';

  if (limit !== null && length !== null && length > limit) {
    return finish(createError(413, 'request entity too large', { expected: length, length, limit, type: 'entity.too.large' }));
  }
  // A declared length is already known to fit the limit, so it is the tighter
  // bound when present. Infinity represents a deliberately unbounded read.
  const maximum = length === null ? (limit === null ? Infinity : limit) : length;
  const state = stream._readableState;
  if (stream.readableEncoding || (state && (state.encoding || state.decoder))) {
    return finish(createError(500, 'stream encoding should not be set', { type: 'stream.encoding.set' }));
  }
  if (stream.aborted) return onAborted();
  if (stream.readable === false || stream.destroyed || stream.readableEnded || stream.closed) {
    return finish(createError(500, 'stream is not readable', { type: 'stream.not.readable' }));
  }
  try {
    decoder = encoding ? iconv.getDecoder(encoding) : null;
  } catch (error) {
    return finish(/^Encoding not recognized: /.test(error.message)
      ? createError(415, 'specified encoding unsupported', { encoding, type: 'encoding.unsupported' }) : error);
  }
  if (!decoder) chunks = [];

  // Register data last: a stream may begin flowing as soon as it is observed.
  // Check completion between registrations for reentrant EventEmitter hooks.
  try {
    if (!observe('aborted', onAborted) || !observe('close', onAborted) ||
        !observe('error', onError) || !observe('end', onEnd) || !observe('data', onData)) return;
  } catch (error) {
    return finish(error);
  }
  synchronous = false;

  function observe(event, listener) {
    stream.on(event, listener);
    if (complete) { cleanup(); return false; }
    return true;
  }

  function finish(error, body) {
    if (complete) return;
    complete = true;
    cleanup();
    if (error) {
      // Keep HTTP sockets usable for an error response. The caller owns draining
      // or destroying the source; modern streams provide unpipe themselves.
      stream.unpipe();
      stream.pause();
    }
    if (synchronous) process.nextTick(callback, error, body);
    else callback(error, body);
  }

  function onAborted() {
    if (complete) return;
    finish(createError(400, 'request aborted', {
      code: 'ECONNABORTED', expected: length, length, received, type: 'request.aborted',
    }));
  }

  function onError(error) { finish(error); }

  function mismatch() {
    return createError(400, 'request size did not match content length', {
      expected: length, length, received, type: 'request.size.invalid',
    });
  }

  function onData(chunk) {
    if (complete) return;
    // This native check includes Buffer and cross-realm Uint8Array, without a
    // second brand check or accepting objects that merely inherit Buffer.prototype.
    if (!isUint8Array(chunk)) {
      return finish(createError(500, 'stream must emit byte buffers', {
        type: typeof chunk === 'string' ? 'stream.encoding.set' : 'stream.chunk.invalid',
      }));
    }
    received += chunk.byteLength;
    if (received > maximum) {
      // Preserve limit-error precedence if this chunk crosses both bounds.
      return finish(limit !== null && received > limit
        ? createError(413, 'request entity too large', { limit, received, type: 'entity.too.large' })
        : mismatch());
    }
    try {
      if (decoder) text += decoder.write(chunk);
      else chunks.push(chunk);
    } catch (error) { return finish(error); }
  }

  function onEnd() {
    if (complete) return;
    if (length !== null && received !== length) return finish(mismatch());
    let body;
    try {
      // Retain the independent Buffer result, even for a one-chunk body. The
      // already tracked byte count avoids Buffer.concat's extra counting pass.
      body = decoder ? text + (decoder.end() || '') : Buffer.concat(chunks, received);
    } catch (error) { return finish(error); }
    finish(null, body);
  }

  function cleanup() {
    chunks = decoder = null;
    text = '';
    stream.removeListener('aborted', onAborted);
    stream.removeListener('close', onAborted);
    stream.removeListener('error', onError);
    stream.removeListener('end', onEnd);
    stream.removeListener('data', onData);
  }
}
