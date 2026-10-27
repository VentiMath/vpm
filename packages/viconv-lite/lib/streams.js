'use strict';
const { Buffer } = require('node:buffer');
const { finished } = require('node:stream');

function transformOptions(options) {
  const copy = { ...options };
  // This option selects the codec's endianness, not Node's input-string codec.
  delete copy.defaultEncoding;
  return copy;
}

function collect(stream, callback, binary) {
  if (typeof callback !== 'function') throw new TypeError('collect requires a callback');
  const chunks = [];
  const onData = chunk => chunks.push(chunk);
  const cleanup = finished(stream, { readable: true, writable: false }, error => {
    cleanup();
    stream.removeListener('data', onData);
    if (error) { chunks.length = 0; callback(error); return; }
    let output;
    try { output = binary ? Buffer.concat(chunks) : chunks.join(''); }
    catch (failure) { callback(failure); return; }
    callback(null, output);
  });
  stream.on('data', onData);
  return stream;
}

module.exports = function (streamModule) {
  class IconvLiteEncoderStream extends streamModule.Transform {
    constructor(conv, options) {
      super({ ...transformOptions(options), decodeStrings: false, encoding: undefined });
      this.conv = conv;
    }
    _transform(chunk, encoding, done) {
      if (typeof chunk !== 'string') return done(new TypeError('Iconv encoding stream needs strings as its input.'));
      try { const output = this.conv.write(chunk); if (output?.length) this.push(output); }
      catch (error) { done(error); return; }
      done();
    }
    _flush(done) {
      try { const output = this.conv.end(); if (output?.length) this.push(output); }
      catch (error) { done(error); return; }
      done();
    }
    collect(callback) { return collect(this, callback, true); }
  }
  class IconvLiteDecoderStream extends streamModule.Transform {
    constructor(conv, options) {
      super({ ...transformOptions(options), encoding: 'utf8' });
      this.conv = conv;
      this.encoding = 'utf8';
    }
    _transform(chunk, encoding, done) {
      if (!(chunk instanceof Uint8Array)) return done(new TypeError('Iconv decoding stream needs buffers as its input.'));
      try { const output = this.conv.write(chunk); if (output?.length) this.push(output, 'utf8'); }
      catch (error) { done(error); return; }
      done();
    }
    _flush(done) {
      try { const output = this.conv.end(); if (output?.length) this.push(output, 'utf8'); }
      catch (error) { done(error); return; }
      done();
    }
    collect(callback) { return collect(this, callback, false); }
  }
  return { IconvLiteEncoderStream, IconvLiteDecoderStream };
};
