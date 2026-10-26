'use strict';
/*!
 * vcontent-type
 * Derived from content-type, Copyright(c) 2015 Douglas Christopher Wilson.
 * Copyright(c) 2026 VentiMath contributors. MIT Licensed.
 */

const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const TYPE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function format(object) {
  if (object === null || typeof object !== 'object' || Array.isArray(object)) {
    throw new TypeError('content type must be an object');
  }
  const { type, parameters } = object;
  if (typeof type !== 'string' || !TYPE.test(type)) throw new TypeError('invalid media type');
  let result = type;
  if (parameters == null) return result;
  if (typeof parameters !== 'object' || Array.isArray(parameters)) throw new TypeError('parameters must be an object');
  for (const name of Object.keys(parameters)) {
    if (!TOKEN.test(name)) throw new TypeError('invalid parameter name');
    const value = parameters[name];
    if (typeof value !== 'string') throw new TypeError('parameter values must be strings');
    if (TOKEN.test(value)) result += '; ' + name + '=' + value;
    else result += '; ' + name + '=' + quote(value);
  }
  return result;
}

function parse(header, options) {
  if (typeof header !== 'string') throw new TypeError('header must be a string');
  let start = 0;
  let stop = -1;
  let includeParameters = true;
  if (options != null) {
    if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
    const { start: offset, comma, parameters } = options;
    if (offset !== undefined) {
      if (!Number.isInteger(offset) || offset < 0 || offset > header.length) {
        throw new TypeError('start must be an integer within the header');
      }
      start = offset;
    }
    if (comma !== undefined && typeof comma !== 'boolean') throw new TypeError('comma must be a boolean');
    if (parameters !== undefined && typeof parameters !== 'boolean') throw new TypeError('parameters must be a boolean');
    if (comma === true) stop = 44;
    includeParameters = parameters !== false;
  }
  const length = header.length;
  start = skipOWS(header, start, length);
  let index = skipValue(header, start, length, stop);
  const type = header.slice(start, trimOWS(header, start, index)).toLowerCase();
  // Each result has no prototype at all. There is no shared, mutable ancestor
  // whose properties can suppress parameters in a later parse.
  const parameters = Object.create(null);
  if (!includeParameters) return { type, index, parameters };

  parameter: while (index < length && header.charCodeAt(index) !== stop) {
    index = skipOWS(header, index + 1, length); // Skip the semicolon.
    const keyStart = index;
    while (index < length) {
      const code = header.charCodeAt(index);
      if (code === stop) break parameter;
      if (code === 59) continue parameter;
      if (code !== 61) { index++; continue; }

      const key = header.slice(keyStart, trimOWS(header, keyStart, index)).toLowerCase();
      const keep = parameters[key] === undefined; // The first occurrence wins.
      index = skipOWS(header, index + 1, length);
      if (header.charCodeAt(index) === 34) {
        const quotedStart = ++index;
        let escaped = false;
        // Locate a complete quoted value before allocating it. Duplicate and
        // unterminated values do not build strings character by character.
        const firstQuote = header.indexOf('"', index);
        if (firstQuote === -1) { index = length; break parameter; }
        // Bound the escape search to this quote, so many parameters cannot
        // repeatedly scan the remaining header. Ordinary quoted values use
        // native string searches; escaped quotes take the general path.
        if (!header.slice(index, firstQuote).includes('\\')) index = firstQuote;
        else {
          escaped = true;
          while (index < length && header.charCodeAt(index) !== 34) {
            if (header.charCodeAt(index) === 92 && index + 1 < length) index += 2;
            else index++;
          }
        }
        if (index === length) break parameter;
        if (keep) parameters[key] = escaped
          ? unescape(header, quotedStart, index)
          : header.slice(quotedStart, index);
        index = skipValue(header, index + 1, length, stop);
      } else {
        const valueStart = index;
        index = skipValue(header, index, length, stop);
        if (keep) parameters[key] = header.slice(valueStart, trimOWS(header, valueStart, index));
      }
      continue parameter;
    }
  }
  return { type, index, parameters };
}

function skipValue(header, index, length, stop) {
  if (stop === -1) {
    const end = header.indexOf(';', index);
    return end === -1 ? length : end;
  }
  while (index < length) {
    const code = header.charCodeAt(index);
    if (code === 59 || code === stop) break;
    index++;
  }
  return index;
}

function skipOWS(header, index, length) {
  while (index < length) {
    const code = header.charCodeAt(index);
    if (code !== 32 && code !== 9) break;
    index++;
  }
  return index;
}

function trimOWS(header, start, end) {
  while (end > start) {
    const code = header.charCodeAt(end - 1);
    if (code !== 32 && code !== 9) break;
    end--;
  }
  return end;
}

function unescape(header, start, end) {
  let result = '';
  for (let index = start; index < end; index++) {
    if (header.charCodeAt(index) === 92) {
      result += header.slice(start, index);
      start = ++index;
    }
  }
  return result + header.slice(start, end);
}

function quote(value) {
  let result = '"';
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code !== 9 && (code < 32 || code === 127 || code > 255)) throw new TypeError('invalid parameter value');
    if (code === 34 || code === 92) {
      result += value.slice(start, index) + '\\';
      start = index;
    }
  }
  return result + value.slice(start) + '"';
}

exports.parse = parse;
exports.format = format;
Object.freeze(exports);
