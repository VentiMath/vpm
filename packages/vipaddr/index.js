'use strict';

// Derived from ipaddr.js (MIT); see LICENSE and PROVENANCE.json.
const scan = require('./lib/parse');
const rangeData = require('./lib/ranges.json');
const internal = Symbol('validated address parts');

function inputError(input, family = 'IP') {
  if (typeof input !== 'string') throw new TypeError('vipaddr: address must be a string');
  throw new RangeError('vipaddr: invalid ' + family + ' address');
}

function prefixLength(bits, max) {
  if (!Number.isInteger(bits) || bits < 0 || bits > max) throw new RangeError('vipaddr: prefix must be an integer from 0 to ' + max);
}

function copyParts(input, count, max, length) {
  if (input === null || typeof input !== 'object') throw new TypeError('vipaddr: address parts must be an array-like object');
  if ((length === undefined ? input.length : length) !== count) throw new RangeError('vipaddr: expected ' + count + ' address parts');
  const parts = new Array(count);
  for (let i = 0; i < count; i++) {
    const value = input[i];
    if (!Number.isInteger(value) || value < 0 || value > max) throw new RangeError('vipaddr: address parts must be integers from 0 to ' + max);
    parts[i] = value;
  }
  return parts;
}

function copyIPv6Bytes(input) {
  const parts = new Array(8);
  for (let i = 0; i < 8; i++) {
    const high = input[2 * i];
    if (!Number.isInteger(high) || high < 0 || high > 255) throw new RangeError('vipaddr: bytes must be integers from 0 to 255');
    const low = input[2 * i + 1];
    if (!Number.isInteger(low) || low < 0 || low > 255) throw new RangeError('vipaddr: bytes must be integers from 0 to 255');
    parts[i] = (high << 8) | low;
  }
  return parts;
}

function matchParts(first, second, width, bits) {
  const whole = Math.floor(bits / width);
  for (let i = 0; i < whole; i++) if (first[i] !== second[i]) return false;
  const remaining = bits % width;
  return remaining === 0 || (first[whole] >>> (width - remaining)) === (second[whole] >>> (width - remaining));
}

function maskPrefix(parts, width) {
  const max = (1 << width) - 1;
  let prefix = 0;
  let ended = false;
  for (const part of parts) {
    if (ended) { if (part !== 0) return null; continue; }
    if (part === max) { prefix += width; continue; }
    const inverted = max ^ part;
    if ((inverted & (inverted + 1)) !== 0) return null;
    prefix += width - (32 - Math.clz32(inverted));
    ended = true;
  }
  return prefix;
}

function maskParts(bits, count, width) {
  prefixLength(bits, count * width);
  const max = (1 << width) - 1;
  const parts = new Array(count);
  for (let i = 0; i < count; i++) {
    parts[i] = bits >= width ? max : bits <= 0 ? 0 : (max << (width - bits)) & max;
    bits -= width;
  }
  return parts;
}

function boundary(parts, bits, width, last) {
  const mask = maskParts(bits, parts.length, width);
  const max = (1 << width) - 1;
  for (let i = 0; i < parts.length; i++) mask[i] = last ? parts[i] | (max ^ mask[i]) : parts[i] & mask[i];
  return mask;
}

function cidrString() { return this[0].toString() + '/' + this[1]; }
function tuple(address, prefix) {
  const value = [address, prefix];
  Object.defineProperty(value, 'toString', { value: cidrString });
  return value;
}

function parsedCIDR(input, family, strict = false) {
  const cidr = scan.cidr(input, family === 4 ? 32 : 128);
  if (cidr === null) return null;
  const value = family === 4 ? scan.ipv4(cidr.address, strict) : scan.ipv6(cidr.address);
  return value === null ? null : { value, prefix: cidr.prefix };
}

class IPv4 {
  #octets;
  constructor(octets, token) {
    this.#octets = token === internal ? octets : copyParts(octets, 4, 255);
  }
  get octets() { return this.#octets.slice(); }
  kind() { return 'ipv4'; }
  toString() { return this.#octets.join('.'); }
  toNormalizedString() { return this.toString(); }
  toByteArray() { return this.#octets.slice(); }
  toJSON() { return { octets: this.#octets.slice() }; }
  match(other, bits) {
    if (bits === undefined && Array.isArray(other) && other.length === 2) [other, bits] = other;
    prefixLength(bits, 32);
    if (!(other instanceof IPv4)) throw new TypeError('vipaddr: IPv4 match requires an IPv4 address');
    return matchParts(this.#octets, other.#octets, 8, bits);
  }
  prefixLengthFromSubnetMask() { return maskPrefix(this.#octets, 8); }
  toIPv4MappedAddress() {
    const p = this.#octets;
    return new IPv6([0, 0, 0, 0, 0, 0xffff, (p[0] << 8) | p[1], (p[2] << 8) | p[3]], undefined, internal);
  }
  range() { return classify(this.#octets, 8, v4Ranges); }
  subnetMatch(ranges, defaultName) { return subnetMatch(this, ranges, defaultName); }
  static parser(input) { return scan.ipv4(input); }
  static isIPv4(input) { return scan.ipv4(input) !== null; }
  static isValid(input) { return scan.ipv4(input) !== null; }
  static isValidFourPartDecimal(input) { return scan.ipv4(input, true) !== null; }
  static isValidCIDR(input) { return parsedCIDR(input, 4) !== null; }
  static isValidCIDRFourPartDecimal(input) { return parsedCIDR(input, 4, true) !== null; }
  static parse(input) {
    const parts = scan.ipv4(input);
    if (parts === null) return inputError(input, 'IPv4');
    return new IPv4(parts, internal);
  }
  static parseCIDR(input) {
    const cidr = parsedCIDR(input, 4);
    if (cidr === null) return inputError(input, 'IPv4 CIDR');
    return tuple(new IPv4(cidr.value, internal), cidr.prefix);
  }
  static subnetMaskFromPrefixLength(bits) { return new IPv4(maskParts(bits, 4, 8), internal); }
  static networkAddressFromCIDR(input) {
    const [address, bits] = IPv4.parseCIDR(input);
    return new IPv4(boundary(address.#octets, bits, 8, false), internal);
  }
  static broadcastAddressFromCIDR(input) {
    const [address, bits] = IPv4.parseCIDR(input);
    return new IPv4(boundary(address.#octets, bits, 8, true), internal);
  }
}

class IPv6 {
  #parts;
  #zoneId;
  constructor(parts, zoneId, token) {
    if (token === internal) this.#parts = parts;
    else {
      if (parts === null || typeof parts !== 'object') throw new TypeError('vipaddr: address parts must be an array-like object');
      const length = parts.length;
      if (length === 16) this.#parts = copyIPv6Bytes(parts);
      else if (length === 8) this.#parts = copyParts(parts, 8, 65535, length);
      else throw new RangeError('vipaddr: expected 8 parts or 16 bytes');
      if (zoneId !== undefined && !scan.validZone(zoneId)) throw new TypeError('vipaddr: invalid zone identifier');
    }
    this.#zoneId = zoneId;
  }
  get parts() { return this.#parts.slice(); }
  get zoneId() { return this.#zoneId; }
  kind() { return 'ipv6'; }
  toNormalizedString() { return this.#parts.map(part => part.toString(16)).join(':') + this.#suffix(); }
  toFixedLengthString() { return this.#parts.map(part => part.toString(16).padStart(4, '0')).join(':') + this.#suffix(); }
  #suffix() { return this.#zoneId === undefined ? '' : '%' + this.#zoneId; }
  toString() { return this.toRFC5952String(); }
  toRFC5952String() {
    const parts = this.#parts;
    let best = -1;
    let length = 1;
    for (let i = 0; i < 8;) {
      if (parts[i] !== 0) { i++; continue; }
      const start = i;
      while (i < 8 && parts[i] === 0) i++;
      if (i - start > length) { best = start; length = i - start; }
    }
    let text = '';
    for (let i = 0; i < 8; i++) {
      if (i === best) { text += '::'; i += length - 1; continue; }
      if (i > 0 && i !== best + length) text += ':';
      text += parts[i].toString(16);
    }
    return text + this.#suffix();
  }
  toByteArray() {
    const bytes = new Array(16);
    for (let i = 0; i < 8; i++) { bytes[2 * i] = this.#parts[i] >>> 8; bytes[2 * i + 1] = this.#parts[i] & 255; }
    return bytes;
  }
  toJSON() {
    return this.#zoneId === undefined ? { parts: this.parts } : { parts: this.parts, zoneId: this.#zoneId };
  }
  match(other, bits) {
    if (bits === undefined && Array.isArray(other) && other.length === 2) [other, bits] = other;
    prefixLength(bits, 128);
    if (!(other instanceof IPv6)) throw new TypeError('vipaddr: IPv6 match requires an IPv6 address');
    return matchParts(this.#parts, other.#parts, 16, bits);
  }
  prefixLengthFromSubnetMask() { return maskPrefix(this.#parts, 16); }
  isIPv4MappedAddress() {
    const p = this.#parts;
    return p[0] === 0 && p[1] === 0 && p[2] === 0 && p[3] === 0 && p[4] === 0 && p[5] === 0xffff;
  }
  toIPv4Address() {
    if (!this.isIPv4MappedAddress()) throw new RangeError('vipaddr: address is not IPv4-mapped');
    const high = this.#parts[6], low = this.#parts[7];
    return new IPv4([high >>> 8, high & 255, low >>> 8, low & 255], internal);
  }
  range() { return classify(this.#parts, 16, v6Ranges); }
  subnetMatch(ranges, defaultName) { return subnetMatch(this, ranges, defaultName); }
  static parser(input) { return scan.ipv6(input); }
  static isIPv6(input) { return scan.ipv6(input) !== null; }
  static isValid(input) { return scan.ipv6(input) !== null; }
  static isValidCIDR(input) { return parsedCIDR(input, 6) !== null; }
  static parse(input) {
    const value = scan.ipv6(input);
    if (value === null) return inputError(input, 'IPv6');
    return new IPv6(value.parts, value.zoneId, internal);
  }
  static parseCIDR(input) {
    const cidr = parsedCIDR(input, 6);
    if (cidr === null) return inputError(input, 'IPv6 CIDR');
    return tuple(new IPv6(cidr.value.parts, cidr.value.zoneId, internal), cidr.prefix);
  }
  static subnetMaskFromPrefixLength(bits) { return new IPv6(maskParts(bits, 8, 16), undefined, internal); }
  static networkAddressFromCIDR(input) {
    const [address, bits] = IPv6.parseCIDR(input);
    return new IPv6(boundary(address.#parts, bits, 16, false), undefined, internal);
  }
  static broadcastAddressFromCIDR(input) {
    const [address, bits] = IPv6.parseCIDR(input);
    return new IPv6(boundary(address.#parts, bits, 16, true), undefined, internal);
  }
}

function isValid(input) {
  if (typeof input !== 'string') return false;
  return input.includes(':') ? scan.ipv6(input) !== null : scan.ipv4(input) !== null;
}
function parse(input) {
  if (typeof input !== 'string') return inputError(input);
  return input.includes(':') ? IPv6.parse(input) : IPv4.parse(input);
}
function isValidCIDR(input) {
  if (typeof input !== 'string') return false;
  return parsedCIDR(input, input.includes(':') ? 6 : 4) !== null;
}
function parseCIDR(input) {
  if (typeof input !== 'string') return inputError(input);
  return input.includes(':') ? IPv6.parseCIDR(input) : IPv4.parseCIDR(input);
}
function processAddress(input) {
  const address = parse(input);
  return address instanceof IPv6 && address.isIPv4MappedAddress() ? address.toIPv4Address() : address;
}
function fromByteArray(input) {
  if (input === null || typeof input !== 'object') throw new TypeError('vipaddr: bytes must be an array-like object');
  const length = input.length;
  if (length === 4) return new IPv4(copyParts(input, 4, 255, length), internal);
  if (length === 16) return new IPv6(copyIPv6Bytes(input), undefined, internal);
  throw new RangeError('vipaddr: expected 4 or 16 bytes');
}
function subnetMatch(address, rangeList, defaultName = 'unicast') {
  if (!(address instanceof IPv4) && !(address instanceof IPv6)) throw new TypeError('vipaddr: expected an IP address');
  if (rangeList === null || typeof rangeList !== 'object') throw new TypeError('vipaddr: ranges must be an object');
  if (defaultName === null) defaultName = 'unicast';
  for (const name of Object.keys(rangeList)) {
    const value = rangeList[name];
    if (!Array.isArray(value)) throw new TypeError('vipaddr: expected a CIDR tuple or array of tuples');
    const ranges = value[0] instanceof IPv4 || value[0] instanceof IPv6 ? [value] : value;
    for (const range of ranges) {
      if (!Array.isArray(range) || range.length !== 2) throw new TypeError('vipaddr: expected a CIDR tuple');
      const [subnet, bits] = range;
      if (!(subnet instanceof IPv4) && !(subnet instanceof IPv6)) throw new TypeError('vipaddr: expected an IP subnet');
      prefixLength(bits, subnet instanceof IPv4 ? 32 : 128);
      if ((address instanceof IPv4) === (subnet instanceof IPv4) && address.match(subnet, bits)) return name;
    }
  }
  return defaultName;
}

function buildRanges(Class, values) {
  const table = Object.create(null);
  const compiled = [];
  for (const [name, value] of Object.entries(values)) {
    const single = typeof value[1] === 'number';
    const entries = (single ? [value] : value).map(([parts, bits]) => {
      const address = Object.freeze(new Class(parts));
      compiled.push([name, parts.slice(), bits]);
      return Object.freeze([address, bits]);
    });
    table[name] = single ? entries[0] : Object.freeze(entries);
  }
  Object.defineProperty(Class.prototype, 'SpecialRanges', { enumerable: true, value: Object.freeze(table) });
  return compiled;
}
function classify(parts, width, ranges) {
  for (const [name, subnet, bits] of ranges) if (matchParts(parts, subnet, width, bits)) return name;
  return 'unicast';
}
const v4Ranges = buildRanges(IPv4, rangeData.IPv4);
const v6Ranges = buildRanges(IPv6, rangeData.IPv6);

exports.IPv4 = IPv4;
exports.IPv6 = IPv6;
exports.parse = parse;
exports.parseCIDR = parseCIDR;
exports.isValid = isValid;
exports.isValidCIDR = isValidCIDR;
exports.fromByteArray = fromByteArray;
exports.process = processAddress;
exports.subnetMatch = subnetMatch;
Object.freeze(module.exports);
