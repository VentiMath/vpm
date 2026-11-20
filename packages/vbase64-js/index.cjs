'use strict';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const digits = new Uint8Array(128);
for (let i = 0; i < alphabet.length; i++) digits[alphabet.charCodeAt(i)] = i;
digits[45] = 62;
digits[95] = 63;

// The reference decoder treats an unrecognised digit as zero. Browser Buffer
// sanitizes its input before decoding, but direct consumers also see this rule.
function decodedSize(text, end) {
  if (text.length % 4) throw new Error('Invalid string. Length must be a multiple of 4');
  if (end === -1) return text.length / 4 * 3;
  return Math.floor((end * 3 - (end % 4 === 0 ? 1 : 0)) / 4);
}

function byteLength(text) {
  return decodedSize(text, text.indexOf('='));
}

function toByteArray(text) {
  const end = text.indexOf('=');
  const output = new Uint8Array(decodedSize(text, end));
  // A whole quartet of padding leaves the final partial output zero-filled.
  const limit = end >= 0 && end % 4 === 0 ? output.length - 2 : output.length;
  for (let i = 0, out = 0; out < limit; i += 4) {
    const bits = (digits[text.charCodeAt(i)] << 18) | (digits[text.charCodeAt(i + 1)] << 12) |
      (digits[text.charCodeAt(i + 2)] << 6) | digits[text.charCodeAt(i + 3)];
    output[out++] = bits >>> 16;
    if (out < limit) output[out++] = bits >>> 8;
    if (out < limit) output[out++] = bits;
  }
  return output;
}

// Encode twelve bits per lookup. Flush bounded chunks so a large binary plist
// does not require a temporary array with one entry per character.
const pairs = Array.from({ length: 4096 }, (_, n) => alphabet[n >>> 6] + alphabet[n & 63]);
function fromByteArray(bytes) {
  const length = bytes.length;
  const end = length - length % 3;
  const chunks = [];
  let part = '';
  let i = 0;
  for (; i < end; i += 3) {
    const bits = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    part += pairs[bits >>> 12] + pairs[bits & 4095];
    if (part.length === 8192) {
      chunks.push(part);
      part = '';
    }
  }
  if (i < length) {
    const bits = (bytes[i] << 16) | (bytes[i + 1] << 8);
    part += pairs[bits >>> 12] + (i + 1 < length ? alphabet[(bits >>> 6) & 63] + '=' : '==');
  }
  if (!chunks.length) return part;
  chunks.push(part);
  return chunks.join('');
}
module.exports = { byteLength, toByteArray, fromByteArray };
