'use strict';

// Derived from vary (MIT); see LICENSE and PROVENANCE.json.
const invalidToken = /[^!#$%&'*+\-.^_`|~0-9A-Za-z]/;
// Characters Node's setHeader rejects. No real response header contains them,
// and append must not reflect a CR/LF from its header argument.
const invalidHeaderValue = /[^\t\x20-\x7e\x80-\xff]/;
module.exports = vary;
module.exports.append = append;
Object.freeze(vary);

function token(value) {
  return value.length !== 0 && !invalidToken.test(value);
}

// Field arguments must be valid names. An existing header is only read for
// names already present: as in vary, another component's malformed or
// nonstring value must not make every later vary() call throw.
function names(value, strict) {
  const result = [];
  let start = 0;
  while (start < value.length) {
    let end = value.indexOf(',', start);
    if (end === -1) end = value.length;
    const next = end + 1;
    while (start < end && (value.charCodeAt(start) === 32 || value.charCodeAt(start) === 9)) start++;
    while (end > start && (value.charCodeAt(end - 1) === 32 || value.charCodeAt(end - 1) === 9)) end--;
    if (start < end) {
      const name = value.slice(start, end);
      if (strict && !token(name)) throw new TypeError('invalid Vary field name');
      result.push(name);
    }
    start = next;
  }
  return result;
}

function append(header, field) {
  if (typeof header !== 'string') throw new TypeError('header must be a string');
  if (invalidHeaderValue.test(header)) throw new TypeError('header contains an invalid character');
  const single = typeof field === 'string' && token(field);
  // Common single-name calls need neither token arrays nor a membership set.
  if (single) {
    if (header === '') return field;
    if (token(header)) {
      if (field === '*' || header === '*') return '*';
      return header.toLowerCase() === field.toLowerCase() ? header : header + ', ' + field;
    }
  }
  let fields;
  if (single) fields = [field];
  else if (typeof field === 'string') {
    fields = names(field, true);
    if (!fields.length) throw new TypeError('field must contain a header name');
  } else if (Array.isArray(field)) {
    fields = [];
    const length = field.length;
    for (let i = 0; i < length; i++) {
      const name = field[i];
      if (typeof name !== 'string' || !token(name)) throw new TypeError('invalid Vary field name');
      fields.push(name);
    }
  } else throw new TypeError('field must be a string or an array of strings');

  const existing = names(header, false);
  if (existing.includes('*') || fields.includes('*')) return '*';
  const lowerNames = existing.map(name => name.toLowerCase());
  // A small array avoids Set allocation for ordinary response headers. Large
  // merges switch to a Set so duplicate checks do not grow quadratically.
  const seen = existing.length + fields.length > 16 ? new Set(lowerNames) : null;
  let result = existing.length ? header : '';
  for (const name of fields) {
    const lower = name.toLowerCase();
    if (seen ? seen.has(lower) : lowerNames.includes(lower)) continue;
    if (seen) seen.add(lower); else lowerNames.push(lower);
    result += (result ? ', ' : '') + name;
  }
  return result;
}

function vary(response, field) {
  if (response == null) throw new TypeError('response is required');
  const getHeader = response.getHeader;
  const setHeader = response.setHeader;
  if (typeof getHeader !== 'function' || typeof setHeader !== 'function') throw new TypeError('response must provide getHeader and setHeader');
  const value = getHeader.call(response, 'Vary');
  // The same conversion vary applies to whatever another component stored.
  const header = !value ? '' : Array.isArray(value) ? value.join(', ') : String(value);
  const result = append(header, field);
  if (result && result !== header) setHeader.call(response, 'Vary', result);
}
