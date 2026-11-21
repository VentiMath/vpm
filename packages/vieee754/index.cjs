'use strict';

// A private word also works with ordinary arrays, cross-realm views and
// unaligned offsets. No caller-owned buffer is kept alive by the codec.
const word = new DataView(new ArrayBuffer(4));
const double = new Float64Array(1);
const halves = new Uint32Array(double.buffer);
const lowWord = new Uint8Array(Uint32Array.of(1).buffer)[0] === 1 ? 0 : 1;
const highWord = 1 - lowWord;
function bounds(bytes, offset, size) {
  if (!Number.isInteger(offset) || offset < 0 || offset + size > bytes.length)
    throw new RangeError('Floating-point field is outside the byte array');
}
function checkFormat(fraction, size) {
  const exponent = size * 8 - fraction - 1;
  if (!Number.isInteger(size) || !Number.isInteger(fraction) || fraction < 1 || fraction > 52 ||
      exponent < 2 || exponent > 11) throw new RangeError('Unsupported floating-point format');
  return exponent;
}
function uint32(bytes, i, little) {
  return little ? (bytes[i] | bytes[i+1]<<8 | bytes[i+2]<<16 | bytes[i+3]<<24) >>> 0
    : (bytes[i]<<24 | bytes[i+1]<<16 | bytes[i+2]<<8 | bytes[i+3]) >>> 0;
}
function put32(bytes, i, little, bits) {
  const step = little ? 1 : -1;
  let p = little ? i : i + 3;
  bytes[p] = bits & 255;
  bytes[p += step] = bits >>> 8 & 255;
  bytes[p += step] = bits >>> 16 & 255;
  bytes[p + step] = bits >>> 24;
}
function read(bytes, offset, little, fraction, size) {
  bounds(bytes, offset, size);
  if (fraction === 23 && size === 4) {
    word.setUint32(0, uint32(bytes, offset, little));
    return word.getFloat32(0);
  }
  if (fraction === 52 && size === 8) {
    const high = uint32(bytes, offset + (little ? 4 : 0), little);
    const low = uint32(bytes, offset + (little ? 0 : 4), little);
    halves[highWord] = high;
    halves[lowWord] = low;
    return double[0];
  }
  const exponentBits = checkFormat(fraction, size);
  let field = 0n;
  for (let i = 0; i < size; i++) field = (field << 8n) | BigInt(bytes[offset + (little ? size-1-i : i)]);
  const unit = 1n << BigInt(fraction);
  const significand = Number(field % unit) / Number(unit);
  const special = (1 << exponentBits) - 1;
  const exponent = Number(field / unit) & special;
  const sign = field >> BigInt(size*8-1) ? -1 : 1;
  if (exponent === special) return significand ? NaN : sign * Infinity;
  const bias = special >> 1;
  return sign * (exponent ? 1 + significand : significand) * 2 ** ((exponent || 1) - bias);
}
function singleBits(value) {
  if (Number.isNaN(value)) return 0x7f800001;
  word.setFloat32(0, value);
  const bits = word.getUint32(0);
  const rounded = Math.abs(word.getFloat32(0)), magnitude = Math.abs(value);
  if (rounded < magnitude) {
    // The browser Buffer control rounds exact midpoints away from zero.
    word.setUint32(0, (bits & 0x7fffffff) + 1);
    if (magnitude - rounded === (word.getFloat32(0) - rounded) / 2) return bits + 1;
  }
  return bits;
}
function write(bytes, value, offset, little, fraction, size) {
  bounds(bytes, offset, size);
  if (fraction === 23 && size === 4) {
    put32(bytes, offset, little, singleBits(value));
    return;
  }
  if (fraction === 52 && size === 8) {
    double[0] = value;
    // Keep upstream's positive one-bit NaN payload on both byte orders.
    const high = Number.isNaN(value) ? 0x7ff00000 : halves[highWord];
    const low = Number.isNaN(value) ? 1 : halves[lowWord];
    put32(bytes, offset + (little ? 4 : 0), little, high);
    put32(bytes, offset + (little ? 0 : 4), little, low);
    return;
  }
  const exponentBits = checkFormat(fraction, size);
  const special = (1 << exponentBits) - 1, bias = special >> 1, unit = 2 ** fraction;
  const magnitude = Math.abs(value);
  let exponent = 0, mantissa = 0;
  if (!Number.isFinite(value)) {
    exponent = special;
    mantissa = Number.isNaN(value) ? 1 : 0;
  } else if (magnitude !== 0) {
    let power = Math.floor(Math.log2(magnitude));
    if (2 ** power > magnitude) power--;
    exponent = Math.max(0, Math.min(special, power + bias));
    if (exponent < special) {
      const normalized = magnitude / 2 ** (exponent ? power : 1 - bias);
      mantissa = Math.floor((normalized - (exponent ? 1 : 0)) * unit);
    }
  }
  let field = (BigInt(exponent) << BigInt(fraction)) + BigInt(mantissa);
  if (value < 0 || Object.is(value, -0)) field |= 1n << BigInt(8*size-1);
  for (let i=0; i<size; i++, field >>= 8n) bytes[offset + (little ? i : size-1-i)] = Number(field & 255n);
}
module.exports = {read, write};
