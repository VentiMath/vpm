'use strict';
// Adapted from gaxios 8.3.2. Copyright Google LLC; Apache-2.0.
const extend = require('vextend');
const {headersFrom} = require('./transport');
const {pkg} = require('./util');
const GAXIOS_ERROR_SYMBOL = Symbol.for('gaxios-gaxios-error');
function snapshotValue(value) {
  if (value instanceof Headers) return headersFrom(value);
  if (value instanceof URL) return new URL(value);
  if (value instanceof URLSearchParams) return new URLSearchParams(value);
  if (value instanceof FormData) {const result = new FormData(); for (const [key, entry] of value) result.append(key, entry); return result;}
  if (Array.isArray(value)) return extend(true, [], value);
  if (value && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) return extend(true, {}, value);
  return value;
}
function snapshotOptions(options = {}) {
  const result = extend(true, {}, options);
  // extend already copies arrays and plain objects; copy only the mutable Web values again.
  for (const key of ['headers','url','data','body']) {
    const value = options[key];
    if (value !== undefined && (value instanceof Headers || value instanceof URL || value instanceof URLSearchParams || value instanceof FormData)) result[key] = snapshotValue(value);
  }
  return result;
}
function snapshotResponse(response) {
  let copy;
  if (response instanceof Response) {
    copy = new Response(null, {status: response.status, statusText: response.statusText, headers: headersFrom(response.headers)});
    for (const key of ['url','redirected','type','bodyUsed']) Object.defineProperty(copy, key, {value: response[key], configurable: true});
  } else copy = extend(true, {}, response);
  copy.config = snapshotOptions(response.config);
  if (!(copy instanceof Response)) copy.headers = snapshotValue(response.headers);
  if (Object.hasOwn(response, 'data')) copy.data = snapshotValue(response.data);
  return copy;
}
class GaxiosError extends Error {
  static [Symbol.hasInstance](instance) {
    return !!instance && typeof instance === 'object' && instance[GAXIOS_ERROR_SYMBOL] === pkg.version || Function.prototype[Symbol.hasInstance].call(this, instance);
  }
  constructor(message, config = {}, response, cause) {
    super(message, {cause});
    this[GAXIOS_ERROR_SYMBOL] = pkg.version;
    this.config = snapshotOptions(config);
    this.response = response ? snapshotResponse(response) : undefined;
    if (this.response?.data instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(this.response.data);
      try {this.response.data = JSON.parse(text);} catch {this.response.data = text;}
    }
    this.error = cause instanceof Error ? cause : undefined;
    if (response) this.status = response.status;
    if (cause instanceof DOMException) this.code = cause.name;
    else if (cause && (typeof cause.code === 'string' || typeof cause.code === 'number')) this.code = cause.code;
    else if (typeof cause?.cause?.code === 'string') this.code = cause.cause.code;
  }
  static extractAPIErrorFromResponse(response, fallback = 'The request failed') {
    const data = response.data, error = data && typeof data === 'object' && Object.hasOwn(data, 'error') ? data.error : undefined;
    let message = typeof data === 'string' ? data : fallback;
    if (typeof error === 'string') return {message: error, code: response.status, status: response.statusText};
    if (error && typeof error === 'object') {
      if (typeof error.message === 'string') message = error.message;
      const messages = Array.isArray(error.errors) ? error.errors.filter(e => e && typeof e.message === 'string').map(e => e.message) : [];
      return {...snapshotValue(error), message: messages.join('\n') || message, code: typeof error.code === 'number' ? error.code : response.status, status: typeof error.status === 'string' ? error.status : response.statusText};
    }
    return {message, code: response.status, status: response.statusText};
  }
}
const REDACT = '<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.';
function defaultErrorRedactor(value) {
  const sensitive = key => /^(?:authentication|authorization|proxy-authorization|cookie|set-cookie)$/i.test(key) || /secret/i.test(key);
  function redactHeaders(headers) {
    if (!headers) return;
    if (typeof headers.forEach === 'function' && typeof headers.set === 'function') headers.forEach((_, key) => {if (sensitive(key)) headers.set(key, REDACT);});
    else for (const key of Object.keys(headers)) if (sensitive(key)) headers[key] = REDACT;
  }
  function redactBody(owner, key) {
    const body = owner[key];
    if (typeof body === 'string') {if (/grant_type=|assertion=|secret/i.test(body)) owner[key] = REDACT;}
    else if (body instanceof URLSearchParams || body instanceof FormData) {
      for (const name of new Set(body.keys())) if (['grant_type','assertion'].includes(name) || /secret/i.test(name)) body.set(name, REDACT);
    } else if (body && typeof body === 'object') for (const name of ['grant_type','assertion','client_secret']) if (Object.hasOwn(body, name)) body[name] = REDACT;
  }
  if (value.config) {
    const config = value.config;
    redactHeaders(config.headers); redactBody(config, 'data'); redactBody(config, 'body');
    try {const url = new URL(config.url); for (const name of ['token','client_secret']) if (url.searchParams.has(name)) url.searchParams.set(name, REDACT); config.url = config.url instanceof URL ? url : url.toString();} catch {}
  }
  if (value.response) {defaultErrorRedactor({config: value.response.config}); redactHeaders(value.response.headers); redactBody(value.response, 'data');}
  return value;
}
exports.GAXIOS_ERROR_SYMBOL = GAXIOS_ERROR_SYMBOL;
exports.GaxiosError = GaxiosError;
exports.defaultErrorRedactor = defaultErrorRedactor;
exports.snapshotOptions = snapshotOptions;
