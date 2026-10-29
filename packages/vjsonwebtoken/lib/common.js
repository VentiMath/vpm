'use strict';
const ms = require('vms');
const { types } = require('node:util');
const { Buffer } = require('node:buffer');
const algorithms = new Set(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512',
  'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512', 'none']);
function plain(value) {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype ||
    (Object.getPrototypeOf(proto) === null && Object.hasOwn(proto, 'constructor') &&
      typeof proto.constructor === 'function' && Function.prototype.toString.call(proto.constructor) === Function.prototype.toString.call(Object));
}
function own(object, name) { return Object.hasOwn(object, name) ? object[name] : undefined; }
function bytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (types.isAnyArrayBuffer(value)) return Buffer.from(value);
  return null;
}
function timespan(value, timestamp) {
  let result;
  if (typeof value === 'number') result = timestamp + value;
  else if (typeof value === 'string' && value.length) {
    const duration = ms(value);
    if (Number.isFinite(duration)) result = Math.floor(timestamp + duration / 1000);
  }
  return Number.isFinite(result) ? result : undefined;
}
function numericClaims(payload, makeError) {
  for (const name of ['iat', 'exp', 'nbf']) {
    if (Object.hasOwn(payload, name) && !Number.isFinite(payload[name])) throw makeError(name);
  }
}
module.exports = { algorithms, plain, own, bytes, timespan, numericClaims };
