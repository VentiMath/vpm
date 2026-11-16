'use strict';
// The exported ordering is API data, obtained from the upstream public export.
const urlAlphabet = '57X6y3wQZNzYjJB2L_10pxbackgroundhimselfUTF-8DEMOGRAPHICSVqvt4KW9';
const maxSize = 1048576;
function sizeOf(size) {
  if (!Number.isSafeInteger(size) || size < 0 || size > maxSize) throw new RangeError('size must be an integer from 0 through 1048576');
  return size;
}
function alphabetOf(alphabet) {
  if (typeof alphabet !== 'string' || !alphabet.length || alphabet.length > 256 || /[\uD800-\uDFFF]/.test(alphabet)) throw new TypeError('alphabet must contain 1–256 non-surrogate UTF-16 characters');
  return alphabet;
}
function customRandom(alphabet, defaultSize, random) {
  alphabetOf(alphabet); sizeOf(defaultSize);
  if (typeof random !== 'function') throw new TypeError('random must be a function');
  const count = alphabet.length, ceiling = 256 - 256 % count;
  return function generate(size = defaultSize) {
    sizeOf(size);
    let id = '', stalled = 0;
    while (id.length < size) {
      const request = Math.min(65536, Math.ceil((size - id.length) * 256 / ceiling));
      const bytes = random(request);
      if (!ArrayBuffer.isView(bytes) || bytes.BYTES_PER_ELEMENT !== 1 || bytes.length !== request || Object.prototype.toString.call(bytes) !== '[object Uint8Array]') throw new TypeError('random must return the requested Uint8Array');
      const before = id.length;
      for (let i = 0; i < bytes.length && id.length < size; i++) {
        const value = bytes[i];
        if (value < ceiling) id += alphabet[value % count];
      }
      // A broken custom source must not lock the caller in an infinite loop.
      if (id.length === before) { if (++stalled === 1024) throw new Error('random source produced no usable bytes'); } else stalled = 0;
    }
    return id;
  };
}
function createSecure(fill, encode = bytes => String.fromCharCode(...bytes), encodeURL, encodeHex) {
  function customAlphabet(alphabet, defaultSize = 21) {
    alphabetOf(alphabet); sizeOf(defaultSize);
    const count = alphabet.length, ceiling = 256 - 256 % count;
    const nativeEncoding = alphabet === urlAlphabet ? encodeURL : alphabet === '0123456789abcdef' ? encodeHex : undefined;
    const ascii = [...alphabet].every(c => c.charCodeAt(0) < 256);
    const lookup = Uint16Array.from({length:256}, (_,i) => alphabet.charCodeAt(i % count));
    let reservoir = '', cursor = 0, bytes;
    function refill() {
      bytes ||= new Uint8Array(nativeEncoding ? (alphabet === urlAlphabet ? 3072 : 2048) : 4096);
      fill(bytes);
      if (nativeEncoding) { reservoir = nativeEncoding(bytes); cursor = 0; return; }
      let used = 0;
      if (ascii) {
        for (let i = 0; i < bytes.length; i++) if (bytes[i] < ceiling) bytes[used++] = lookup[bytes[i]];
        reservoir = encode(bytes.subarray(0,used));
      } else {
        const codes = new Uint16Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) if (bytes[i] < ceiling) codes[used++] = lookup[bytes[i]];
        reservoir = String.fromCharCode(...codes.subarray(0,used));
      }
      cursor = 0;
    }
    return function generate(size = defaultSize) {
      sizeOf(size);
      if (cursor + size <= reservoir.length) { const id = reservoir.slice(cursor, cursor + size); cursor += size; return id; }
      let id = '';
      while (id.length < size) {
        if (cursor === reservoir.length) refill();
        const end = Math.min(reservoir.length, cursor + size - id.length);
        id += reservoir.slice(cursor,end); cursor = end;
      }
      return id;
    };
  }
  const nanoid = customAlphabet(urlAlphabet);
  // Public random() owns its bytes. A later refill never mutates a returned view.
  function random(size) { sizeOf(size); return fill(new Uint8Array(size)); }
  return {nanoid, customAlphabet, customRandom, random, urlAlphabet};
}
module.exports = {createSecure, customRandom, urlAlphabet, sizeOf, alphabetOf};
