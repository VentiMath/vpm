'use strict';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const digits = new Int16Array(128).fill(-1);
for (let i = 0; i < alphabet.length; i++) digits[alphabet.charCodeAt(i)] = i;

function encode(value) {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 0x7fffffff) throw new RangeError('VLQ delta out of range');
  let unsigned = Math.abs(value) * 2 + Number(value < 0);
  let text = '';
  do {
    const low = unsigned % 32;
    unsigned = Math.floor(unsigned / 32);
    text += alphabet[low + (unsigned ? 32 : 0)];
  } while (unsigned);
  return text;
}

function decode(segment) {
  const fields = [];
  let value = 0, scale = 1;
  for (let i = 0; i < segment.length; i++) {
    const digit = digits[segment.charCodeAt(i)];
    if (digit === undefined || digit < 0) throw new SyntaxError('Invalid base64 VLQ digit');
    value += (digit & 31) * scale;
    if (value > 0xffffffff || scale > 32 ** 6) throw new RangeError('VLQ overflow');
    if (digit & 32) {
      scale *= 32;
    } else {
      const magnitude = Math.floor(value / 2);
      fields.push(value % 2 ? -magnitude : magnitude);
      value = 0;
      scale = 1;
    }
  }
  if (scale !== 1 || ![1, 4, 5].includes(fields.length)) throw new SyntaxError('Invalid mapping segment');
  return fields;
}

module.exports = { encode, decode };
