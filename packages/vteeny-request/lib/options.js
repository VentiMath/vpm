'use strict';
const {validateHeaderName, validateHeaderValue} = require('node:http');
const querystring = require('node:querystring');
function cloneHeaders(input) {
  const result = {};
  if (input == null) return result;
  if (typeof input !== 'object') throw new TypeError('headers must be an object or header pairs');
  const entries = Array.isArray(input) ? input : typeof input.entries === 'function' ? input.entries() : Object.entries(input);
  for (const [name, original] of entries) {
    if (original === undefined) continue;
    let value = Array.isArray(original) ? original.map(String) : String(original);
    try {validateHeaderName(name); for (const part of Array.isArray(value) ? value : [value]) validateHeaderValue(name, part);}
    catch {throw new TypeError('Invalid request header');}
    if (Object.hasOwn(result, name)) value = String(result[name]) + ', ' + String(value);
    Object.defineProperty(result, name, {value, writable: true, configurable: true, enumerable: true});
  }
  return result;
}
function setHeader(headers, name, value) {for (const key of Object.keys(headers)) if (key.toLowerCase() === name.toLowerCase()) delete headers[key]; headers[name] = value;}
function snapshot(value, seen = new Map()) {
  if (ArrayBuffer.isView(value)) return Buffer.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  if (!value || typeof value !== 'object' || !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return value;
  if (seen.has(value)) return seen.get(value);
  const out = Array.isArray(value) ? [] : {}; seen.set(value, out);
  for (const key of Object.keys(value)) Object.defineProperty(out, key, {value: snapshot(value[key], seen), enumerable: true, writable: true, configurable: true});
  return out;
}
function normalize(input, callback) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Request options must be an object');
  if (callback !== undefined && typeof callback !== 'function') throw new TypeError('Callback must be a function');
  const options = {...input}, value = options.uri || options.url;
  if (!value) throw new TypeError('Missing uri or url in reqOpts.');
  let url; try {url = new URL(value);} catch {throw new TypeError('Request URL must be absolute HTTP or HTTPS');}
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new TypeError('Request URL must use HTTP or HTTPS without credentials');
  url.hash = '';
  if (options.useQuerystring === true || options.qs && typeof options.qs === 'object') {
    const query = querystring.stringify(options.qs); if (query) url.search += (url.search ? '&' : '?') + query;
  }
  const headers = cloneHeaders(options.headers), timeout = options.timeout ?? 0, size = options.maxResponseSize ?? 0;
  if (!Number.isInteger(timeout) || timeout < 0 || timeout > 2147483647) throw new RangeError('timeout must be an integer from 0 to 2147483647');
  if (!Number.isSafeInteger(size) || size < 0) throw new RangeError('maxResponseSize must be a nonnegative safe integer');
  if (options.pool != null && (typeof options.pool !== 'object' || Array.isArray(options.pool))) throw new TypeError('pool must be an object');
  if (options.proxy != null && options.proxy !== false && typeof options.proxy !== 'string') throw new TypeError('proxy must be a URL string or false');
  if (options.signal != null && (typeof options.signal.aborted !== 'boolean' || typeof options.signal.addEventListener !== 'function' || typeof options.signal.removeEventListener !== 'function')) throw new TypeError('signal must be an AbortSignal');
  let body;
  if (typeof options.json === 'object') {body = JSON.stringify(options.json); setHeader(headers, 'Content-Type', 'application/json');}
  else if (typeof options.body === 'string' || typeof options.body?.pipe === 'function') body = options.body;
  else if (ArrayBuffer.isView(options.body)) body = Buffer.from(new Uint8Array(options.body.buffer, options.body.byteOffset, options.body.byteLength));
  else if (options.body instanceof ArrayBuffer) body = Buffer.from(new Uint8Array(options.body));
  else body = JSON.stringify(options.body);
  return {url: url.href, headers, body, timeout, size, options: {...options, pool: snapshot(options.pool)}};
}
module.exports = {normalize, cloneHeaders, setHeader, snapshot};
