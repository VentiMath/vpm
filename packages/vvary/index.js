'use strict';

// Derived from vary (MIT); see LICENSE and PROVENANCE.json.
const invalidToken = /[^!#$%&'*+\-.^_`|~0-9A-Za-z]/;
module.exports = vary;
module.exports.append = append;
Object.freeze(vary);

function token(value) {
  return value.length !== 0 && !invalidToken.test(value);
}

function names(value) {
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
      if (!token(name)) throw new TypeError('invalid Vary field name');
      result.push(name);
    }
    start = next;
  }
  return result;
}

function append(header, field) {
  if (typeof header !== 'string') throw new TypeError('header must be a string');
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
    fields = names(field);
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

  // Validate the entire old and new list, even if either includes '*'.
  const existing = names(header);
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
  let header;
  if (value === undefined) header = '';
  else if (typeof value === 'string') header = value;
  else if (Array.isArray(value)) {
    const fields = [];
    const length = value.length;
    for (let i = 0; i < length; i++) {
      const entry = value[i];
      if (typeof entry !== 'string') throw new TypeError('Vary header entries must be strings');
      fields.push(entry);
    }
    header = fields.join(', ');
  } else throw new TypeError('Vary header must be a string or an array of strings');
  const result = append(header, field);
  if (result && result !== header) setHeader.call(response, 'Vary', result);
}
