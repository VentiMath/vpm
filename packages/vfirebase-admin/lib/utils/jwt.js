/*! firebase-admin v14.5.0 */
"use strict";
/*!
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// VPM key ownership and verification adapter. Diagnostic text, error codes
// and protocol defaults retain the source-informed Firebase contract.
Object.defineProperty(exports, "__esModule", {value: true});
const jwt = require('vjsonwebtoken'), jwks = require('vjwks-rsa');
const validator = require('./validator');
const {HttpClient, RequestResponseError} = require('./api-request');
const {KeyCache, certificateLifetime} = require('./key-cache');
const ALGORITHM_RS256 = 'RS256', ALGORITHM_ES256 = 'ES256';
const algorithms = [ALGORITHM_RS256, ALGORITHM_ES256];
const callbackPrefix = 'error in secret or public key callback: ';
const noKid = 'no-kid-in-header-error', noMatch = 'no-matching-kid-error';
const JwtErrorCode = Object.freeze({INVALID_ARGUMENT: 'invalid-argument', INVALID_CREDENTIAL: 'invalid-credential',
  TOKEN_EXPIRED: 'token-expired', INVALID_SIGNATURE: 'invalid-token', NO_MATCHING_KID: 'no-matching-kid-error',
  NO_KID_IN_HEADER: 'no-kid-error', KEY_FETCH_ERROR: 'key-fetch-error'});
class JwtError extends Error {constructor(code, message) {super(message); this.code = code;}}
const invalidToken = () => new JwtError(JwtErrorCode.INVALID_ARGUMENT, 'The provided token must be a string.');

class UrlKeyFetcher {
  #cache;
  constructor(clientCertUrl, httpAgent) {
    if (!validator.isURL(clientCertUrl)) throw new Error('The provided public client certificate URL is not a valid URL.');
    this.clientCertUrl = clientCertUrl; this.httpAgent = httpAgent;
    this.#cache = new KeyCache(() => this.#load());
  }
  get publicKeys() {return this.#cache.keys;}
  get publicKeysExpireAt() {return this.#cache.expires;}
  shouldRefresh() {return this.#cache.stale();}
  fetchPublicKeys() {return this.#cache.read();}
  refresh() {return this.#cache.read(true);}
  async #load() {
    const started = Date.now();
    try {
      const response = await new HttpClient().send({method: 'GET', url: this.clientCertUrl, httpAgent: this.httpAgent});
      if (!response.isJson() || response.data?.error) throw new RequestResponseError(response);
      return {keys: response.data, lifetime: certificateLifetime(response.headers, started, Date.now())};
    } catch (failure) {
      if (!(failure instanceof RequestResponseError)) throw failure;
      const response = failure.response;
      const detail = response.isJson() && response.data?.error ? String(response.data.error) +
        (response.data.error_description ? ` (${response.data.error_description})` : '') : response.text;
      throw new Error('Error fetching public keys for Google certs: ' + detail);
    }
  }
}
class JwksFetcher {
  #cache;
  constructor(url, httpAgent) {
    if (!validator.isURL(url)) throw new Error('The provided JWKS URL is not a valid URL.');
    this.client = jwks({jwksUri: url, cache: false, requestAgent: httpAgent});
    this.#cache = new KeyCache(() => this.#load());
  }
  get publicKeys() {return this.#cache.keys;}
  get publicKeysExpireAt() {return this.#cache.expires;}
  shouldRefresh() {return this.#cache.stale();}
  fetchPublicKeys() {return this.#cache.read();}
  refresh() {return this.#cache.read(true);}
  async #load() {
    try {
      const keys = await this.client.getSigningKeys();
      return {keys: Object.fromEntries(keys.map(key => [key.kid, key.getPublicKey()])), lifetime: 6 * 3600000};
    } catch (failure) {throw new Error('Error fetching Json Web Keys: ' + failure.message);}
  }
}
function keyCallback(fetcher) {
  return (header, done) => {
    if (!header.kid) return done(new Error(noKid));
    if (typeof header.kid !== 'string') return done(new Error(noMatch));
    Promise.resolve().then(() => fetcher.fetchPublicKeys()).then(keys => {
      if (!keys || !Object.hasOwn(keys, header.kid)) return done(new Error(noMatch));
      done(null, keys[header.kid]);
    }, done);
  };
}
class PublicKeySignatureVerifier {
  constructor(keyFetcher) {
    if (!validator.isNonNullObject(keyFetcher)) throw new Error('The provided key fetcher is not an object or null.');
    this.keyFetcher = keyFetcher;
  }
  static withCertificateUrl(url, agent) {return new PublicKeySignatureVerifier(new UrlKeyFetcher(url, agent));}
  static withJwksUrl(url, agent) {return new PublicKeySignatureVerifier(new JwksFetcher(url, agent));}
  async verify(token) {
    if (!validator.isString(token)) throw invalidToken();
    try {await verifyJwtSignature(token, keyCallback(this.keyFetcher), {algorithms});}
    catch (failure) {
      if (failure.code !== JwtErrorCode.NO_KID_IN_HEADER) throw failure;
      await this.verifyWithoutKid(token);
    }
  }
  async verifyWithoutKid(token) {return this.verifyWithAllKeys(token, await this.keyFetcher.fetchPublicKeys());}
  async verifyWithAllKeys(token, keys) {
    for (const key of Object.values(keys)) {
      try {await verifyJwtSignature(token, key, {algorithms}); return;}
      catch (failure) {if (failure.code === JwtErrorCode.TOKEN_EXPIRED) throw failure;}
    }
    throw new JwtError(JwtErrorCode.INVALID_SIGNATURE, 'Invalid token signature.');
  }
}
class EmulatorSignatureVerifier {verify(token) {return verifyJwtSignature(token, undefined, {algorithms: ['none']});}}
function signatureError(failure) {
  if (failure.name === 'TokenExpiredError') return new JwtError(JwtErrorCode.TOKEN_EXPIRED,
    'The provided token has expired. Get a fresh token from your client app and try again.');
  if (failure.name === 'JsonWebTokenError' && failure.message?.includes(callbackPrefix)) {
    const detail = failure.message.split(callbackPrefix).pop() || 'Error fetching public keys.';
    return new JwtError(detail === noMatch ? JwtErrorCode.NO_MATCHING_KID : detail === noKid ? JwtErrorCode.NO_KID_IN_HEADER : JwtErrorCode.KEY_FETCH_ERROR, detail);
  }
  return new JwtError(JwtErrorCode.INVALID_SIGNATURE, failure.message);
}
function verifyJwtSignature(token, key, options) {
  if (!validator.isString(token)) return Promise.reject(invalidToken());
  return new Promise((resolve, reject) => jwt.verify(token, key, options, failure => failure ? reject(signatureError(failure)) : resolve()));
}
function decodeJwt(token) {
  if (!validator.isString(token)) return Promise.reject(invalidToken());
  const result = jwt.decode(token, {complete: true});
  if (!result) return Promise.reject(new JwtError(JwtErrorCode.INVALID_ARGUMENT, 'Decoding token failed.'));
  return Promise.resolve({header: result.header, payload: result.payload});
}
Object.assign(exports, {ALGORITHM_RS256, ALGORITHM_ES256, JwtError, JwtErrorCode, UrlKeyFetcher, JwksFetcher,
  PublicKeySignatureVerifier, EmulatorSignatureVerifier, verifyJwtSignature, decodeJwt});
