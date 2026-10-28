'use strict';

// Scanners return null on invalid input; validation does not construct errors or
// address instances. IPv4 retains inet_aton forms outside strict decimal mode.
function ipv4(input, strict = false) {
  if (typeof input !== 'string' || input.length === 0) return null;
  const values = [];
  let start = 0;
  while (start < input.length) {
    if (values.length === 4) return null;
    let end = input.indexOf('.', start);
    if (end === -1) end = input.length;
    if (end === start) return null;
    let index = start;
    let base = 10;
    if (input.charCodeAt(index) === 48 && end - start > 1) {
      if (strict) return null;
      const next = input.charCodeAt(index + 1) | 32;
      if (next === 120) { base = 16; index += 2; }
      else { base = 8; index++; }
    }
    if (index === end) return null;
    let value = 0;
    for (; index < end; index++) {
      const code = input.charCodeAt(index);
      let digit = code - 48;
      if (digit < 0 || digit > 9) {
        const lower = code | 32;
        digit = lower >= 97 && lower <= 102 ? lower - 87 : -1;
      }
      if (digit < 0 || digit >= base) return null;
      value = value * base + digit;
      if (value > 0xffffffff) return null;
    }
    values.push(value);
    if (end === input.length) break;
    start = end + 1;
    if (start === input.length) return null;
  }
  const count = values.length;
  if (strict && count !== 4) return null;
  for (let i = 0; i < count - 1; i++) if (values[i] > 255) return null;
  const tail = values[count - 1];
  if (tail >= 2 ** (8 * (5 - count))) return null;
  if (count === 4) return values;
  values.pop();
  for (let shift = 8 * (4 - count); shift >= 0; shift -= 8) values.push((tail >>> shift) & 255);
  return values;
}

function validZone(zone) {
  return typeof zone === 'string' && zone.length > 0 && !/[^A-Za-z0-9_.~-]/.test(zone);
}

function ipv6(input) {
  if (typeof input !== 'string' || input.length < 2) return null;
  let end = input.indexOf('%');
  let zoneId;
  if (end === -1) end = input.length;
  else {
    zoneId = input.slice(end + 1);
    if (!validZone(zoneId)) return null;
  }
  if (end < 2) return null;
  const parts = [];
  let compressed = -1;
  let index = 0;
  if (input.charCodeAt(0) === 58) {
    if (input.charCodeAt(1) !== 58) return null;
    compressed = 0;
    index = 2;
  }
  while (index < end) {
    if (parts.length === 8) return null;
    const start = index;
    let value = 0;
    let digits = 0;
    let dotted = false;
    while (index < end && input.charCodeAt(index) !== 58) {
      const code = input.charCodeAt(index);
      if (code === 46) {
        if (parts.length > 6) return null;
        const bytes = ipv4(input.slice(start, end), true);
        if (bytes === null) return null;
        parts.push((bytes[0] << 8) | bytes[1], (bytes[2] << 8) | bytes[3]);
        index = end;
        dotted = true;
        break;
      }
      const lower = code | 32;
      const digit = code >= 48 && code <= 57 ? code - 48 : lower >= 97 && lower <= 102 ? lower - 87 : -1;
      if (digit < 0 || digit > 15 || ++digits > 4) return null;
      value = (value << 4) | digit;
      index++;
    }
    // A dotted tail already appended its two groups.
    if (dotted) break;
    if (digits === 0) return null;
    parts.push(value);
    if (index === end) break;
    index++;
    if (index < end && input.charCodeAt(index) === 58) {
      if (compressed !== -1) return null;
      compressed = parts.length;
      index++;
    } else if (index === end) return null;
  }
  if (compressed === -1) {
    if (parts.length !== 8) return null;
  } else {
    const missing = 8 - parts.length;
    if (missing < 1) return null;
    const length = parts.length;
    parts.length = 8;
    for (let i = length - 1; i >= compressed; i--) parts[i + missing] = parts[i];
    for (let i = compressed; i < compressed + missing; i++) parts[i] = 0;
  }
  return { parts, zoneId };
}

function cidr(input, max) {
  if (typeof input !== 'string') return null;
  const slash = input.lastIndexOf('/');
  if (slash < 1 || slash === input.length - 1) return null;
  let prefix = 0;
  for (let i = slash + 1; i < input.length; i++) {
    const digit = input.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) return null;
    prefix = prefix * 10 + digit;
    if (prefix > max) return null;
  }
  return { address: input.slice(0, slash), prefix };
}

exports.ipv4 = ipv4;
exports.ipv6 = ipv6;
exports.validZone = validZone;
exports.cidr = cidr;
