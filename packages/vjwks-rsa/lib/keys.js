'use strict';
const { createPublicKey } = require('node:crypto');
const { JwksError, SigningKeyNotFoundError, ArgumentError } = require('./errors');
const { own } = require('./options');
const algorithms = Object.freeze(['RS256','RS384','RS512','PS256','PS384','PS512','ES256','ES256K','ES384','ES512','EdDSA']);
const families = { RSA: algorithms.slice(0, 6), 'P-256': ['ES256'], secp256k1: ['ES256K'], 'P-384': ['ES384'], 'P-521': ['ES512'], Ed25519: ['EdDSA'], Ed448: ['EdDSA'] };
const allowed = new WeakMap();
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const ecSizes = { 'P-256':32, secp256k1:32, 'P-384':48, 'P-521':66 };
const okpSizes = { Ed25519:32, Ed448:57 };
const privateFields = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k'];
function keyArray(value, maxKeys) {
  if (!Array.isArray(value)) throw new JwksError('The JWKS endpoint must return a keys array');
  if (value.length > maxKeys) throw new JwksError('The JWKS endpoint exceeded maxKeys');
  return value;
}
function binary(value, length, integer = false) {
  if (typeof value !== 'string' || !value.length || value.length > 16384 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid JWK encoding');
  // Canonical unpadded base64url has a complete byte count and zero unused bits.
  // Inspect those bits directly, leaving decoding to the native JWK importer.
  const remainder = value.length & 3;
  const tail = alphabet.indexOf(value[value.length - 1]);
  if (remainder === 1 || (remainder === 2 && (tail & 15)) || (remainder === 3 && (tail & 3)) ||
      (length && Math.floor(value.length * 3 / 4) !== length) ||
      (integer && value[0] === 'A' && alphabet.indexOf(value[1]) < 16)) throw new Error('Noncanonical JWK encoding');
  return value;
}
function retrieveSigningKeys(input, maxKeys = 100) {
  const keys = keyArray(input, maxKeys), result = [], ids = new Set();
  for (let i = 0; i < keys.length; i++) {
    let signing;
    try {
      const source = keys[i];
      if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
      const kty = own(source, 'kty'), use = own(source, 'use'), alg = own(source, 'alg'), kid = own(source, 'kid');
      if (use !== undefined && use !== 'sig') continue;
      if (kid !== undefined && (typeof kid !== 'string' || kid.length > 1024)) continue;
      if (alg !== undefined && (typeof alg !== 'string' || !algorithms.includes(alg))) continue;
      if (privateFields.some(field => Object.hasOwn(source, field))) continue;
      const operations = own(source, 'key_ops');
      if (operations !== undefined && (!Array.isArray(operations) || operations.length !== 1 || operations[0] !== 'verify')) continue;
      const jwk = { kty };
      let compatible;
      if (kty === 'RSA') {
        jwk.n = binary(own(source, 'n'), 0, true); jwk.e = binary(own(source, 'e'), 0, true);
        if (jwk.e.length > 16) continue;
        compatible = families.RSA;
      } else if (kty === 'EC' || kty === 'OKP') {
        const crv = own(source, 'crv');
        const sizes = kty === 'EC' ? ecSizes : okpSizes;
        if (typeof crv !== 'string' || !Object.hasOwn(sizes, crv)) continue;
        jwk.crv = crv; jwk.x = binary(own(source, 'x'), sizes[crv]);
        if (kty === 'EC') jwk.y = binary(own(source, 'y'), sizes[crv]);
        compatible = families[crv];
      } else continue;
      if (alg !== undefined && !compatible.includes(alg)) continue;
      const native = createPublicKey({ key: jwk, format: 'jwk' });
      // Export once, on first use. An immutable wrapper can safely be cached.
      let pem;
      const getPublicKey = () => pem === undefined ? (pem = native.export({ format: 'pem', type: 'spki' })) : pem;
      signing = { get publicKey() { return getPublicKey(); }, get rsaPublicKey() { return getPublicKey(); }, getPublicKey };
      if (kid !== undefined) signing.kid = kid;
      if (alg !== undefined) signing.alg = alg;
      Object.freeze(signing);
      allowed.set(signing, alg === undefined ? compatible : [alg]);
    } catch { continue; } // Malformed/unsupported individual keys do not discard valid siblings.
    if (signing.kid !== undefined) {
      if (ids.has(signing.kid)) throw new JwksError('The JWKS endpoint contained duplicate signing key IDs');
      ids.add(signing.kid);
    }
    result.push(signing);
  }
  return result;
}
function validateKid(kid) {
  if (kid !== undefined && kid !== null && (typeof kid !== 'string' || kid.length > 1024)) throw new ArgumentError('kid must be a string of at most 1024 characters, null or undefined');
}
function select(keys, kid, optional = false) {
  if (kid === undefined || kid === null) {
    if (keys.length > 1) throw new SigningKeyNotFoundError('No KID specified and JWKS endpoint returned more than 1 key');
    if (keys.length === 1) return keys[0];
  } else {
    for (const key of keys) if (key.kid === kid) return key;
  }
  if (optional) return undefined;
  throw new SigningKeyNotFoundError(`Unable to find a signing key that matches '${kid}'`);
}
function matchesAlgorithm(key, alg) { return allowed.get(key)?.includes(alg) === true; }
module.exports = { retrieveSigningKeys, keyArray, validateKid, select, algorithms, matchesAlgorithm };
