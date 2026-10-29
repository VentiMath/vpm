'use strict';

// Derived from jwa (MIT); see LICENSE and PROVENANCE.json.
const crypto = require('node:crypto');
const { Buffer } = require('node:buffer');
const { types } = require('node:util');
const { RSA_PKCS1_PADDING, RSA_PKCS1_PSS_PADDING, RSA_PSS_SALTLEN_DIGEST } = crypto.constants;
const algorithms = Object.create(null);
const invalidBase64url = /[^A-Za-z0-9_-]/;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const publicKeys = new Map();
const publicPem = /^-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY)-----\r?\n[A-Za-z0-9+/=\r\n]+-----END \1-----\r?\n?$/;

function fromCryptoKey(value) {
  if (!value.extractable) throw new TypeError('CryptoKey must be extractable for native key conversion');
  return crypto.KeyObject.from(value);
}

function input(value) {
  if (typeof value === 'string' || Buffer.isBuffer(value)) return value;
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (types.isAnyArrayBuffer(value)) return Buffer.from(value);
  const json = JSON.stringify(value);
  if (typeof json !== 'string') throw new TypeError('input must be bytes, a string or JSON-serializable data');
  return json;
}

function secret(value) {
  if (typeof value === 'string' || ArrayBuffer.isView(value) || types.isAnyArrayBuffer(value)) return value;
  if (types.isCryptoKey(value)) value = fromCryptoKey(value);
  if (types.isKeyObject(value) && value.type === 'secret') return value;
  throw new TypeError('secret must be a string, bytes or a genuine secret key');
}

function keyObject(value, signing) {
  const text = !signing && typeof value === 'string' ? value : null;
  if (text !== null) {
    const cached = publicKeys.get(text);
    if (cached) return cached;
  }
  if (types.isCryptoKey(value)) value = fromCryptoKey(value);
  if (!types.isKeyObject(value)) {
    if (value && typeof value === 'object' && !ArrayBuffer.isView(value) && !types.isAnyArrayBuffer(value)) {
      if (!Object.hasOwn(value, 'key')) throw new TypeError('key options must have an own key property');
      // Read only supported key-import fields, once each. Signature format,
      // padding and salt length belong to the selected JWA algorithm.
      const options = { key: value.key };
      for (const name of ['format', 'type', 'passphrase', 'encoding']) {
        if (Object.hasOwn(value, name)) options[name] = value[name];
      }
      // Native sign() accepts an options wrapper around an existing KeyObject.
      // Unwrap that case without attempting to import the object as PEM bytes.
      if (types.isCryptoKey(options.key)) options.key = fromCryptoKey(options.key);
      value = types.isKeyObject(options.key) ? options.key : options;
    } else if (typeof value !== 'string' && !ArrayBuffer.isView(value) && !types.isAnyArrayBuffer(value)) {
      throw new TypeError('key must be encoded key material, import options or a genuine asymmetric key');
    }
    if (!types.isKeyObject(value)) value = signing ? crypto.createPrivateKey(value) : crypto.createPublicKey(value);
  }
  if (signing ? value.type !== 'private' : value.type !== 'public' && value.type !== 'private') {
    throw new TypeError(signing ? 'signing requires a private key' : 'verification requires an asymmetric key');
  }
  // Cache only complete, bounded PUBLIC KEY strings after successful import.
  // Private PEM, certificates, options and mutable buffers are never cached.
  if (text !== null && text.length <= 16384 && publicPem.test(text)) {
    if (publicKeys.size === 16) publicKeys.delete(publicKeys.keys().next().value);
    publicKeys.set(text, value);
  }
  return value;
}

function matchesKey(key, family, curve) {
  const type = key.asymmetricKeyType;
  if (family === 'ES') return type === 'ec' && key.asymmetricKeyDetails.namedCurve === curve;
  return type === 'rsa' || (family === 'PS' && type === 'rsa-pss');
}

function signatureBytes(signature, size) {
  if (typeof signature !== 'string') throw new TypeError('signature must be a base64url string');
  const length = signature.length;
  if (size && length !== Math.ceil(size * 4 / 3)) return null;
  const remainder = length % 4;
  if (!length || remainder === 1 || invalidBase64url.test(signature)) return null;
  // Buffer's decoder is deliberately permissive; require canonical unpadded
  // base64url, including zero unused bits, before decoding untrusted signatures.
  const last = alphabet.indexOf(signature[length - 1]);
  if ((remainder === 2 && (last & 15)) || (remainder === 3 && (last & 3))) return null;
  return Buffer.from(signature, 'base64url');
}

function hmac(bits) {
  const hash = 'sha' + bits;
  const length = Math.ceil(bits / 8 * 4 / 3);
  return {
    sign(value, key) {
      const signer = crypto.createHmac(hash, secret(key));
      return signer.update(input(value)).digest('base64url');
    },
    verify(value, signature, key) {
      // Key and input errors remain errors, even for malformed signatures.
      const verifier = crypto.createHmac(hash, secret(key));
      value = input(value);
      if (typeof signature !== 'string') throw new TypeError('signature must be a base64url string');
      if (signature.length !== length) return false;
      const supplied = Buffer.from(signature);
      if (supplied.length !== length) return false;
      // Comparing exact encoded bytes also rejects aliases, whitespace and
      // nonzero unused bits without a separate base64 validation/decoding pass.
      const expected = Buffer.from(verifier.update(value).digest('base64url'));
      return crypto.timingSafeEqual(expected, supplied);
    },
  };
}

function asymmetric(family, bits) {
  const hash = 'sha' + bits;
  const curve = bits === 256 ? 'prime256v1' : bits === 384 ? 'secp384r1' : 'secp521r1';
  const size = family === 'ES' ? (bits === 512 ? 132 : bits / 4) : 0;
  const prepared = new WeakMap();
  function prepare(key) {
    let state = prepared.get(key);
    if (state) return state;
    // Do not accept shadowed native metadata as an algorithm/key match.
    for (const name of ['type', 'asymmetricKeyType', 'asymmetricKeyDetails']) {
      if (Object.hasOwn(key, name)) throw new TypeError('key must not shadow native metadata');
    }
    const matches = matchesKey(key, family, curve);
    const options = family === 'ES' ? { key, dsaEncoding: 'ieee-p1363' }
      : family === 'PS' ? { key, padding: RSA_PKCS1_PSS_PADDING, saltLength: RSA_PSS_SALTLEN_DIGEST }
      : { key, padding: RSA_PKCS1_PADDING };
    state = { matches, options, size: size || (matches ? Math.ceil(key.asymmetricKeyDetails.modulusLength / 8) : 0) };
    prepared.set(key, state);
    return state;
  }
  return {
    sign(value, key) {
      key = keyObject(key, true);
      const state = prepare(key);
      if (!state.matches) throw new TypeError('key does not match the selected algorithm');
      // Native P1363 output already has the JOSE r || s representation.
      return crypto.sign(hash, input(value), state.options).toString('base64url');
    },
    verify(value, signature, key) {
      key = keyObject(key, false);
      value = input(value);
      if (typeof signature !== 'string') throw new TypeError('signature must be a base64url string');
      const state = prepare(key);
      if (!state.matches) return false;
      const supplied = signatureBytes(signature, state.size);
      if (supplied === null) return false;
      return crypto.verify(hash, value, state.options, supplied);
    },
  };
}

for (const bits of [256, 384, 512]) {
  algorithms['HS' + bits] = hmac(bits);
  for (const family of ['RS', 'PS', 'ES']) algorithms[family + bits] = asymmetric(family, bits);
}
algorithms.none = {
  sign() { return ''; },
  verify(_value, signature) { return signature === ''; },
};

module.exports = function jwa(algorithm) {
  if (typeof algorithm !== 'string' || !Object.hasOwn(algorithms, algorithm)) {
    throw new TypeError('Expected a valid algorithm: HS/RS/PS/ES256, 384, 512 or none');
  }
  const methods = algorithms[algorithm];
  // Each factory call has its own public container; no mutable result cache.
  return { sign: methods.sign, verify: methods.verify };
};
