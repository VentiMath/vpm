'use strict';
const { validateHeaderName, validateHeaderValue } = require('node:http');
const { ArgumentError } = require('./errors');
const own = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;
function options(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ArgumentError('An options object must be provided');
  const result = {};
  for (const key of ['jwksUri', 'fetcher', 'getKeysInterceptor', 'requestAgent', 'proxy', 'handleSigningKeyError', 'onStaleCacheFallback']) result[key] = own(input, key);
  for (const key of ['fetcher', 'getKeysInterceptor', 'handleSigningKeyError', 'onStaleCacheFallback']) if (result[key] !== undefined && typeof result[key] !== 'function') throw new ArgumentError(key + ' must be a function');
  if (result.proxy !== undefined) throw new ArgumentError('Use requestAgent for proxy support');
  if (result.jwksUri !== undefined) {
    if (typeof result.jwksUri !== 'string') throw new ArgumentError('jwksUri must be a string');
    let url;
    try { url = new URL(result.jwksUri); } catch { throw new ArgumentError('Invalid JWKS URI: The provided URI is not a valid URL.'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new ArgumentError('JWKS URI must use HTTP(S) without credentials or a fragment');
  } else if (!result.fetcher) throw new ArgumentError('No JWKS provided. Please provide a jwksUri or fetcher');
  for (const [key, fallback] of [['cache', true], ['rateLimit', false]]) {
    const value = own(input, key);
    if (value !== undefined && typeof value !== 'boolean') throw new ArgumentError(key + ' must be a boolean');
    result[key] = value === undefined ? fallback : value;
  }
  for (const [key, fallback, min, max] of [
    ['cacheMaxEntries', 5, 0, 1000000], ['cacheMaxAge', 600000, 0, Number.MAX_SAFE_INTEGER],
    ['cacheMaxAgeFallback', 0, 0, Number.MAX_SAFE_INTEGER],
    ['timeout', 30000, 0, 2147483647], ['jwksRequestsPerMinute', 10, 1, 1000000],
    ['maxResponseBytes', 1048576, 1, 2147483647], ['maxKeys', 100, 1, 1000000],
  ]) {
    const value = own(input, key);
    result[key] = value === undefined ? fallback : value;
    if (!Number.isSafeInteger(result[key]) || result[key] < min || result[key] > max) throw new ArgumentError(key + ' must be a safe integer between ' + min + ' and ' + max);
  }
  if (!Number.isSafeInteger(result.cacheMaxAge + result.cacheMaxAgeFallback)) throw new ArgumentError('Combined cache lifetime must be a safe integer');
  const headers = own(input, 'requestHeaders');
  if (headers !== undefined) {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) throw new ArgumentError('requestHeaders must be an object');
    const copy = Object.create(null);
    for (const key of Object.keys(headers)) {
      const value = headers[key];
      if (typeof value !== 'string') throw new ArgumentError('requestHeaders values must be strings');
      validateHeaderName(key); validateHeaderValue(key, value); copy[key] = value;
    }
    result.requestHeaders = Object.freeze(copy);
  }
  return Object.freeze(result);
}
module.exports = { options, own };
