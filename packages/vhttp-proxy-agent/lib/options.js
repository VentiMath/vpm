'use strict';
const net = require('node:net');
const {validateHeaderName, validateHeaderValue} = require('node:http');
function snapshot(value, seen) {
  if (ArrayBuffer.isView(value)) return Buffer.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  if (value && typeof value === 'object' && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    seen ||= new Map();
    if (seen.has(value)) return seen.get(value);
    const result = Array.isArray(value) ? [] : Object.create(null); seen.set(value, result);
    for (const key of Object.keys(value)) Object.defineProperty(result, key, {value: snapshot(value[key], seen), enumerable: true});
    return Object.freeze(result);
  }
  return value;
}
function headers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Proxy headers must be an object');
  const result = Object.create(null);
  for (const name of Object.keys(input)) {
    const original = input[name]; if (original === undefined) continue;
    const lower = name.toLowerCase();
    if (Object.hasOwn(result, lower)) throw new TypeError('Duplicate proxy header name');
    if (['host', 'content-length', 'transfer-encoding', 'trailer'].includes(lower)) throw new TypeError('Proxy headers cannot override request authority or body framing');
    const value = Array.isArray(original) ? Object.freeze(original.map(String)) : String(original);
    try {validateHeaderName(name); for (const part of Array.isArray(value) ? value : [value]) validateHeaderValue(name, part);}
    catch {throw new TypeError('Invalid proxy header');}
    result[lower] = Object.freeze({name, value});
  }
  return Object.freeze(result);
}
function target(request, options) {
  if (options.secureEndpoint || options.protocol && options.protocol !== 'http:') throw new TypeError('HTTP destinations are required; use vhttps-proxy-agent for HTTPS destinations');
  const path = request.path;
  if (typeof path !== 'string' || /[\x00-\x20\x7f]/.test(path)) throw new TypeError('Invalid proxy request path');
  if (!path.startsWith('/')) {
    let parsed;
    try {parsed = new URL(path);} catch {throw new TypeError('Proxy request path must be an absolute HTTP URL or begin with /');}
    if (parsed.protocol !== 'http:' || parsed.username || parsed.password) throw new TypeError('Absolute proxy targets must use HTTP without credentials');
    parsed.hash = ''; return parsed.href;
  }
  let host = options.hostname ?? options.host;
  if (typeof host !== 'string' || !host) throw new TypeError('Proxy destination host is required');
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (net.isIP(host) === 6) host = '[' + host + ']';
  else if (!/^[A-Za-z0-9_.-]+$/.test(host)) throw new TypeError('Invalid proxy destination host');
  const port = typeof options.port === 'string' && /^\d+$/.test(options.port) ? Number(options.port) : options.port ?? 80;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Destination port must be from 1 to 65535');
  const fragment = path.indexOf('#');
  // Origin-form paths beginning // still belong to this authority. Preserve dots and escapes.
  return 'http://' + host + (port === 80 ? '' : ':' + port) + (fragment < 0 ? path : path.slice(0, fragment));
}
module.exports = {snapshot, headers, target};
