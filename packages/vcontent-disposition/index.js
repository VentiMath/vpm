'use strict';
/*!
 * vcontent-disposition
 * Derived from content-disposition, Copyright(c) 2014-2017 Douglas Christopher Wilson.
 * Copyright(c) 2026 VentiMath contributors. MIT Licensed.
 */

const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const ASCII = /^[\x20-\x7e]*$/;
const TEXT = /^[\x20-\x7e\x80-\xff]*$/;
const ESCAPED = /%[0-9a-f]{2}/i;
const URI_SAFE = /^[A-Za-z0-9!~._-]*$/;
const EXTRA_ESCAPES = { "'": '%27', '(': '%28', ')': '%29', '*': '%2A' };

function object(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(label + ' must be an object');
  }
}
function modes(options) {
  if (options == null) return 0;
  object(options, 'options');
  const { multipart, extended } = options;
  if (multipart !== undefined && typeof multipart !== 'boolean') throw new TypeError('multipart must be a boolean');
  if (extended !== undefined && typeof extended !== 'boolean') throw new TypeError('extended must be a boolean');
  return (multipart === true ? 1 : 0) | (extended === false ? 2 : 0);
}
function string(value) {
  if (typeof value !== 'string') throw new TypeError('value must be a string');
}

function create(filename, options) {
  if (filename !== undefined) string(filename);
  let type = 'attachment';
  let fallback = true;
  if (options != null) {
    object(options, 'options');
    const { type: requestedType, fallback: requestedFallback } = options;
    if (requestedType !== undefined) type = requestedType;
    if (requestedFallback !== undefined) fallback = requestedFallback;
  }
  if (typeof type !== 'string' || !TOKEN.test(type)) throw new TypeError('invalid disposition type');
  if (typeof fallback !== 'boolean' && typeof fallback !== 'string') throw new TypeError('fallback must be a boolean or string');
  if (typeof fallback === 'string' && !ASCII.test(fallback)) throw new TypeError('fallback must be printable US-ASCII');
  if (filename === undefined) return type;
  if (typeof fallback === 'string') {
    const result = type + '; filename=' + parameter(fallback);
    return fallback === filename ? result : result + '; filename*=' + encodeExtended(filename);
  }
  if (ASCII.test(filename) && !ESCAPED.test(filename)) return type + '; filename=' + parameter(filename);
  const encoded = encodeExtended(filename);
  if (fallback === false) return type + '; filename*=' + encoded;
  return type + '; filename=' + parameter(filename.replace(/[^\x20-\x7e]/g, '?')) + '; filename*=' + encoded;
}

function parse(header, options) {
  string(header);
  const mode = modes(options);
  const length = header.length;
  let index = skipOWS(header, 0, length);
  const typeStart = index;
  index = endValue(header, index, length);
  const type = header.slice(typeStart, trimOWS(header, typeStart, index)).toLowerCase();
  // No mutable prototype is shared between results.
  const parameters = Object.create(null);
  parameterLoop: while (index < length) {
    index = skipOWS(header, index + 1, length);
    const keyStart = index;
    while (index < length) {
      const code = header.charCodeAt(index);
      if (code === 59) continue parameterLoop;
      if (code !== 61) { index++; continue; }
      const key = header.slice(keyStart, trimOWS(header, keyStart, index)).toLowerCase();
      const keep = parameters[key] === undefined;
      index = skipOWS(header, index + 1, length);
      if (header.charCodeAt(index) === 34) {
        const start = ++index;
        const firstQuote = header.indexOf('"', start);
        if (firstQuote === -1) break parameterLoop;
        let escaped = false;
        if ((mode & 1) || !header.slice(start, firstQuote).includes('\\')) index = firstQuote;
        else {
          escaped = true;
          while (index < length && header.charCodeAt(index) !== 34) {
            if (header.charCodeAt(index) === 92 && index + 1 < length) index += 2;
            else index++;
          }
        }
        if (index === length) break parameterLoop;
        if (keep) {
          const value = header.slice(start, index);
          parameters[key] = mode & 1 ? unescapeMultipart(value)
            : escaped ? unescapeQuoted(header, start, index) : value;
        }
        index = endValue(header, index + 1, length);
      } else {
        const start = index;
        index = endValue(header, index, length);
        if (keep) {
          const value = header.slice(start, trimOWS(header, start, index));
          parameters[key] = value;
          if (!(mode & 2) && key.endsWith('*')) {
            const decoded = decodeExtended(value);
            if (decoded !== undefined) parameters[key.slice(0, -1)] = decoded;
          }
        }
      }
      continue parameterLoop;
    }
  }
  return { type, parameters };
}

function format(disposition, options) {
  object(disposition, 'disposition');
  const { type, parameters } = disposition;
  const mode = modes(options);
  if (typeof type !== 'string' || !TOKEN.test(type)) throw new TypeError('invalid disposition type');
  if (parameters == null) return type;
  object(parameters, 'parameters');
  const keys = Object.keys(parameters);
  // Snapshot each own value once. Case-insensitive names govern both duplicate
  // detection and precedence of an explicitly supplied extended parameter.
  let values;
  let names;
  if (keys.length > 1) {
    values = new Array(keys.length);
    names = new Set();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!TOKEN.test(key)) throw new TypeError('invalid parameter name');
      const normalized = key.toLowerCase();
      if (names.has(normalized)) throw new TypeError('duplicate parameter name');
      names.add(normalized);
      const value = parameters[key];
      string(value);
      values[i] = value;
    }
  }
  let result = type;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = values ? values[i] : parameters[key];
    if (!values) {
      if (!TOKEN.test(key)) throw new TypeError('invalid parameter name');
      string(value);
    }
    if (mode & 1) result += '; ' + key + '="' + value.replace(/[\n\r"]/g, encodeMultipart) + '"';
    else if (TOKEN.test(value)) result += '; ' + key + '=' + value;
    else if (TEXT.test(value)) result += '; ' + key + '=' + quote(value);
    else {
      if (mode & 2) throw new TypeError('invalid parameter value');
      if (key.endsWith('*')) throw new TypeError('extended parameter must already be encoded');
      if (names?.has(key.toLowerCase() + '*')) continue;
      result += '; ' + key + '*=' + encodeExtended(value);
    }
  }
  return result;
}

function encodeExtended(value) {
  string(value);
  if (URI_SAFE.test(value)) return "UTF-8''" + value;
  return "UTF-8''" + encodeURIComponent(value).replace(/['()*]/g, char => EXTRA_ESCAPES[char]);
}
function decodeExtended(value) {
  string(value);
  const charsetEnd = value.indexOf("'");
  if (charsetEnd <= 0) return undefined;
  const languageEnd = value.indexOf("'", charsetEnd + 1);
  if (languageEnd === -1) return undefined;
  const charset = value.slice(0, charsetEnd).toLowerCase();
  const encoded = value.slice(languageEnd + 1);
  if (charset === 'utf-8' || charset === 'utf8') {
    try { return decodeURIComponent(encoded); } catch { return undefined; }
  }
  if (charset !== 'iso-8859-1') return undefined;
  let start = 0;
  let index = encoded.indexOf('%');
  if (index === -1) return encoded;
  let result = '';
  while (index !== -1) {
    const high = hex(encoded.charCodeAt(index + 1));
    const low = hex(encoded.charCodeAt(index + 2));
    if (high < 0 || low < 0) return undefined;
    result += encoded.slice(start, index) + String.fromCharCode(high * 16 + low);
    start = index + 3;
    index = encoded.indexOf('%', start);
  }
  return result + encoded.slice(start);
}
function hex(code) {
  if (code >= 48 && code <= 57) return code - 48;
  code |= 32;
  return code >= 97 && code <= 102 ? code - 87 : -1;
}
function endValue(header, start, length) {
  const end = header.indexOf(';', start);
  return end === -1 ? length : end;
}
function skipOWS(header, index, length) {
  while (index < length && (header.charCodeAt(index) === 32 || header.charCodeAt(index) === 9)) index++;
  return index;
}
function trimOWS(header, start, end) {
  while (end > start && (header.charCodeAt(end - 1) === 32 || header.charCodeAt(end - 1) === 9)) end--;
  return end;
}
function unescapeQuoted(header, start, end) {
  let result = '';
  for (let index = start; index < end; index++) {
    if (header.charCodeAt(index) === 92) {
      result += header.slice(start, index);
      start = ++index;
    }
  }
  return result + header.slice(start, end);
}
function quote(value) { return '"' + value.replace(/[\\"]/g, '\\$&') + '"'; }
function parameter(value) { return TOKEN.test(value) ? value : quote(value); }
function encodeMultipart(char) { return char === '\n' ? '%0A' : char === '\r' ? '%0D' : '%22'; }
function unescapeMultipart(value) {
  let start = 0;
  let result = '';
  for (let index = value.indexOf('%'); index !== -1; index = value.indexOf('%', index + 1)) {
    const a = value.charCodeAt(index + 1);
    const b = value.charCodeAt(index + 2);
    let decoded;
    if (a === 50 && b === 50) decoded = '"';
    else if (a === 48 && (b === 65 || b === 97)) decoded = '\n';
    else if (a === 48 && (b === 68 || b === 100)) decoded = '\r';
    else continue;
    result += value.slice(start, index) + decoded;
    start = index + 3;
    index += 2;
  }
  return start === 0 ? value : result + value.slice(start);
}

exports.create = create;
exports.parse = parse;
exports.format = format;
exports.encodeExtended = encodeExtended;
exports.decodeExtended = decodeExtended;
Object.freeze(exports);
