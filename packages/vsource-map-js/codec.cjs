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

// Decode directly from the mappings field. Most deltas fit in a single digit.
function readDelta(cursor) {
  let digit = digits[cursor.text.charCodeAt(cursor.index++)];
  if (!(digit >= 0)) throw new SyntaxError('Invalid base64 VLQ digit');
  if (digit < 32) return digit & 1 ? -(digit >> 1) : digit >> 1;

  let value = digit & 31;
  let scale = 32;
  do {
    digit = digits[cursor.text.charCodeAt(cursor.index++)];
    if (!(digit >= 0)) throw new SyntaxError('Invalid base64 VLQ digit');
    value += (digit & 31) * scale;
    if (value > 0xffffffff || scale > 32 ** 6) throw new RangeError('VLQ overflow');
    scale *= 32;
  } while (digit & 32);
  const magnitude = Math.floor(value / 2);
  return value % 2 ? -magnitude : magnitude;
}

module.exports = { encode, readDelta };
