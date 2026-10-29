'use strict';
const { TextDecoder } = require('node:util');
const { JwksClient, asError } = require('./client');
const { ArgumentError, JwksError } = require('./errors');
const { algorithms, matchesAlgorithm } = require('./keys');
const decoder = new TextDecoder('utf-8', { fatal:true });
function init(input, name) {
  if (input == null) throw new ArgumentError('An options object must be provided when initializing ' + name);
  return new JwksClient(input);
}
async function keyFor(client, header) {
  const alg = header?.alg, kid = header?.kid;
  if (!algorithms.includes(alg)) return undefined;
  const key = await client.getSigningKey(kid);
  if (!matchesAlgorithm(key, alg)) throw new JwksError('Signing key does not support the token algorithm');
  return key;
}
function handled(client, error, missingAllowed) {
  const handler = client.options.handleSigningKeyError;
  if (!handler) return missingAllowed && error?.name === 'SigningKeyNotFoundError' ? Promise.resolve() : Promise.reject(asError(error));
  return new Promise((resolve, reject) => {
    let done = false;
    const complete = replacement => { if(done)return;done=true;replacement ? reject(asError(replacement)) : resolve(); };
    try {
      const returned = handler(asError(error), complete);
      if (returned && typeof returned.then === 'function') Promise.resolve(returned).then(undefined, failure => complete(asError(failure)));
    } catch (failure) { complete(asError(failure)); }
  });
}
function deliver(promise, callback, map = key => [null,key], failure = error => [error]) {
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');
  promise.then(value => process.nextTick(callback, ...map(value)), error => process.nextTick(callback, ...failure(asError(error))));
}
function expressJwtSecret(options) {
  const client = init(options, 'expressJwtSecret');
  async function resolve(token) {
    try { return (await keyFor(client, token?.header))?.getPublicKey(); }
    catch (error) { return handled(client, error, true); }
  }
  return function secretProvider(req, header, payload, callback) {
    if (arguments.length === 4) { deliver(resolve({ header }), callback); return; }
    return resolve(header);
  };
}
function parseToken(raw) {
  if (typeof raw !== 'string' || raw.length > 1048576) return;
  const parts = raw.split('.');
  if (parts.length !== 3 || !parts.every(p => p.length && /^[A-Za-z0-9_-]+$/.test(p))) return;
  try {
    const decode = part => {
      const bytes = Buffer.from(part, 'base64url');
      if (bytes.toString('base64url') !== part) throw new Error();
      const value = JSON.parse(decoder.decode(bytes));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value;
    };
    const header = decode(parts[0]); decode(parts[1]);
    if (header.crit !== undefined || header.b64 === false) return;
    return header;
  } catch { return; }
}
function passportJwtSecret(options) {
  const client = init(options, 'passportJwtSecret');
  return function secretProvider(req, raw, callback) {
    const header = parseToken(raw);
    if (!header || !algorithms.includes(header.alg)) { deliver(Promise.resolve(null), callback); return; }
    const operation = keyFor(client, header).then(key => key.getPublicKey(), error => handled(client,error,true).then(()=>null));
    deliver(operation, callback);
  };
}
function koaJwtSecret(options) {
  const client = init(options, 'koaJwtSecret');
  return async function secretProvider(header) {
    const alg = header?.alg, kid = header?.kid;
    if (!algorithms.includes(alg)) throw new Error('Missing / invalid token algorithm');
    try { return (await keyFor(client,{alg,kid})).getPublicKey(); }
    catch (error) {
      const handler = client.options.handleSigningKeyError;
      if (!handler) throw asError(error);
      let replacement;
      try { replacement = await handler(asError(error)); } catch (failure) { throw asError(failure); }
      throw replacement instanceof Error ? replacement : asError(error);
    }
  };
}
function hapiJwt2Key(options) {
  const client = init(options, 'hapiJwt2Key');
  return function secretProvider(decoded, callback) {
    async function resolve() {
      const header = decoded?.header;
      if (!header) throw new Error('Cannot find a signing certificate if there is no header');
      const alg = header.alg, kid = header.kid;
      if (!algorithms.includes(alg)) throw new Error('Unsupported algorithm ' + alg + ' supplied.');
      try { return await keyFor(client, {alg,kid}); }
      catch (error) { await handled(client,error,false); throw new JwksError('No signing key was provided by the error handler'); }
    }
    deliver(resolve(), callback, key => [null,key.getPublicKey(),key], error => [error,null,null]);
  };
}
function hapiJwt2KeyAsync(options) {
  const provider = hapiJwt2Key(options);
  return decoded => new Promise((resolve,reject)=>provider(decoded,(error,key)=>error ? reject(error) : resolve({key})));
}
module.exports = { expressJwtSecret, passportJwtSecret, koaJwtSecret, hapiJwt2Key, hapiJwt2KeyAsync };
