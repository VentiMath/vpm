'use strict';

// Derived from cookie-signature (MIT); see LICENSE and PROVENANCE.json.
const { createHmac, timingSafeEqual, KeyObject } = require('node:crypto');
const { types: { isCryptoKey } } = require('node:util');
const { Buffer } = require('node:buffer');

exports.sign = sign;
exports.unsign = unsign;
Object.freeze(exports);

function hmac(value, secret, label) {
  if (typeof value !== 'string') throw new TypeError(label + ' must be a string');
  if (secret == null) throw new TypeError('secret is required');
  // Native crypto validates key objects and byte views, including malformed
  // input paths. Invalid key configuration must not silently become false.
  // Avoid the deprecated direct CryptoKey overload on current Node releases.
  const key = typeof secret === 'object' && isCryptoKey(secret) ? KeyObject.from(secret) : secret;
  return createHmac('sha256', key);
}

function sign(value, secret) {
  const signature = hmac(value, secret, 'value').update(value).digest('base64');
  return value + '.' + signature.slice(0, -1);
}

function unsign(input, secret) {
  const hash = hmac(input, secret, 'signed value');
  const separator = input.length - 44;
  if (separator < 0 || input.charCodeAt(separator) !== 46) return false;
  const supplied = Buffer.from(input.slice(separator + 1));
  // UTF-8 encoding expands non-ASCII input. Never truncate it into matching
  // ASCII bytes, or accept permissive base64 aliases/nonzero padding bits.
  if (supplied.length !== 43) return false;
  const value = input.slice(0, separator);
  const expected = Buffer.from(hash.update(value).digest('base64').slice(0, -1));
  // Compare only the 43-byte signature, not two copies of the entire payload.
  // Public format checks can reject early; secret-dependent bytes use native
  // timingSafeEqual. Exact encoded bytes also enforce canonical base64.
  return timingSafeEqual(expected, supplied) ? value : false;
}
