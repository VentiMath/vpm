'use strict';
const { Buffer, constants } = require('node:buffer');
const { Readable, Writable } = require('node:stream');
const core = require('./core');

function premature() {
  const error = new Error('JWS input closed before completion');
  error.code = 'ERR_STREAM_PREMATURE_CLOSE';
  return error;
}
class Collector extends Writable {
  constructor(value, supplied, limit) {
    // Object mode lets invalid piped chunks become ordinary stream errors,
    // rather than throwing from another stream's data-event callback.
    super({ objectMode: true });
    this.ready = supplied;
    this.buffer = value;
    this.chunks = [];
    this.length = 0;
    this.limit = limit;
  }
  _write(value, encoding, callback) {
    try {
      if (this.ready) throw new Error('JWS input is already complete');
      const chunk = typeof value === 'string' ? Buffer.from(value, encoding) : core.bytes(value);
      if (chunk === null) throw new TypeError('JWS stream chunks must be strings or bytes');
      if (chunk.length > this.limit - this.length) {
        const error = new RangeError('JWS input exceeds maxBuffer');
        error.code = 'ERR_JWS_INPUT_TOO_LARGE';
        throw error;
      }
      // Copy on write so later caller mutation cannot change collected input.
      if (chunk.length) this.chunks.push(Buffer.from(chunk));
      this.length += chunk.length;
      callback();
    } catch (error) { callback(error); }
  }
  _final(callback) {
    if (!this.ready) {
      this.buffer = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks, this.length);
      this.chunks = [];
      this.ready = true;
    }
    callback();
  }
  _destroy(error, callback) { this.chunks = []; callback(error); }
}
class Operation extends Readable {
  constructor(signing, options = {}) {
    super({ objectMode: true, read() {} });
    const limit = options.maxBuffer ?? constants.MAX_LENGTH;
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > constants.MAX_LENGTH) throw new RangeError('maxBuffer must be a valid nonnegative byte limit');
    this.limit = limit;
    this.finished = false;
    this.signing = signing;
    this.encoding = options.encoding;
    this.preparedHeader = signing ? core.prepareHeader(options.header) : null;
    this.algorithm = signing ? this.preparedHeader.algorithm : options.algorithm;
    const key = core.selectKey(options, signing);
    if (/^HS(?:256|384|512)$/.test(this.algorithm) && key == null &&
      ['secret', 'key', signing ? 'privateKey' : 'publicKey'].some(name => Object.hasOwn(options, name))) {
      throw new TypeError('secret must be a string or buffer or a KeyObject');
    }
    this.sources = [];
    this.inputs = [];
    this.keyInput = this.collect(key, key != null || this.algorithm === 'none', limit);
    const name = signing ? 'payload' : 'signature';
    const value = options[name];
    this.valueInput = this.collect(value, value !== undefined, limit);
    for (const { source, collector, onError, onEnd, onClose, onData, onDrain } of this.sources) {
      source.on('error', onError);
      source.on('end', onEnd);
      source.on('close', onClose);
      if (onData) { source.on('data', onData); collector.on('drain', onDrain); }
    }
    process.nextTick(() => {
      if (this.finished) return;
      for (const { source, collector, onData } of this.sources) {
        if (this.finished) break;
        try {
          if (source.readableEnded) collector.end();
          // destroy(error) can precede its queued error event. Keep the input
          // listeners attached until that event, with a fallback for sources
          // configured not to emit close (or error).
          else if (source.destroyed) setImmediate(() => {
            if (!this.finished) this.destroy(source.errored || premature());
          });
          else if (!onData) source.pipe(collector);
        } catch (error) { this.destroy(error); }
      }
      this.complete();
    });
  }
  get key() { return this.expose(this.keyInput); }
  get secret() { return this.key; }
  expose(state) {
    if (state instanceof Collector) return state;
    if (!state.input) {
      state.input = this.collect(state.buffer, true, this.limit, true);
      if (this.finished) state.input.destroy();
    }
    return state.input;
  }
  collect(value, supplied, limit, force = false) {
    const streamed = value != null && typeof value.pipe === 'function';
    // Direct values need no Writable allocation. Materialize the public input
    // lazily if the caller inspects it; streamed/manual inputs remain native.
    if (supplied && !streamed && !force) return { ready: true, buffer: value };
    if (streamed && (typeof value.on !== 'function' || typeof value.removeListener !== 'function')) {
      throw new TypeError('JWS input stream must support events');
    }
    const collector = new Collector(streamed ? undefined : value, supplied && !streamed, limit);
    this.inputs.push(collector);
    collector.on('finish', () => this.complete());
    collector.on('error', error => this.destroy(error));
    collector.on('close', () => { if (!this.finished && !collector.ready) this.destroy(premature()); });
    if (streamed) {
      let ended = false;
      const legacy = typeof value.unpipe !== 'function';
      this.sources.push({ source: value, collector,
        // Legacy jws outputs use Stream, not Readable, and can emit before our
        // nextTick. Subscribe immediately and own every detachable listener.
        onData: legacy ? chunk => { if (!collector.write(chunk) && typeof value.pause === 'function') value.pause(); } : null,
        onDrain: legacy ? () => { if (typeof value.resume === 'function') value.resume(); } : null,
        onError: error => this.destroy(error), onEnd: () => { ended = true; if (legacy) collector.end(); },
        onClose: () => { if (!ended && !this.finished) this.destroy(premature()); } });
    }
    return collector;
  }
  cleanup() {
    for (const { source, collector, onError, onEnd, onClose, onData, onDrain } of this.sources) {
      if (onData) { source.removeListener('data', onData); collector.removeListener('drain', onDrain); }
      else source.unpipe(collector);
      if (source.destroyed) {
        // Cancellation must not turn an already-queued input error into an
        // unhandled exception. Retain a sink for this event-loop turn only.
        const pendingError = () => {};
        source.on('error', pendingError);
        setImmediate(() => source.removeListener('error', pendingError));
      }
      source.removeListener('error', onError);
      source.removeListener('end', onEnd);
      source.removeListener('close', onClose);
    }
    this.sources = [];
    for (const input of this.inputs) input.destroy();
  }
  complete() {
    if (this.finished) return this.result;
    for (const input of this.inputs) if (input.errored) { this.destroy(input.errored); return undefined; }
    if (!this.keyInput.ready || !this.valueInput.ready) return undefined;
    let result, decoded;
    try {
      if (this.signing) result = core.signPrepared(this.preparedHeader, this.valueInput.buffer, this.keyInput.buffer, this.encoding);
      else {
        const algorithm = this.algorithm;
        const method = core.algorithmMethod(algorithm);
        const parsed = core.parse(this.valueInput.buffer);
        result = core.verifyParsed(parsed, algorithm, method, this.keyInput.buffer);
        decoded = core.decodeParsed(parsed, { encoding: this.encoding });
      }
    } catch (error) { this.destroy(error); return undefined; }
    this.result = result;
    this.finished = true;
    this.cleanup();
    // Consumer listener exceptions propagate normally, outside crypto handling.
    if (this.signing) this.emit('done', result);
    else this.emit('done', result, decoded);
    if (!this.destroyed) { this.push(result); this.push(null); }
    return result;
  }
  _destroy(error, callback) {
    this.finished = true;
    this.cleanup();
    callback(error);
  }
}
class SignStream extends Operation {
  constructor(options) { super(true, options); }
  get privateKey() { return this.key; }
  get payload() { return this.expose(this.valueInput); }
  sign() { return this.complete(); }
}
class VerifyStream extends Operation {
  constructor(options) { super(false, options); }
  get publicKey() { return this.key; }
  get signature() { return this.expose(this.valueInput); }
  verify() { return this.complete(); }
}
exports.createSign = options => new SignStream(options);
exports.createVerify = options => new VerifyStream(options);
