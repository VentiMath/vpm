'use strict';
const { Buffer, constants } = require('node:buffer');
const { Readable, Writable } = require('node:stream');
const core = require('./core');

function premature() {
  const error = new Error('JWS input closed before completion');
  error.code = 'ERR_STREAM_PREMATURE_CLOSE';
  return error;
}
class Input {
  constructor(value, ready, limit) {
    this.buffer = value;
    this.ready = ready;
    this.limit = limit;
    this.length = 0;
    this.chunks = null;
    this.error = null;
    this.stream = null;
  }
  write(value, encoding) {
    if (this.ready) throw new Error('JWS input is already complete');
    const text = typeof value === 'string';
    const chunk = text ? Buffer.from(value, encoding) : core.bytes(value);
    if (chunk === null) throw new TypeError('JWS stream chunks must be strings or bytes');
    if (chunk.length > this.limit - this.length) {
      const error = new RangeError('JWS input exceeds maxBuffer');
      error.code = 'ERR_JWS_INPUT_TOO_LARGE';
      throw error;
    }
    // Strings already produced an owned Buffer. Copy caller-owned bytes before
    // returning from the data/write handler so mutation cannot alter the input.
    if (chunk.length) (this.chunks ||= []).push(text ? chunk : Buffer.from(chunk));
    this.length += chunk.length;
  }
  end() {
    if (this.ready) return;
    const chunks = this.chunks;
    this.buffer = chunks?.length === 1 ? chunks[0] : Buffer.concat(chunks || [], this.length);
    this.chunks = null;
    this.ready = true;
  }
}
class Collector extends Writable {
  constructor(owner, input) {
    super({ objectMode: true });
    this.input = input;
    this.on('finish', () => owner.complete());
    this.on('error', error => owner.destroy(error));
    this.on('close', () => { if (!owner.finished && !input.ready) owner.destroy(premature()); });
  }
  get buffer() { return this.input.buffer; }
  _write(value, encoding, callback) {
    try { this.input.write(value, encoding); callback(); }
    catch (error) { this.input.error = error; callback(error); }
  }
  _final(callback) {
    try { this.input.end(); callback(); }
    catch (error) { this.input.error = error; callback(error); }
  }
  _destroy(error, callback) {
    this.input.chunks = null;
    if (error) this.input.error = error;
    callback(error);
  }
}
class Operation extends Readable {
  constructor(signing, options = {}) {
    super({ objectMode: true });
    const limit = options.maxBuffer ?? constants.MAX_LENGTH;
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > constants.MAX_LENGTH) throw new RangeError('maxBuffer must be a valid nonnegative byte limit');
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
    const value = options[signing ? 'payload' : 'signature'];
    this.valueInput = this.collect(value, value !== undefined, limit);
    for (const { source, onError, onEnd, onClose } of this.sources) {
      source.on('error', onError);
      source.on('end', onEnd);
      source.on('close', onClose);
    }
    // Own data listeners avoid a redundant Writable/pipe layer for source
    // streams. Manual/public inputs are still native Writables, created lazily.
    // Subscribe immediately for legacy jws outputs that emit on nextTick.
    for (const { source, onData } of this.sources) source.on('data', onData);
    process.nextTick(() => {
      if (this.finished) return;
      for (const { source, input } of this.sources) {
        if (this.finished) break;
        try {
          if (source.readableEnded) input.end();
          else if (source.destroyed) setImmediate(() => {
            if (!this.finished) this.destroy(source.errored || premature());
          });
          else if (typeof source.resume === 'function') source.resume();
        } catch (error) { this.destroy(error); }
      }
      this.complete();
    });
  }
  _read() {}
  get key() { return this.expose(this.keyInput); }
  get secret() { return this.key; }
  expose(input) {
    if (!input.stream) {
      input.stream = new Collector(this, input);
      if (this.finished) input.stream.destroy();
    }
    return input.stream;
  }
  collect(value, supplied, limit) {
    const streamed = value != null && typeof value.pipe === 'function';
    if (streamed && (typeof value.on !== 'function' || typeof value.removeListener !== 'function')) throw new TypeError('JWS input stream must support events');
    const input = new Input(streamed ? undefined : value, supplied && !streamed, limit);
    this.inputs.push(input);
    if (streamed) {
      let ended = false;
      this.sources.push({ source: value, input,
        onData: chunk => {
          try { input.write(chunk); }
          catch (error) { input.error = error; this.destroy(error); }
        },
        onError: error => this.destroy(error),
        onEnd: () => {
          ended = true;
          try { input.end(); }
          catch (error) { this.destroy(error); return; }
          this.complete();
        },
        onClose: () => { if (!ended && !this.finished) this.destroy(premature()); } });
    }
    return input;
  }
  cleanup() {
    for (const { source, onError, onEnd, onClose, onData } of this.sources) {
      source.removeListener('data', onData);
      if (source.destroyed) {
        // Cancellation must not expose an input error already queued for this
        // event-loop turn, even when native .closed became true before emission.
        const pendingError = () => {};
        source.on('error', pendingError);
        setImmediate(() => source.removeListener('error', pendingError));
      }
      source.removeListener('error', onError);
      source.removeListener('end', onEnd);
      source.removeListener('close', onClose);
      if (typeof source.pause === 'function' && typeof source.listenerCount === 'function' && source.listenerCount('data') === 0) source.pause();
    }
    this.sources = [];
    for (const input of this.inputs) { input.chunks = null; input.stream?.destroy(); }
  }
  complete() {
    if (this.finished) return this.result;
    for (const input of this.inputs) if (input.error || input.stream?.errored) { this.destroy(input.error || input.stream.errored); return undefined; }
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
