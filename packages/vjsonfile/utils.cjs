'use strict';

function stripBom(content) {
  const text = Buffer.isBuffer(content) ? content.toString('utf8')
    : ArrayBuffer.isView(content) && content.BYTES_PER_ELEMENT === 1
      ? Buffer.from(content.buffer, content.byteOffset, content.byteLength).toString('utf8') : content;
  if (typeof text !== 'string') throw new TypeError('JSON content must be a string or byte array');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function stringify(value, options = {}) {
  const {spaces, replacer = null, EOL = '\n', finalEOL = true} = options;
  const json = JSON.stringify(value, replacer, spaces);
  if (json === undefined) throw new TypeError(`Converting ${typeof value} value to JSON is not supported`);
  // An EOL is literal output, never a replacement-string program ($&, $`, $').
  const ending = String(EOL);
  const body = ending === '\n' ? json
    : json.replace(/\n/g, ending.includes('$') ? () => ending : ending);
  return finalEOL ? body + ending : body;
}

module.exports = {stringify, stripBom};
