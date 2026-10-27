'use strict';
/*!
 * vnegotiator
 * Derived from negotiator, Copyright 2012-2014 Federico Romero and Isaac Z. Schlueter;
 * Copyright 2014-2015 Douglas Christopher Wilson; Copyright 2026 Blake Embrey.
 * Modifications Copyright 2026 VentiMath contributors. MIT Licensed.
 */
const contentType = require('vcontent-type');
// Strict end assertions reject final newlines, unlike JavaScript's $ anchor.
const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+(?![\s\S])/;
const MEDIA = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)\/([!#$%&'*+.^_`|~0-9A-Za-z-]+)(?![\s\S])/;
const LANGUAGE = /^(?:\*|[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*)(?![\s\S])/;
const QUALITY = /^(?:0(?:\.[0-9]{0,3})?|1(?:\.0{0,3})?)(?![\s\S])/;
const EMPTY_PARAMETERS = Object.freeze(Object.create(null));
const EMPTY_KEYS = Object.freeze([]);
const fields = { mediaType: 'accept', charset: 'accept-charset', encoding: 'accept-encoding', language: 'accept-language' };

function Negotiator(request) {
  if (!(this instanceof Negotiator)) return new Negotiator(request);
  headersOf(request);
  this.request = request;
}

function headersOf(request) {
  if (request === null || typeof request !== 'object') throw new TypeError('request must have headers');
  const headers = request.headers;
  if (headers === null || typeof headers !== 'object' || Array.isArray(headers)) throw new TypeError('request must have a headers object');
  return headers;
}

function header(request, name) {
  const headers = headersOf(request);
  if (!Object.hasOwn(headers, name)) return undefined;
  const value = headers[name];
  if (value === undefined || typeof value === 'string') return value;
  if (Array.isArray(value) && value.every(part => typeof part === 'string')) return value.join(',');
  return ''; // Invalid supplied values cannot become permissive absent headers.
}

function quality(parameters) {
  if (!Object.hasOwn(parameters, 'q')) return 1;
  const value = parameters.q;
  return QUALITY.test(value) ? Number(value) : 0;
}

function record(value, parameters, kind, order, weighted) {
  let type, subtype, prefix;
  if (kind === 'mediaType') {
    const match = MEDIA.exec(value);
    if (!match || (match[1] === '*' && match[2] !== '*')) return null;
    type = match[1].toLowerCase();
    subtype = match[2].toLowerCase();
  } else {
    if (!(kind === 'language' ? LANGUAGE : TOKEN).test(value)) return null;
    if (kind === 'language') {
      const hyphen = value.indexOf('-');
      prefix = (hyphen === -1 ? value : value.slice(0, hyphen)).toLowerCase();
    }
  }
  const keys = kind === 'mediaType' && parameters !== EMPTY_PARAMETERS ? Object.keys(parameters).filter(key => key !== 'q') : EMPTY_KEYS;
  for (const key of keys) if (!TOKEN.test(key)) return null;
  return { value, lower: value.toLowerCase(), type, subtype, prefix, parameters, keys,
    q: weighted ? quality(parameters) : 1, o: order, s: 0, p: 0 };
}

function parseHeader(value, kind) {
  if (value === undefined) value = kind === 'mediaType' ? '*/*' : kind === 'encoding' ? '' : '*';
  const accepted = [];
  let index = 0, order = 0;
  while (index < value.length) {
    while (value.charCodeAt(index) === 32 || value.charCodeAt(index) === 9) index++;
    const parsed = contentType.parse(value, { comma: true, start: index });
    // Preserve spelling for list results, and validate before Unicode folding.
    const original = value.slice(index, index + parsed.type.length);
    const entry = record(original, parsed.parameters, kind, order++, true);
    if (entry) accepted.push(entry);
    index = parsed.index + 1;
  }
  if (kind === 'encoding') {
    let identity = false, minimum = 1;
    for (const entry of accepted) {
      if (entry.lower === 'identity' || entry.lower === '*') identity = true;
      if (entry.q > 0) minimum = Math.min(minimum, entry.q);
    }
    if (!identity) accepted.push({ value: 'identity', lower: 'identity', q: minimum, o: order, s: 0, p: 0 });
  }
  return accepted;
}

function offered(value, kind) {
  if (typeof value !== 'string') return null;
  // Bare offered tokens need no parameter parser or parameter-map allocation.
  if (kind !== 'mediaType') return record(value, EMPTY_PARAMETERS, kind, 0, false);
  if (!value.includes(';')) {
    let start = 0, end = value.length;
    while (value.charCodeAt(start) === 32 || value.charCodeAt(start) === 9) start++;
    while (end > start && (value.charCodeAt(end - 1) === 32 || value.charCodeAt(end - 1) === 9)) end--;
    return record(value.slice(start, end), EMPTY_PARAMETERS, kind, 0, false);
  }
  const parsed = contentType.parse(value);
  let start = 0;
  while (value.charCodeAt(start) === 32 || value.charCodeAt(start) === 9) start++;
  return record(value.slice(start, start + parsed.type.length), parsed.parameters, kind, 0, false);
}

function specificity(candidate, range, kind) {
  if (kind === 'mediaType') {
    if (range.type !== '*' && range.type !== candidate.type) return -1;
    if (range.subtype !== '*' && range.subtype !== candidate.subtype) return -1;
    for (const key of range.keys) {
      if (!Object.hasOwn(candidate.parameters, key)) return -1;
      const actual = candidate.parameters[key], expected = range.parameters[key];
      // Charset labels ignore ASCII case. Other parameter values can be case-sensitive.
      if (key === 'charset' ? actual.toLowerCase() !== expected.toLowerCase() : actual !== expected) return -1;
    }
    return (range.type === '*' ? 0 : 4) + (range.subtype === '*' ? 0 : 2);
  }
  if (range.lower === candidate.lower) return kind === 'language' ? 4 : 1;
  // Retain negotiator's established language fallback priorities, including
  // offering a base language when the client requests a regional variant.
  if (kind === 'language') {
    if (range.prefix === candidate.lower) return 2;
    if (range.lower === candidate.prefix) return 1;
  }
  return range.lower === '*' ? 0 : -1;
}

function compare(a, b) {
  return b.q - a.q || b.s - a.s || b.p - a.p || a.o - b.o || a.i - b.i;
}

function preferences(options, kind) {
  if (kind !== 'encoding' || options == null) return null;
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('encoding options must be an object');
  const preferred = options.preferred;
  if (preferred == null) return null;
  if (!Array.isArray(preferred) || preferred.some(value => typeof value !== 'string')) throw new TypeError('preferred encodings must be a string array');
  const ranks = new Map();
  for (const value of preferred) if (!ranks.has(value.toLowerCase())) ranks.set(value.toLowerCase(), ranks.size);
  return ranks;
}

function negotiate(request, kind, available, options, firstOnly) {
  if (available != null && !Array.isArray(available)) throw new TypeError('available values must be an array');
  const ranks = preferences(options, kind);
  const value = header(request, fields[kind]);
  // With an absent header every valid offer has equal priority. Singular calls
  // can stop at the first valid offer without parsing a synthetic wildcard.
  if (value === undefined && kind !== 'encoding' && available != null) {
    const result = [];
    for (const value of available) {
      if (!offered(value, kind)) continue;
      result.push(value);
      if (firstOnly) break;
    }
    return result;
  }
  const accepted = parseHeader(value, kind);
  let selected;
  if (available == null) selected = accepted.filter(entry => entry.q > 0);
  else {
    selected = [];
    for (let i = 0; i < available.length; i++) {
      // Parse each offered value once, outside the accepted-range loop.
      const value = available[i], candidate = offered(value, kind);
      if (!candidate) continue;
      let best = null, score = -1, count = 0;
      for (const range of accepted) {
        const s = specificity(candidate, range, kind);
        if (s === -1) continue;
        const p = kind === 'mediaType' ? range.keys.length : 0;
        if (best === null || s > score || (s === score && (p > count || (p === count && range.q > best.q)))) {
          best = range; score = s; count = p;
        }
      }
      if (best && best.q > 0) selected.push({ value, lower: candidate.lower, q: best.q, s: score, p: count, o: best.o, i });
    }
  }
  selected.sort(ranks ? (a, b) => b.q - a.q ||
    (ranks.get(a.lower) ?? Infinity) - (ranks.get(b.lower) ?? Infinity) || compare(a, b) : compare);
  return selected.map(entry => entry.value);
}

for (const kind of Object.keys(fields)) {
  const plural = kind + 's';
  const one = function (available, options) { return negotiate(this.request, kind, available, options, true)[0]; };
  const many = function (available, options) { return negotiate(this.request, kind, available, options); };
  Negotiator.prototype[kind] = one;
  Negotiator.prototype[plural] = many;
  const legacy = 'preferred' + kind[0].toUpperCase() + kind.slice(1);
  Negotiator.prototype[legacy] = one;
  Negotiator.prototype[legacy + 's'] = many;
}
Object.freeze(Negotiator.prototype);
module.exports = Negotiator;
module.exports.Negotiator = Negotiator;
Object.freeze(module.exports);
