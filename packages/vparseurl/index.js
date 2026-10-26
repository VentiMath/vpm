'use strict';

// Derived from parseurl 1.3.3, Copyright (c) 2014 Jonathan Ong and
// Copyright (c) 2014-2017 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.

const { parse, Url } = require('node:url');
const current = new WeakMap();
const original = new WeakMap();
// Preserve parseurl's exact fast-path boundary, including its whitespace rules.
const needsFullParse = /[\t\n\f\r #\u00a0\ufeff]/;

module.exports = parseurl;
module.exports.original = originalurl;
module.exports.clear = clear;

function parseurl(request) {
  const raw = request.url;
  if (raw === undefined) {
    current.delete(request);
    return undefined;
  }
  return cached(request, raw, current);
}

function originalurl(request) {
  const raw = request.originalUrl;
  if (typeof raw !== 'string') {
    original.delete(request);
    return parseurl(request);
  }
  return cached(request, raw, original);
}

function clear(request) {
  current.delete(request);
  original.delete(request);
}

function cached(request, raw, cache) {
  if (typeof raw !== 'string') throw new TypeError('request.url must be a string or undefined');
  const entry = cache.get(request);
  if (entry && entry.raw === raw) return entry.parsed;

  const parsed = fastparse(raw);
  // Retained for callers inspecting the original input; never used as a cache key.
  parsed._raw = raw;
  cache.set(request, { raw, parsed });
  return parsed;
}

function fastparse(raw) {
  if (raw.charCodeAt(0) !== 47 || needsFullParse.test(raw)) return parse(raw);

  const parsed = new Url();
  const question = raw.indexOf('?');
  parsed.path = raw;
  parsed.href = raw;
  parsed.pathname = question === -1 ? raw : raw.slice(0, question);
  if (question !== -1) {
    parsed.query = raw.slice(question + 1);
    parsed.search = raw.slice(question);
  }
  return parsed;
}
