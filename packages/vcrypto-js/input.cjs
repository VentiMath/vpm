"use strict";
const encoder = new TextEncoder();
function bytes(value) {
  if (typeof value === "string") {
    if (!value.isWellFormed()) throw new URIError("Malformed UTF-16 string");
    return encoder.encode(value);
  }
  if (value instanceof Uint8Array) return value;
  if (
    !value ||
    !Array.isArray(value.words) ||
    !Number.isInteger(value.sigBytes) ||
    value.sigBytes < 0 ||
    value.sigBytes > value.words.length * 4
  )
    throw new TypeError("Expected a string, bytes or valid WordArray");
  const out = new Uint8Array(value.sigBytes);
  for (let n = 0; n < out.length; n++)
    out[n] = value.words[n >>> 2] >>> (24 - (n & 3) * 8);
  return out;
}
module.exports = { bytes };
