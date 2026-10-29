'use strict';
const crypto = require('node:crypto');
const { types } = require('node:util');
const { bytes } = require('./common');
const publicKeys = new Map(), details = new WeakMap();
const publicPem = /^-----BEGIN (PUBLIC KEY|RSA PUBLIC KEY)-----\r?\n[A-Za-z0-9+/=\r\n]+-----END \1-----\r?\n?$/;
const allowed = { ec: ['ES256', 'ES384', 'ES512'],
  rsa: ['RS256', 'PS256', 'RS384', 'PS384', 'RS512', 'PS512'], 'rsa-pss': ['PS256', 'PS384', 'PS512'] };
const curves = { ES256: 'prime256v1', ES384: 'secp384r1', ES512: 'secp521r1' };
function genuine(key) {
  for (const name of ['type', 'asymmetricKeyType', 'asymmetricKeyDetails']) {
    if (Object.hasOwn(key, name)) throw new TypeError('key must not shadow native metadata');
  }
  return key;
}
function material(value, signing) {
  if (types.isCryptoKey(value)) {
    if (!value.extractable) throw new TypeError('CryptoKey must be extractable for native key conversion');
    value = crypto.KeyObject.from(value);
  }
  if (types.isKeyObject(value)) return genuine(value);
  const text = typeof value === 'string' ? value : null;
  if (!signing && text !== null) {
    const cached = publicKeys.get(text);
    if (cached) return cached;
  }
  const binary = text === null ? bytes(value) : null;
  // Ordinary shared secrets need no failed asymmetric import (and no secret
  // cache). PEM anywhere in the input still takes the native parsing path.
  if ((text !== null || binary !== null) && !(text ?? binary).includes('-----BEGIN')) {
    return crypto.createSecretKey(text === null ? binary : Buffer.from(text));
  }
  let key;
  try { key = signing ? crypto.createPrivateKey(value) : crypto.createPublicKey(value); }
  catch (error) {
    // A public PEM cannot become an HMAC secret merely because this is sign().
    if (signing) {
      try { return crypto.createPublicKey(value); } catch { /* report invalid material below */ }
    }
    throw error;
  }
  if (!signing && text !== null && text.length <= 16384 && publicPem.test(text)) {
    if (publicKeys.size === 16) publicKeys.delete(publicKeys.keys().next().value);
    publicKeys.set(text, key);
  }
  return key;
}
function validate(algorithm, key, signing, insecure) {
  genuine(key);
  const label = signing ? 'secretOrPrivateKey' : 'secretOrPublicKey';
  if (algorithm.startsWith('HS')) {
    if (key.type !== 'secret') throw new Error(`${label} must be a symmetric key when using ${algorithm}`);
    return;
  }
  if (key.type !== (signing ? 'private' : 'public')) throw new Error(`${label} must be an asymmetric key when using ${algorithm}`);
  const type = key.asymmetricKeyType;
  if (!Object.hasOwn(allowed, type)) throw new Error(`Unknown key type "${type}".`);
  if (!allowed[type].includes(algorithm)) throw new Error(`"alg" parameter for "${type}" key type must be one of: ${allowed[type].join(', ')}.`);
  if (!signing && type === 'rsa') return;
  // Native KeyObjects are immutable. Metadata is weakly held, never keyed by
  // mutable input bytes, and shadowed metadata is checked on every operation.
  let info = details.get(key);
  if (!info) { info = key.asymmetricKeyDetails; details.set(key, info); }
  if (signing && type !== 'ec' && !insecure && info.modulusLength < 2048) {
    throw new Error(`secretOrPrivateKey has a minimum key size of 2048 bits for ${algorithm}`);
  }
  if (type === 'ec' && info.namedCurve !== curves[algorithm]) throw new Error(`"alg" parameter "${algorithm}" requires curve "${curves[algorithm]}".`);
  if (type === 'rsa-pss') {
    const bits = Number(algorithm.slice(2));
    if ((info.hashAlgorithm !== undefined && info.hashAlgorithm !== 'sha' + bits) ||
      (info.mgf1HashAlgorithm !== undefined && info.mgf1HashAlgorithm !== 'sha' + bits)) {
      throw new Error(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${algorithm}.`);
    }
    if (info.saltLength !== undefined && info.saltLength > bits / 8) {
      throw new Error(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${algorithm}.`);
    }
  }
}
function defaults(key) {
  if (key.type === 'secret') return ['HS256', 'HS384', 'HS512'];
  return allowed[key.asymmetricKeyType] || ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512'];
}
module.exports = { material, validate, defaults };
