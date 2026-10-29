'use strict';
const jws = require('vjws');
const keys = require('./keys');
const { algorithms, plain, own, bytes, timespan, numericClaims } = require('./common');
const claimOptions = { audience: 'aud', issuer: 'iss', subject: 'sub', jwtid: 'jti' };
const objectOptions = ['expiresIn', 'notBefore', 'noTimestamp', ...Object.keys(claimOptions)];
const durationMessage = name => `"${name}" should be a number of seconds or string representing a timespan`;
function optionsSnapshot(value) {
  if (!plain(value)) throw new Error('Expected "options" to be a plain object.');
  const options = Object.assign(Object.create(null), value);
  for (const name of Object.keys(options)) {
    const v = options[name];
    switch (name) {
      case 'expiresIn': case 'notBefore':
        if (!Number.isInteger(v) && !(typeof v === 'string' && v)) throw new Error(durationMessage(name));
        break;
      case 'audience':
        if (typeof v !== 'string' && !(Array.isArray(v) && Array.from(v).every(x => typeof x === 'string'))) throw new Error('"audience" must be a string or array');
        break;
      case 'algorithm':
        if (!algorithms.has(v)) throw new Error('"algorithm" must be a valid string enum value');
        break;
      case 'header':
        if (!plain(v)) throw new Error('"header" must be an object');
        break;
      case 'encoding': case 'issuer': case 'subject': case 'jwtid': case 'keyid':
        if (typeof v !== 'string') throw new Error(`"${name}" must be a string`);
        break;
      case 'noTimestamp': case 'mutatePayload': case 'allowInsecureKeySizes': case 'allowInvalidAsymmetricKeyTypes':
        if (typeof v !== 'boolean') throw new Error(`"${name}" must be a boolean`);
        if (name === 'allowInvalidAsymmetricKeyTypes' && v) throw new Error('allowInvalidAsymmetricKeyTypes: true is not supported');
        break;
      default: throw new Error(`"${name}" is not allowed in "options"`);
    }
  }
  return options;
}
function sign(payload, key, options) {
  options = optionsSnapshot(options ?? {});
  const binary = bytes(payload);
  const isObject = typeof payload === 'object' && binary === null;
  const original = payload;
  if (payload === undefined) throw new Error('payload is required');
  if (isObject) {
    if (!plain(payload)) throw new Error('Expected "payload" to be a plain object.');
    // Snapshot getters once and define __proto__ as data. No inherited claims.
    payload = Object.assign(Object.create(null), payload);
    numericClaims(payload, name => new Error(`"${name}" should be a number of seconds`));
    if (typeof own(payload, 'toJSON') === 'function') throw new Error('payload must not define a toJSON method');
  } else {
    const invalid = objectOptions.filter(name => options[name] !== undefined);
    if (invalid.length) throw new Error('invalid ' + invalid.join(',') + ' option for ' + typeof payload + ' payload');
    if (binary !== null) payload = binary;
  }
  const header = Object.assign(Object.create(null), { alg: options.algorithm || 'HS256', typ: isObject ? 'JWT' : undefined, kid: options.keyid }, options.header);
  // Serialize hooks exactly once, then validate the actual header to be signed.
  const snapshot = JSON.parse(JSON.stringify(header));
  if (!plain(snapshot) || !algorithms.has(snapshot.alg)) throw new Error('invalid or unsupported JWT algorithm');
  if ((options.algorithm !== undefined && snapshot.alg !== options.algorithm) ||
    (snapshot.alg === 'none' && options.algorithm !== 'none')) throw new Error('header algorithm conflicts with options.algorithm');
  if (snapshot.alg !== 'none') {
    if (!key) throw new Error('secretOrPrivateKey must have a value');
    try { key = keys.material(key, true); } catch { throw new Error('secretOrPrivateKey is not valid key material'); }
    keys.validate(snapshot.alg, key, true, options.allowInsecureKeySizes);
  } else if (key != null) throw new Error('none algorithm requires a null key');
  if (isObject) {
    const timestamp = own(payload, 'iat') ?? Math.floor(Date.now() / 1000);
    for (const [option, claim] of [['expiresIn', 'exp'], ['notBefore', 'nbf']]) {
      if (options[option] !== undefined && own(payload, claim) !== undefined) {
        throw new Error(`Bad "options.${option}" option the payload already has an "${claim}" property.`);
      }
    }
    for (const option of Object.keys(claimOptions)) {
      const claim = claimOptions[option];
      if (options[option] !== undefined && own(payload, claim) !== undefined) {
        throw new Error(`Bad "options.${option}" option. The payload already has an "${claim}" property.`);
      }
    }
    if (options.noTimestamp) delete payload.iat;
    else payload.iat = timestamp;
    for (const [option, claim] of [['notBefore', 'nbf'], ['expiresIn', 'exp']]) {
      if (options[option] !== undefined) {
        const time = timespan(options[option], timestamp);
        if (time === undefined) throw new Error(durationMessage(option) + ' eg: "1d", "20h", 60');
        payload[claim] = time;
      }
    }
    for (const option of Object.keys(claimOptions)) if (options[option] !== undefined) payload[claimOptions[option]] = options[option];
    if (options.mutatePayload) {
      if (options.noTimestamp) delete original.iat;
      for (const name of ['iat', 'nbf', 'exp', 'aud', 'iss', 'sub', 'jti']) {
        if (Object.hasOwn(payload, name)) Object.defineProperty(original, name, { value: payload[name], writable: true, configurable: true, enumerable: true });
      }
    }
  }
  return jws.sign({ header: snapshot, payload, secret: key, encoding: isObject ? 'utf8' : options.encoding });
}
module.exports = function (payload, key, options, callback) {
  if (typeof options === 'function') { callback = options; options = undefined; }
  if (callback === undefined) return sign(payload, key, options);
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');
  let error, token;
  try { token = sign(payload, key, options); } catch (e) { error = e; }
  // No stream pair or once wrapper is needed for a single in-memory operation.
  // The callback is outside the catch so its own exceptions are never swallowed.
  process.nextTick(() => callback(error || null, token));
};
