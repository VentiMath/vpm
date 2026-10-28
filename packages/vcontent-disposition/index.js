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

// Standard disposition fields are already validated by these exact matches.
// Other types/names still use the complete token grammar and case folding.
function checkType(type) {
  if (type !== 'attachment' && type !== 'inline' && type !== 'form-data' &&
      (typeof type !== 'string' || !TOKEN.test(type))) throw new TypeError('invalid disposition type');
}
function checkName(name) {
  if (name === 'filename' || name === 'filename*' || name === 'name') return name;
  if (!TOKEN.test(name)) throw new TypeError('invalid parameter name');
  return name.toLowerCase();
}

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
  checkType(type);
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
  const start = skipOWS(header, 0, length);
  const separator = header.indexOf(';', start);
  const end = separator === -1 ? length : separator;
  const rawType = header.slice(start, trimOWS(header, start, end));
  const type = rawType === 'attachment' || rawType === 'inline' || rawType === 'form-data' ? rawType : rawType.toLowerCase();
  // The no-parameter case does not enter the larger parameter scanner.
  return { type, parameters: separator === -1 ? Object.create(null) : parseParameters(header, end, mode) };
}

function parseParameters(header, index, mode) {
  const length = header.length;
  const parameters = Object.create(null);
  let first = true;
  parameterLoop: while (index < length) {
    index = skipOWS(header, index + 1, length);
    const keyStart = index;
    while (index < length) {
      const code = header.charCodeAt(index);
      if (code === 59) continue parameterLoop;
      if (code !== 61) { index++; continue; }
      const key = parameterName(header, keyStart, trimOWS(header, keyStart, index));
      const keep = first || parameters[key] === undefined;
      first = false;
      index = skipOWS(header, index + 1, length);
      if (header.charCodeAt(index) === 34) {
        const start = ++index;
        // Decode short multipart fields while finding their closing quote.
        // Bound the remaining scan; long values keep the native span searches.
        if ((mode & 1) && keep && length - start < 32) {
          index = endValue(header, readMultipartQuoted(header, start, parameters, key), length);
          continue parameterLoop;
        }
        const firstQuote = header.indexOf('"', start);
        if (firstQuote === -1) break parameterLoop;
        let escaped = false;
        if ((mode & 1) || !header.slice(start, firstQuote).includes('\\')) index = firstQuote;
        else {
          escaped = true;
          while (index < length) {
            const code = header.charCodeAt(index);
            if (code === 34) break;
            index += code === 92 && index + 1 < length ? 2 : 1;
          }
        }
        if (index === length) break parameterLoop;
        if (keep) {
          parameters[key] = mode & 1 ? unescapeMultipart(header, start, index)
            : escaped ? unescapeQuoted(header, start, index) : header.slice(start, index);
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
  return parameters;
}

function parameterName(header, start, end) {
  // Recognize every ASCII casing without slicing/lowercasing a standard key.
  // Custom names retain the parser's full Unicode lowercasing and leniency.
  const length = end - start;
  if (length === 4 && (header.charCodeAt(start) | 32) === 110 && (header.charCodeAt(start + 1) | 32) === 97 &&
      (header.charCodeAt(start + 2) | 32) === 109 && (header.charCodeAt(start + 3) | 32) === 101) return 'name';
  if ((length === 8 || (length === 9 && header.charCodeAt(start + 8) === 42)) &&
      (header.charCodeAt(start) | 32) === 102 && (header.charCodeAt(start + 1) | 32) === 105 &&
      (header.charCodeAt(start + 2) | 32) === 108 && (header.charCodeAt(start + 3) | 32) === 101 &&
      (header.charCodeAt(start + 4) | 32) === 110 && (header.charCodeAt(start + 5) | 32) === 97 &&
      (header.charCodeAt(start + 6) | 32) === 109 && (header.charCodeAt(start + 7) | 32) === 101) {
    return length === 8 ? 'filename' : 'filename*';
  }
  return header.slice(start, end).toLowerCase();
}

function format(disposition, options) {
  object(disposition, 'disposition');
  const { type, parameters } = disposition;
  const mode = modes(options);
  checkType(type);
  if (parameters == null) return type;
  object(parameters, 'parameters');
  const keys = Object.keys(parameters);
  if (keys.length === 0) return type;
  const first = keys[0];
  const firstName = checkName(first);
  const firstValue = parameters[first];
  string(firstValue);
  if (keys.length === 1) return type + formatParameter(first, firstValue, mode);
  if (keys.length === 2) {
    const second = keys[1];
    const a = firstName;
    const b = checkName(second);
    if (a === b) throw new TypeError('duplicate parameter name');
    const secondValue = parameters[second];
    string(secondValue);
    return type + formatParameter(first, firstValue, mode, b)
      + formatParameter(second, secondValue, mode, a);
  }
  // Large parameter sets keep linear duplicate detection. Snapshot values once
  // before formatting so accessors cannot change a value between checks/output.
  const values = [firstValue];
  const names = new Set([firstName]);
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i];
    const normalized = checkName(key);
    if (names.has(normalized)) throw new TypeError('duplicate parameter name');
    names.add(normalized);
    const value = parameters[key];
    string(value);
    values.push(value);
  }
  let result = type;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result += formatParameter(key, values[i], mode, names);
  }
  return result;
}

function formatParameter(key, value, mode, peers) {
  if (mode & 1) return '; ' + key + '="' + escapeMultipart(value) + '"';
  if (TOKEN.test(value)) return '; ' + key + '=' + value;
  if (TEXT.test(value)) return '; ' + key + '=' + quote(value);
  if (mode & 2) throw new TypeError('invalid parameter value');
  if (key.endsWith('*')) throw new TypeError('extended parameter must already be encoded');
  if (peers && (typeof peers === 'string' ? peers === key.toLowerCase() + '*' : peers.has(key.toLowerCase() + '*'))) return '';
  return '; ' + key + '*=' + encodeUtf8(value);
}

function encodeExtended(value) {
  string(value);
  if (URI_SAFE.test(value)) return "UTF-8''" + value;
  return encodeUtf8(value);
}
function encodeUtf8(value) {
  const encoded = encodeURIComponent(value);
  return "UTF-8''" + (/['()*]/.test(encoded) ? encoded.replace(/['()*]/g, char => EXTRA_ESCAPES[char]) : encoded);
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
function quote(value) { return '"' + (/[\\"]/.test(value) ? value.replace(/[\\"]/g, '\\$&') : value) + '"'; }
function parameter(value) { return TOKEN.test(value) ? value : quote(value); }
function escapeMultipart(value) {
  let start = 0;
  let result = '';
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code === 10 || code === 13 || code === 34) {
      result += value.slice(start, index) + (code === 10 ? '%0A' : code === 13 ? '%0D' : '%22');
      start = index + 1;
    }
  }
  return start === 0 ? value : result + value.slice(start);
}
function unescapeMultipart(header, start, end) {
  const offset = start;
  const value = header.slice(start, end);
  let result = '';
  let index = value.indexOf('%');
  if (index === -1) return value;
  index += offset;
  while (index !== -1) {
    const runStart = index;
    let run = '';
    // Decode consecutive escapes directly from the original header. Searching
    // and copying after every escape is expensive for dense runs.
    do {
      const a = header.charCodeAt(index + 1);
      const b = header.charCodeAt(index + 2);
      if (a === 50 && b === 50) run += '"';
      else if (a === 48 && (b === 65 || b === 97)) run += '\n';
      else if (a === 48 && (b === 68 || b === 100)) run += '\r';
      else break;
      index += 3;
    } while (header.charCodeAt(index) === 37);
    if (index !== runStart) {
      result += header.slice(start, runStart) + run;
      start = index;
    }
    // Search only within this value, so later fields cannot cause rescans.
    index = value.indexOf('%', index + 1 - offset);
    if (index !== -1) index += offset;
  }
  return start === offset ? value : result + header.slice(start, end);
}

function readMultipartQuoted(header, index, parameters, key) {
  let value = '';
  const length = header.length;
  while (index < length) {
    const code = header.charCodeAt(index++);
    if (code === 34) {
      // An unterminated field must never be stored, even after valid escapes.
      parameters[key] = value;
      return index;
    }
    if (code === 37) {
      const a = header.charCodeAt(index);
      const b = header.charCodeAt(index + 1);
      if (a === 50 && b === 50) { value += '"'; index += 2; continue; }
      if (a === 48) {
        if (b === 65 || b === 97) { value += '\n'; index += 2; continue; }
        if (b === 68 || b === 100) { value += '\r'; index += 2; continue; }
      }
    }
    value += String.fromCharCode(code);
  }
  return length;
}

exports.create = create;
exports.parse = parse;
exports.format = format;
exports.encodeExtended = encodeExtended;
exports.decodeExtended = decodeExtended;
Object.freeze(exports);
