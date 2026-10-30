'use strict';
const {Readable} = require('node:stream'), {randomUUID} = require('node:crypto'), {validateHeaderValue} = require('node:http');
function multipart(parts) {
  if (!Array.isArray(parts) || !parts.length) throw new TypeError('multipart must contain at least one part');
  const boundary = randomUUID(), inputs = parts.map(part => {
    if (!part || typeof part !== 'object') throw new TypeError('Invalid multipart part');
    const type = part['Content-Type'] ?? 'application/octet-stream';
    try {validateHeaderValue('Content-Type', type);} catch {throw new TypeError('Invalid multipart Content-Type');}
    let body = part.body;
    if (ArrayBuffer.isView(body)) body = Buffer.from(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
    else if (typeof body !== 'string' && !(body instanceof Readable)) throw new TypeError('Multipart bodies must be strings, bytes or readable streams');
    return {type: String(type), body};
  });
  const streams = inputs.map(part => part.body).filter(body => body instanceof Readable);
  const output = Readable.from((async function* () {
    for (const {type, body} of inputs) {
      yield Buffer.from('--' + boundary + '\r\nContent-Type: ' + type + '\r\n\r\n');
      if (body instanceof Readable) {for await (const chunk of body) yield typeof chunk === 'string' ? Buffer.from(chunk) : chunk;}
      else yield typeof body === 'string' ? Buffer.from(body) : body;
      yield Buffer.from('\r\n');
    }
    yield Buffer.from('--' + boundary + '--');
  })(), {objectMode: false});
  const failed = error => output.destroy(error);
  // Readable.from waits for iterator.return() during destruction. Cancel the
  // current input first so a pending stream read cannot hold that return open.
  const destroy = output._destroy;
  output._destroy = function(error, done) {
    for (const stream of streams) if (!stream.destroyed) stream.destroy();
    destroy.call(this, error, done);
  };
  output.on('error', () => {});
  for (const stream of streams) stream.on('error', failed);
  output.once('close', () => {
    for (const stream of streams) {if (!stream.destroyed) stream.destroy(); process.nextTick(() => stream.removeListener('error', failed));}
  });
  return {body: output, type: 'multipart/related; boundary=' + boundary};
}
module.exports = multipart;
