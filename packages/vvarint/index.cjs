'use strict';

// Unsigned base-128 integers that round-trip through a JavaScript number.
function encodingLength(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Expected a nonnegative safe integer');
  if (value < 128) return 1;
  if (value <= 0xffffffff) return Math.ceil((32 - Math.clz32(value)) / 7);
  if (value < 2 ** 35) return 5;
  if (value < 2 ** 42) return 6;
  if (value < 2 ** 49) return 7;
  return 8;
}

const typedArrayName = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag).get;
function isBytes(value) {
  return ArrayBuffer.isView(value) && (value instanceof Uint8Array || typedArrayName.call(value) === 'Uint8Array');
}

function encode(value, output = [], offset = 0) {
  encode.bytes = 0;
  const size = encodingLength(value);
  const array = Array.isArray(output);
  if (!array && !isBytes(output)) throw new TypeError('Expected a byte array');
  if (!Number.isSafeInteger(offset) || offset < 0 || offset + size > (array ? 0xffffffff : output.length))
    throw new RangeError('Encoding does not fit at this offset');

  let index = offset;
  while (value >= 128) {
    output[index++] = (value & 127) | 128;
    value = Math.floor(value / 128);
  }
  output[index] = value;
  encode.bytes = size;
  return output;
}

function decode(input, offset = 0) {
  decode.bytes = 0;
  if (!Array.isArray(input) && !isBytes(input)) throw new TypeError('Expected a byte array');
  if (!Number.isSafeInteger(offset) || offset < 0) throw new RangeError('Invalid offset');
  let value = 0;
  const limit = Math.min(8, input.length - offset);
  for (let i = 0, place = 1; i < limit; i++, place *= 128) {
    const byte = input[offset + i];
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new RangeError('Invalid byte');
    if (i === 7 && byte > 15) throw new RangeError('Varint exceeds the safe integer range');
    value += (byte & 127) * place;
    if (byte < 128) {
      decode.bytes = i + 1;
      return value;
    }
  }
  throw new RangeError('Incomplete varint');
}

encode.bytes = 0;
decode.bytes = 0;
module.exports = {encode, decode, encodingLength};
