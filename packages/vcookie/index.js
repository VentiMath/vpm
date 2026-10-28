'use strict';

// Derived from jshttp/cookie (MIT); see LICENSE and PROVENANCE.json.
const invalidName = /[^\u0021-\u003A\u003C\u003E-\u007E]/;
const invalidValue = /[^\u0021-\u003A\u003C-\u007E]/;
const invalidLegacyName = /[^!#$%&'*+\-.^_`|~0-9A-Za-z]/;
const legacyValue = /^("?)[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*\1$(?![\s\S])/;
const domainPattern = /^(?:\.?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$(?![\s\S])/i;
const invalidPath = /[^\u0020-\u003A\u003D-\u007E]/;
const maxAgePattern = /^-?\d+$(?![\s\S])/;
const needsEncoding = /[^!#$&'()*+\-.\/0-9:<=>?@A-Z[\]\^_`a-z{|}~]/;
const dateTime = Date.prototype.getTime;
const dateString = Date.prototype.toUTCString;

exports.parse = parse;
exports.serialize = serialize;
exports.parseCookie = parseCookie;
exports.stringifyCookie = stringifyCookie;
exports.parseSetCookie = parseSetCookie;
exports.stringifySetCookie = stringifySetCookie;
Object.freeze(exports);

function object(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(label + ' must be an object');
}

function string(value, label) {
  if (typeof value !== 'string') throw new TypeError(label + ' must be a string');
}

function callback(options, key, fallback) {
  if (options == null) return fallback;
  object(options, 'options');
  const fn = options[key];
  if (fn === undefined) return fallback;
  if (typeof fn !== 'function') throw new TypeError(key + ' must be a function');
  return fn;
}

function decode(value) {
  if (!value.includes('%')) return value;
  try { return decodeURIComponent(value); } catch { return value; }
}

function defaultEncode(value) {
  return needsEncoding.test(value) ? encodeURIComponent(value) : value;
}

function decoded(value, dec, legacy) {
  let result;
  if (legacy) {
    try { result = dec(value); } catch { return value; }
  } else result = dec(value);
  if (result !== undefined) string(result, 'decoded value');
  return result;
}

// Only SP and HTAB are optional whitespace in these headers.
function slice(value, start, end) {
  while (start < end && (value.charCodeAt(start) === 32 || value.charCodeAt(start) === 9)) start++;
  while (end > start && (value.charCodeAt(end - 1) === 32 || value.charCodeAt(end - 1) === 9)) end--;
  return value.slice(start, end);
}

function parse(str, options) {
  return parsePairs(str, callback(options, 'decode', decode), true);
}

function parseCookie(str, options) {
  return parsePairs(str, callback(options, 'decode', decode), false);
}

function parsePairs(str, dec, legacy) {
  string(str, 'header');
  const result = Object.create(null);
  let index = 0;
  while (index < str.length) {
    const eq = str.indexOf('=', index);
    if (eq === -1) break;
    let end = str.indexOf(';', index);
    if (end === -1) end = str.length;
    if (eq > end) {
      index = str.lastIndexOf(';', eq - 1) + 1;
      continue;
    }
    const name = slice(str, index, eq);
    // Legacy keeps even a custom decoder's undefined first value; modern API
    // lets a subsequent cookie retry, matching the current upstream contract.
    if (legacy ? !Object.hasOwn(result, name) : result[name] === undefined) {
      let value = slice(str, eq + 1, end);
      if (legacy && value.charCodeAt(0) === 34 && value.charCodeAt(value.length - 1) === 34) value = value.slice(1, -1);
      result[name] = decoded(value, dec, legacy);
    }
    index = end + 1;
  }
  return result;
}

function pair(name, value, enc, legacy) {
  string(name, 'name');
  if (!name || (legacy ? invalidLegacyName : invalidName).test(name)) throw new TypeError('invalid cookie name');
  string(value, 'value');
  const encoded = enc(value);
  string(encoded, 'encoded value');
  if (legacy ? !legacyValue.test(encoded) : invalidValue.test(encoded)) throw new TypeError('invalid cookie value');
  return name + '=' + encoded;
}

function stringifyCookie(cookies, options) {
  object(cookies, 'cookies');
  const enc = callback(options, 'encode', defaultEncode);
  let result = '';
  for (const name of Object.keys(cookies)) {
    const value = cookies[name];
    if (value === undefined) continue;
    const entry = pair(name, value, enc, false);
    result += (result ? '; ' : '') + entry;
  }
  return result;
}

function serialize(name, value, options) {
  const result = pair(name, value, callback(options, 'encode', encodeURIComponent), true);
  return options == null ? result : attributes(result, options, true);
}

function stringifySetCookie(cookie, options) {
  object(cookie, 'cookie');
  const enc = callback(options, 'encode', defaultEncode);
  const name = cookie.name;
  const value = cookie.value;
  // An omitted value is an empty cookie; do not call a custom encoder for it.
  const result = pair(name, value == null ? '' : value, value == null ? identity : enc, false);
  return attributes(result, cookie, false);
}

function identity(value) { return value; }

function attributes(result, cookie, legacy) {
  // Capture every field once before validating and emitting it. A getter must
  // not substitute a different, unvalidated header value on the second read.
  const maxAge = cookie.maxAge;
  if (maxAge !== undefined && !(legacy && maxAge === null)) {
    const age = legacy && typeof maxAge === 'number' ? Math.floor(maxAge) : maxAge;
    if (!Number.isSafeInteger(age)) throw new TypeError('maxAge must be a safe integer');
    result += '; Max-Age=' + age;
  }
  const domain = cookie.domain;
  if (domain !== undefined) {
    string(domain, 'domain');
    if (domain) {
      if (!domainPattern.test(domain)) throw new TypeError('invalid domain');
      result += '; Domain=' + domain;
    }
  }
  const path = cookie.path;
  if (path !== undefined) {
    string(path, 'path');
    if (path) {
      if (invalidPath.test(path)) throw new TypeError('invalid path');
      result += '; Path=' + path;
    }
  }
  const expires = cookie.expires;
  if (expires !== undefined) {
    let time;
    try { time = dateTime.call(expires); } catch { throw new TypeError('expires must be a valid Date'); }
    if (!Number.isFinite(time)) throw new TypeError('expires must be a valid Date');
    result += '; Expires=' + dateString.call(expires);
  }
  const httpOnly = cookie.httpOnly;
  const secure = cookie.secure;
  const partitioned = cookie.partitioned;
  if (httpOnly !== undefined && typeof httpOnly !== 'boolean') throw new TypeError('httpOnly must be a boolean');
  if (secure !== undefined && typeof secure !== 'boolean') throw new TypeError('secure must be a boolean');
  if (partitioned !== undefined && typeof partitioned !== 'boolean') throw new TypeError('partitioned must be a boolean');
  if (httpOnly) result += '; HttpOnly';
  if (secure) result += '; Secure';
  if (partitioned) result += '; Partitioned';
  const priority = cookie.priority;
  if (priority !== undefined) {
    string(priority, 'priority');
    switch (priority.toLowerCase()) {
      case 'low': result += '; Priority=Low'; break;
      case 'medium': result += '; Priority=Medium'; break;
      case 'high': result += '; Priority=High'; break;
      default: throw new TypeError('invalid priority');
    }
  }
  const sameSite = cookie.sameSite;
  if (sameSite !== undefined && sameSite !== false) {
    switch (typeof sameSite === 'string' ? sameSite.toLowerCase() : sameSite) {
      case true: case 'strict': result += '; SameSite=Strict'; break;
      case 'lax': result += '; SameSite=Lax'; break;
      case 'none': result += '; SameSite=None'; break;
      default: throw new TypeError('invalid sameSite');
    }
  }
  return result;
}

function parseSetCookie(str, options) {
  string(str, 'header');
  const dec = callback(options, 'decode', decode);
  let end = str.indexOf(';');
  if (end === -1) end = str.length;
  let eq = str.indexOf('=');
  const result = eq !== -1 && eq < end
    ? { name: slice(str, 0, eq), value: decoded(slice(str, eq + 1, end), dec, false) }
    : { name: '', value: decoded(slice(str, 0, end), dec, false) };
  let index = end + 1;
  while (index < str.length) {
    end = str.indexOf(';', index);
    if (end === -1) end = str.length;
    if (eq < index && eq !== -1) eq = str.indexOf('=', index);
    const hasValue = eq !== -1 && eq < end;
    const attr = slice(str, index, hasValue ? eq : end).toLowerCase();
    const value = hasValue ? slice(str, eq + 1, end) : undefined;
    switch (attr) {
      case 'httponly': result.httpOnly = true; break;
      case 'secure': result.secure = true; break;
      case 'partitioned': result.partitioned = true; break;
      case 'domain': result.domain = value; break;
      case 'path': result.path = value; break;
      case 'max-age':
        if (value && maxAgePattern.test(value)) {
          const age = Number(value);
          if (Number.isSafeInteger(age)) result.maxAge = age;
        }
        break;
      case 'expires':
        if (value) {
          const date = new Date(value);
          if (Number.isFinite(date.getTime())) result.expires = date;
        }
        break;
      case 'priority':
        if (value) {
          const priority = value.toLowerCase();
          if (priority === 'low' || priority === 'medium' || priority === 'high') result.priority = priority;
        }
        break;
      case 'samesite':
        if (value) {
          const sameSite = value.toLowerCase();
          if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') result.sameSite = sameSite;
        }
        break;
    }
    index = end + 1;
  }
  return result;
}
