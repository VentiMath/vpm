'use strict';
/*!
 * vtype-is
 * Derived from type-is, Copyright(c) 2014 Jonathan Ong;
 * Copyright(c) 2014-2015 Douglas Christopher Wilson.
 * Copyright(c) 2026 VentiMath contributors. MIT Licensed.
 */

const contentType = require('vcontent-type');
const media = require('vmedia-typer');
const mime = require('vmime-types');
const TYPE_ONLY = Object.freeze({ parameters: false });
const NON_ASCII = /[^\x00-\x7f]/;
const LENGTH = /^[0-9]+(?![\s\S])/;
const PATTERN = /^(?:\*|[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/(?:\*|\*\+[A-Za-z0-9!#$&^_.+-]{0,125}|[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126})(?![\s\S])/;

function headersOf(request) {
  if (request === null || typeof request !== 'object') throw new TypeError('request must have headers');
  const headers = request.headers;
  if (headers === null || typeof headers !== 'object' || Array.isArray(headers)) {
    throw new TypeError('request must have a headers object');
  }
  return headers;
}

function own(headers, name) {
  return Object.hasOwn(headers, name) ? headers[name] : undefined;
}

function bodyIndicated(headers) {
  // Preserve the Transfer-Encoding presence contract; the HTTP server owns framing.
  if (own(headers, 'transfer-encoding') !== undefined) return true;
  const length = own(headers, 'content-length');
  return typeof length === 'string' && LENGTH.test(length);
}

function hasBody(request) {
  return bodyIndicated(headersOf(request));
}

function typeis(request) {
  const headers = headersOf(request);
  return bodyIndicated(headers) ? check(own(headers, 'content-type'), arguments, 1) : null;
}

function is(value) {
  // Retain the older .is(request, ...) overload used by some callers.
  if (value !== null && typeof value === 'object') {
    const headers = value.headers;
    value = headers !== null && typeof headers === 'object' && !Array.isArray(headers)
      ? own(headers, 'content-type') : undefined;
  }
  return check(value, arguments, 1);
}

function check(value, args, start) {
  if (typeof value !== 'string' || value.length === 0) return false;
  const parsed = contentType.parse(value, TYPE_ONLY);
  // content-type lowercases before returning. Check the original media span so
  // a Unicode character cannot become an ASCII name; parameters may contain Unicode.
  if (NON_ASCII.test(value.slice(0, parsed.index)) || !media.test(parsed.type)) return false;
  const actual = parsed.type;
  const types = args[start];
  if (types == null) return actual;
  const list = Array.isArray(types) ? types : args;
  const first = Array.isArray(types) ? 0 : start;
  if (first === list.length) return actual;
  const slash = actual.indexOf('/');
  for (let index = first; index < list.length; index++) {
    const original = list[index];
    if (matches(normalize(original), actual, slash)) {
      return original[0] === '+' || original.includes('*') ? actual : original;
    }
  }
  return false;
}

function normalize(value) {
  if (typeof value !== 'string') return false;
  switch (value.toLowerCase()) {
    case 'urlencoded': return 'application/x-www-form-urlencoded';
    case 'multipart': return 'multipart/*';
  }
  if (value[0] === '+') return '*/*' + value;
  return value.includes('/') ? value : mime.lookup(value);
}

function match(expected, actual) {
  if (typeof actual !== 'string' || actual[0] === ' ' || actual.endsWith(' ') || !media.test(actual)) return false;
  return matches(expected, actual.toLowerCase(), actual.indexOf('/'));
}

function matches(expected, actual, slash) {
  if (typeof expected !== 'string' || !PATTERN.test(expected)) return false;
  expected = expected.toLowerCase();
  const split = expected.indexOf('/');
  if (!(split === 1 && expected[0] === '*') && expected.slice(0, split) !== actual.slice(0, slash)) return false;
  const subtype = expected.slice(split + 1);
  if (subtype === '*') return true;
  if (subtype.startsWith('*+')) return actual.endsWith(subtype.slice(1)) && actual.length - slash - 1 >= subtype.length - 1;
  return subtype === actual.slice(slash + 1);
}

module.exports = typeis;
module.exports.is = is;
module.exports.hasBody = hasBody;
module.exports.normalize = normalize;
module.exports.match = match;
Object.freeze(module.exports);
