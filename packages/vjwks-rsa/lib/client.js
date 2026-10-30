'use strict';
const debug = require('vdebug')('jwks');
const { options, own } = require('./options');
const { JwksError } = require('./errors');
const { request, deadline, isEndpointUnavailable } = require('./request');
const { Cache, RateLimit } = require('./state');
const { retrieveSigningKeys, keyArray, validateKid, select } = require('./keys');
function asError(error) { return error instanceof Error ? error : new JwksError('JWKS operation failed'); }
class JwksClient {
  #options;
  #cache;
  #limit;
  #loading;
  constructor(input) {
    const opts = this.#options = options(input);
    Object.defineProperty(this, 'options', { value: opts, enumerable:true });
    this.#cache = opts.cache && opts.cacheMaxEntries && opts.cacheMaxAge ? new Cache(opts.cacheMaxEntries, opts.cacheMaxAge, undefined, opts.cacheMaxAgeFallback) : null;
    this.#limit = opts.rateLimit ? new RateLimit(opts.jwksRequestsPerMinute) : null;
    this.getSigningKey = this.getSigningKey.bind(this);
  }
  async getKeys() {
    this.#limit?.take();
    const opts = this.#options;
    debug('Fetching JWKS');
    const document = await request({ uri:opts.jwksUri, headers:opts.requestHeaders, agent:opts.requestAgent, timeout:opts.timeout, maxResponseBytes:opts.maxResponseBytes, fetcher:opts.fetcher });
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new JwksError('The JWKS endpoint must return an object with a keys array');
    return keyArray(own(document, 'keys'), opts.maxKeys).slice();
  }
  async getSigningKeys() {
    if (!this.#loading) {
      this.#loading = this.getKeys().then(keys => {
        if (!keys.length) throw new JwksError('The JWKS endpoint did not contain any keys');
        const signing = retrieveSigningKeys(keys, this.#options.maxKeys);
        if (!signing.length) throw new JwksError('The JWKS endpoint did not contain any signing keys');
        return signing;
      }).finally(() => { this.#loading = null; });
    }
    return (await this.#loading).slice();
  }
  async #lookup(kid) {
    validateKid(kid);
    const id = kid ?? null;
    const hit = this.#cache?.get(id);
    if (hit) return hit;
    const opts = this.#options;
    let key;
    if (opts.getKeysInterceptor) {
      const intercepted = await deadline(() => opts.getKeysInterceptor(), opts.timeout);
      if (intercepted != null) key = select(retrieveSigningKeys(intercepted, opts.maxKeys), kid, true);
    }
    if (!key) {
      try { key = select(await this.getSigningKeys(), kid); }
      catch (error) {
        if (opts.cacheMaxAgeFallback && isEndpointUnavailable(error)) {
          const stale = this.#cache?.get(id, true);
          if (stale) {
            // Never reinsert a stale key: that would restart its lifetime.
            await opts.onStaleCacheFallback?.(error, kid, stale);
            return stale;
          }
        } else {
          // A successful refresh without this key, invalid document, or local
          // policy failure must not leave an old key eligible for resurrection.
          this.#cache?.delete(id);
        }
        throw error;
      }
    }
    this.#cache?.set(id, key);
    return key;
  }
  getSigningKey(kid, callback) {
    if (callback !== undefined && typeof callback !== 'function') throw new TypeError('callback must be a function');
    const promise = this.#lookup(kid);
    if (callback === undefined) return promise;
    promise.then(value => process.nextTick(callback, null, value), error => process.nextTick(callback, asError(error)));
  }
}
module.exports = { JwksClient, asError };
