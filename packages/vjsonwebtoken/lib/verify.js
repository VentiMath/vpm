'use strict';
const jws = require('vjws');
const { Buffer, isUtf8 } = require('node:buffer');
const keys = require('./keys');
const { normalize } = require('./decode');
const { algorithms, plain, own, timespan, numericClaims } = require('./common');
const JsonWebTokenError = require('./JsonWebTokenError');
const NotBeforeError = require('./NotBeforeError');
const TokenExpiredError = require('./TokenExpiredError');
function fail(message) { throw new JsonWebTokenError(message); }
function snapshotOptions(value) {
  if (!plain(value)) fail('options must be a plain object');
  const options = Object.assign(Object.create(null), value);
  for (const name of ['clockTimestamp', 'clockTolerance']) {
    if (options[name] !== undefined && (!Number.isFinite(options[name]) || (name === 'clockTolerance' && options[name] < 0))) {
      fail(name + (name === 'clockTimestamp' ? ' must be a number' : ' must be a finite non-negative number'));
    }
  }
  for (const name of ['complete', 'ignoreExpiration', 'ignoreNotBefore', 'allowInvalidAsymmetricKeyTypes']) {
    if (options[name] !== undefined && typeof options[name] !== 'boolean') fail(name + ' must be a boolean');
  }
  if (options.allowInvalidAsymmetricKeyTypes) fail('allowInvalidAsymmetricKeyTypes: true is not supported');
  if (options.algorithms !== undefined) {
    if (!Array.isArray(options.algorithms) || !options.algorithms.length) fail('algorithms must be a non-empty array of supported algorithms');
    options.algorithms = Array.from(options.algorithms);
    if (!options.algorithms.every(x => algorithms.has(x))) fail('algorithms must be a non-empty array of supported algorithms');
  }
  for (const name of ['subject', 'jwtid', 'nonce']) {
    if (options[name] !== undefined && (typeof options[name] !== 'string' || (name === 'nonce' && !options[name].trim()))) fail(name + (name === 'nonce' ? ' must be a non-empty string' : ' must be a string'));
  }
  for (const name of ['audience', 'issuer']) {
    if (options[name] !== undefined) {
      const values = Array.isArray(options[name]) ? Array.from(options[name]) : [options[name]];
      if (!values.length || !values.every(x => typeof x === 'string' || (name === 'audience' && x instanceof RegExp))) fail(name + ' must be a string' + (name === 'audience' ? ', RegExp' : '') + ' or non-empty array');
      options[name] = values.map(x => x instanceof RegExp ? new RegExp(x.source, x.flags) : x);
    }
  }
  if (options.maxAge !== undefined && !(Number.isFinite(options.maxAge) || (typeof options.maxAge === 'string' && options.maxAge))) fail('"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60');
  return options;
}
function prepare(token, options) {
  options = snapshotOptions(options ?? {});
  const clock = options.clockTimestamp ?? Math.floor(Date.now() / 1000);
  if (!token) fail('jwt must be provided');
  if (typeof token !== 'string') fail('jwt must be a string');
  const first = token.indexOf('.'), second = token.indexOf('.', first + 1);
  if (first < 0 || second < 0 || token.indexOf('.', second + 1) !== -1) fail('jwt malformed');
  const decoded = jws.decode(token);
  if (!decoded) fail('invalid token');
  if (typeof decoded.payload === 'string' && decoded.payload.includes('\ufffd') &&
    !isUtf8(Buffer.from(token.slice(first + 1, second), 'base64url'))) fail('payload must be valid UTF-8');
  normalize(decoded);
  return { token, decoded, options, clock };
}
function verify(state, key) {
  const { token, decoded, options, clock } = state;
  const algorithm = decoded.header.alg;
  const signed = decoded.signature !== '';
  if (!signed && key) fail('jwt signature is required');
  if (signed && !key) fail('secret or public key must be provided');
  if (!signed && !options.algorithms) fail('please specify "none" in "algorithms" to verify unsigned tokens');
  if (!algorithms.has(algorithm)) fail('invalid algorithm');
  if (algorithm !== 'none') {
    try { key = keys.material(key, false); } catch { fail('secretOrPublicKey is not valid key material'); }
  } else if (key != null) fail('none algorithm requires a null key');
  if (!(options.algorithms || keys.defaults(key)).includes(algorithm)) fail('invalid algorithm');
  if (algorithm !== 'none') {
    try { keys.validate(algorithm, key, false); }
    catch (error) {
      if (error.message.startsWith('secretOrPublicKey must')) fail(error.message);
      throw error;
    }
  }
  if (!jws.verify(token, algorithm, key)) fail('invalid signature');
  const payload = decoded.payload;
  if (payload === null || Array.isArray(payload) || (typeof payload !== 'object' && typeof payload !== 'string')) fail('invalid payload');
  const tolerance = options.clockTolerance ?? 0;
  if (typeof payload === 'object') {
    if (options.maxAge !== undefined && !Number.isFinite(own(payload, 'iat'))) fail('iat required when maxAge is specified');
    numericClaims(payload, name => new JsonWebTokenError('invalid ' + name + ' value'));
    const nbf = own(payload, 'nbf'), exp = own(payload, 'exp');
    if (nbf !== undefined && !options.ignoreNotBefore && nbf - clock > tolerance) throw new NotBeforeError('jwt not active', new Date(nbf * 1000));
    if (exp !== undefined && !options.ignoreExpiration && clock - exp >= tolerance) throw new TokenExpiredError('jwt expired', new Date(exp * 1000));
  }
  if (options.audience !== undefined) {
    const audience = own(payload, 'aud');
    const targets = Array.isArray(audience) ? audience : [audience];
    const matches = targets.some(target => typeof target === 'string' && options.audience.some(expected => {
      if (expected instanceof RegExp) { expected.lastIndex = 0; return expected.test(target); }
      return target === expected;
    }));
    if (!matches) fail('jwt audience invalid. expected: ' + options.audience.join(' or '));
  }
  if (options.issuer !== undefined && !options.issuer.includes(own(payload, 'iss'))) fail('jwt issuer invalid. expected: ' + options.issuer.join(','));
  for (const [option, claim] of [['subject', 'sub'], ['jwtid', 'jti'], ['nonce', 'nonce']]) {
    if (options[option] !== undefined && own(payload, claim) !== options[option]) fail(`jwt ${option} invalid. expected: ${options[option]}`);
  }
  if (options.maxAge !== undefined) {
    const iat = own(payload, 'iat');
    if (!Number.isFinite(iat)) fail('iat required when maxAge is specified');
    const deadline = timespan(options.maxAge, iat);
    if (deadline === undefined) fail('"maxAge" should be a number of seconds or string representing a timespan eg: "1d", "20h", 60');
    if (clock - deadline >= tolerance) throw new TokenExpiredError('maxAge exceeded', new Date(deadline * 1000));
  }
  return options.complete === true ? decoded : payload;
}
module.exports = function (token, key, options, callback) {
  if (typeof options === 'function') { callback = options; options = undefined; }
  if (callback !== undefined && typeof callback !== 'function') throw new TypeError('callback must be a function');
  let state;
  try {
    state = prepare(token, options);
    if (typeof key === 'function' && !callback) fail('verify must be called asynchronous if secret or public key is provided as a callback');
  } catch (error) { if (!callback) throw error; return callback(error); }
  if (typeof key !== 'function') {
    if (!callback) return verify(state, key);
    let error, value;
    try { value = verify(state, key); } catch (e) { error = e; }
    return callback(error || null, value);
  }
  let called = false;
  function resolved(error, material) {
    if (called) return;
    called = true;
    let value;
    if (error) error = new JsonWebTokenError('error in secret or public key callback: ' + error.message, error);
    else { try { value = verify(state, material); } catch (e) { error = e; } }
    return callback(error || null, value);
  }
  // The resolver sees an independent untrusted header, never verification state.
  try { return key(JSON.parse(JSON.stringify(state.decoded.header)), resolved); }
  catch (error) { if (called) throw error; return resolved(error); }
};
